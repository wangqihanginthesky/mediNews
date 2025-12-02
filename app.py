"""
医薬品パイプライン検索システム - FastAPI Backend
Data source: Firebase Firestore
"""
from fastapi import FastAPI, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List, Dict
import uvicorn
import os
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore

# Load environment variables
load_dotenv()

print("Starting application...", flush=True)

app = FastAPI(title="医薬品パイプライン検索", description="P3臨床試験データベース")

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://127.0.0.1:3001", "http://localhost:3003"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Firebase初期化
def init_firebase():
    """Firebase Admin SDKを初期化"""
    try:
        # 環境変数から認証情報を取得
        private_key = os.getenv("FIREBASE_PRIVATE_KEY", "").replace("\\n", "\n")

        cred_dict = {
            "type": "service_account",
            "project_id": os.getenv("FIREBASE_PROJECT_ID"),
            "private_key": private_key,
            "client_email": os.getenv("FIREBASE_EMAIL"),
            "token_uri": "https://oauth2.googleapis.com/token",
        }

        cred = credentials.Certificate(cred_dict)
        firebase_admin.initialize_app(cred)
        return firestore.client()
    except Exception as e:
        print(f"Firebase initialization error: {e}")
        return None

# Firestore client
print("Initializing Firebase...", flush=True)
db = init_firebase()
print(f"Firebase initialized: {db is not None}", flush=True)

# データキャッシュ
MEDICAL_DATA: List[Dict] = []


def fetch_medical_data() -> List[Dict]:
    """Firestoreからmedical_dataを取得"""
    if not db:
        print("Firestore not initialized", flush=True)
        return []

    try:
        print("Querying Firestore collection...", flush=True)
        docs = db.collection("medical_data").stream()
        data = []
        count = 0
        for doc in docs:
            count += 1
            if count % 100 == 0:
                print(f"Processing doc {count}...", flush=True)
            doc_dict = doc.to_dict()
            if doc_dict.get("delete_flag"):
                continue
            # リスト型のフィールドを文字列に変換
            def to_string(val):
                if isinstance(val, list):
                    return val[0] if val else ""
                return val or ""

            company = doc_dict.get("normalized_company_name") or doc_dict.get("companies", "")

            data.append({
                "id": doc.id,
                "event_type": to_string(doc_dict.get("event_type", "")),
                "disease_area": to_string(doc_dict.get("disease_area", "")),
                "company": to_string(company),
                "drug_name": to_string(doc_dict.get("normalized_drug_name") or doc_dict.get("drug_name", "")),
                "common_name": to_string(doc_dict.get("common_name", "")),
                "indication": to_string(doc_dict.get("indication", "")),
                "title": to_string(doc_dict.get("title", "")),
                "content": to_string(doc_dict.get("content", "")),
                "source": to_string(doc_dict.get("source", "")),
                "url": to_string(doc_dict.get("url", "")),
                "datetime": to_string(doc_dict.get("datetime", "")),
                "apply_category": to_string(doc_dict.get("apply_category", "")),
                "approval_category": to_string(doc_dict.get("approval_category", "")),
                "code": to_string(doc_dict.get("code", "")),
                "target": to_string(doc_dict.get("target", "")),
                "drug_function": to_string(doc_dict.get("drug_function", "")),
            })

        # Sort by datetime descending
        data.sort(key=lambda x: x.get("datetime", ""), reverse=True)
        print(f"Fetched {len(data)} records from Firestore", flush=True)
        return data
    except Exception as e:
        print(f"Error fetching medical_data: {e}", flush=True)
        return []


def refresh_data():
    """データをリフレッシュ"""
    global MEDICAL_DATA
    MEDICAL_DATA = fetch_medical_data()
    print(f"Loaded {len(MEDICAL_DATA)} medical records")


# 起動時にデータを読み込む（バックグラウンドで）
import threading

def load_data_background():
    """バックグラウンドでデータを読み込む"""
    print("Starting background data load...", flush=True)
    refresh_data()
    print(f"Background load complete: {len(MEDICAL_DATA)} records", flush=True)

# バックグラウンドスレッドでデータをロード
print("Starting data load thread...", flush=True)
data_thread = threading.Thread(target=load_data_background, daemon=True)
data_thread.start()


def get_unique_values(data: List[Dict], field: str) -> list:
    """指定フィールドの全ユニーク値を取得"""
    values = set()
    for item in data:
        if item.get(field):
            values.add(item[field])
    return sorted(list(values))


# 静的ファイルサービス (React build)
build_path = os.path.join(os.path.dirname(__file__), "frontend", "build")
if os.path.exists(build_path):
    app.mount("/static", StaticFiles(directory=os.path.join(build_path, "static")), name="static")


@app.get("/", response_class=HTMLResponse)
async def home():
    """Reactアプリを返す"""
    index_path = os.path.join(build_path, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return HTMLResponse(content="""
    <html>
        <head><title>医薬品パイプライン検索</title></head>
        <body>
            <h1>React app not built yet</h1>
            <p>Run: cd frontend && npm install && npm run build</p>
            <p>Or for development: cd frontend && npm start</p>
        </body>
    </html>
    """)


@app.get("/api/search")
async def search(
    q: Optional[str] = Query(None, description="検索キーワード"),
    event_type: Optional[str] = Query(None, description="イベントタイプフィルタ"),
    disease_area: Optional[str] = Query(None, description="疾患領域フィルタ"),
    company: Optional[str] = Query(None, description="企業名フィルタ"),
):
    """検索API"""
    results = MEDICAL_DATA.copy()

    # キーワード検索
    if q:
        q_lower = q.lower()
        results = [
            item for item in results
            if q_lower in item.get("drug_name", "").lower()
            or q_lower in item.get("common_name", "").lower()
            or q_lower in item.get("indication", "").lower()
            or q_lower in item.get("company", "").lower()
            or q_lower in item.get("disease_area", "").lower()
            or q_lower in item.get("title", "").lower()
            or q_lower in item.get("content", "").lower()
        ]

    # フィルタ適用
    if event_type:
        results = [item for item in results if item.get("event_type") == event_type]
    if disease_area:
        results = [item for item in results if item.get("disease_area") == disease_area]
    if company:
        results = [item for item in results if item.get("company") == company]

    return {
        "total": len(results),
        "results": results
    }


@app.get("/api/filters")
async def get_filters():
    """全フィルタオプションを取得"""
    return {
        "event_types": get_unique_values(MEDICAL_DATA, "event_type"),
        "disease_areas": get_unique_values(MEDICAL_DATA, "disease_area"),
        "companies": get_unique_values(MEDICAL_DATA, "company"),
    }


@app.get("/api/stats")
async def get_stats():
    """統計データを取得"""
    # イベントタイプ別統計
    event_stats = {}
    for item in MEDICAL_DATA:
        et = item.get("event_type", "不明")
        if isinstance(et, list):
            et = et[0] if et else "不明"
        event_stats[et] = event_stats.get(et, 0) + 1

    # 疾患領域別統計
    disease_stats = {}
    for item in MEDICAL_DATA:
        da = item.get("disease_area") or "その他"
        if isinstance(da, list):
            da = da[0] if da else "その他"
        disease_stats[da] = disease_stats.get(da, 0) + 1

    # 企業別統計
    company_stats = {}
    for item in MEDICAL_DATA:
        c = item.get("company", "不明")
        if isinstance(c, list):
            c = c[0] if c else "不明"
        company_stats[c] = company_stats.get(c, 0) + 1

    # Top 10を取得
    top_companies = sorted(company_stats.items(), key=lambda x: x[1], reverse=True)[:10]
    top_diseases = sorted(disease_stats.items(), key=lambda x: x[1], reverse=True)[:10]

    return {
        "total": len(MEDICAL_DATA),
        "by_event_type": event_stats,
        "top_companies": dict(top_companies),
        "top_disease_areas": dict(top_diseases),
    }


@app.get("/api/data")
async def get_all_data():
    """全データを取得（フロントエンド用）"""
    return {
        "total": len(MEDICAL_DATA),
        "data": MEDICAL_DATA
    }


@app.post("/api/refresh")
async def refresh():
    """データをリフレッシュ"""
    refresh_data()
    return {
        "status": "success",
        "count": len(MEDICAL_DATA)
    }


if __name__ == "__main__":
    print("Starting uvicorn server on port 8001...", flush=True)
    uvicorn.run(app, host="0.0.0.0", port=8001)
