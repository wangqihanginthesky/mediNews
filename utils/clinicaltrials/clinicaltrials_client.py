"""
ClinicalTrials.gov API v2 Client
全世界の臨床試験データを取得する

API: https://clinicaltrials.gov/api/v2/studies （key 不要・無料）
- query.term / query.intr / query.spons で検索
- filter.advanced=AREA[LastUpdatePostDate]RANGE[YYYY-MM-DD,MAX] で差分取得
- nextPageToken でページング
"""

import requests
import time
from typing import Optional, Dict, List, Iterator, Any
from dataclasses import dataclass, field


# 取得するフィールド（レスポンスを絞ってサイズ削減）
DEFAULT_FIELDS = [
    "NCTId",
    "BriefTitle",
    "BriefSummary",
    "OverallStatus",
    "Phase",
    "StudyType",
    "Condition",
    "InterventionName",
    "InterventionType",
    "LeadSponsorName",
    "LocationCountry",
    "StartDate",
    "LastUpdatePostDate",
    "OrgStudyId",
    "SecondaryId",
]

# 治験ステータスの日本語ラベル（OpenFDA の _get_marketing_status_ja と同じ発想）
STATUS_JA = {
    "RECRUITING": "募集中",
    "NOT_YET_RECRUITING": "募集前",
    "ACTIVE_NOT_RECRUITING": "実施中（募集終了）",
    "ENROLLING_BY_INVITATION": "招待制募集",
    "COMPLETED": "完了",
    "TERMINATED": "中止",
    "WITHDRAWN": "撤回",
    "SUSPENDED": "中断",
    "UNKNOWN": "不明",
    "NO_LONGER_AVAILABLE": "提供終了",
    "AVAILABLE": "提供中",
    "TEMPORARILY_NOT_AVAILABLE": "一時提供停止",
    "APPROVED_FOR_MARKETING": "販売承認済み",
}

# 治験フェーズの日本語ラベル
PHASE_JA = {
    "EARLY_PHASE1": "早期第I相",
    "PHASE1": "第I相",
    "PHASE2": "第II相",
    "PHASE3": "第III相",
    "PHASE4": "第IV相",
    "NA": "該当なし",
}


@dataclass
class TrialInfo:
    """1 件の治験情報（parse 済み）"""
    nct_id: str
    title: str
    brief_summary: str
    overall_status: str
    phases: List[str] = field(default_factory=list)
    study_type: str = ""
    conditions: List[str] = field(default_factory=list)
    interventions: List[Dict[str, str]] = field(default_factory=list)  # [{name, type}]
    lead_sponsor: str = ""
    countries: List[str] = field(default_factory=list)
    start_date: str = ""
    last_update_date: str = ""
    org_study_id: str = ""
    secondary_ids: List[str] = field(default_factory=list)


class ClinicalTrialsClient:
    """ClinicalTrials.gov API v2 クライアント"""

    BASE_URL = "https://clinicaltrials.gov/api/v2"
    STUDIES_ENDPOINT = "/studies"

    def __init__(self, min_request_interval: float = 0.3):
        """
        Args:
            min_request_interval: リクエスト間隔（秒）。本 API は key 不要だが礼儀的にレート制限する。
        """
        self.session = requests.Session()
        self.last_request_time = 0.0
        self.min_request_interval = min_request_interval

    def _rate_limit(self):
        """レート制限"""
        elapsed = time.time() - self.last_request_time
        if elapsed < self.min_request_interval:
            time.sleep(self.min_request_interval - elapsed)
        self.last_request_time = time.time()

    def _make_request(self, params: Dict[str, Any]) -> Optional[Dict]:
        """API リクエストを送信"""
        self._rate_limit()
        url = f"{self.BASE_URL}{self.STUDIES_ENDPOINT}"
        try:
            response = self.session.get(url, params=params, timeout=30)
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 404:
                return None
            else:
                print(f"ClinicalTrials API error: {response.status_code} - {response.text[:300]}")
                return None
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            return None

    def search(
        self,
        term: Optional[str] = None,
        intr: Optional[str] = None,
        spons: Optional[str] = None,
        updated_after: Optional[str] = None,
        page_token: Optional[str] = None,
        page_size: int = 100,
        count_total: bool = True,
        fields: Optional[List[str]] = None,
    ) -> Optional[Dict]:
        """
        治験を検索（1 ページ分の生 JSON を返す）

        Args:
            term:   query.term（フリーワード。開発コードの検索に有効）
            intr:   query.intr（介入・薬剤名）
            spons:  query.spons（スポンサー名）
            updated_after: YYYY-MM-DD。この日以降に更新された試験のみ（差分取得）
            page_token: nextPageToken（ページング）
            page_size: 1 ページの件数（最大 1000）
            count_total: totalCount を含めるか
            fields: 取得フィールド（省略時 DEFAULT_FIELDS）
        """
        params: Dict[str, Any] = {
            "pageSize": page_size,
            "fields": ",".join(fields or DEFAULT_FIELDS),
        }
        if term:
            params["query.term"] = term
        if intr:
            params["query.intr"] = intr
        if spons:
            params["query.spons"] = spons
        if updated_after:
            params["filter.advanced"] = f"AREA[LastUpdatePostDate]RANGE[{updated_after},MAX]"
        if page_token:
            params["pageToken"] = page_token
        if count_total:
            params["countTotal"] = "true"
        return self._make_request(params)

    def iter_studies(
        self,
        term: Optional[str] = None,
        intr: Optional[str] = None,
        spons: Optional[str] = None,
        updated_after: Optional[str] = None,
        page_size: int = 100,
        max_pages: Optional[int] = None,
    ) -> Iterator[Dict]:
        """
        条件に一致する全試験を nextPageToken で辿って yield する（生 study dict）

        Args:
            max_pages: 取得ページ数の上限（None なら全件）。暴走防止用。
        """
        page_token = None
        pages = 0
        while True:
            data = self.search(
                term=term,
                intr=intr,
                spons=spons,
                updated_after=updated_after,
                page_token=page_token,
                page_size=page_size,
                count_total=(pages == 0),
            )
            if not data:
                return
            for study in data.get("studies", []):
                yield study
            page_token = data.get("nextPageToken")
            pages += 1
            if not page_token:
                return
            if max_pages is not None and pages >= max_pages:
                return

    @staticmethod
    def parse_study(study: Dict) -> Optional[TrialInfo]:
        """生の study dict を TrialInfo に変換"""
        try:
            proto = study.get("protocolSection", {})
            ident = proto.get("identificationModule", {})
            status = proto.get("statusModule", {})
            sponsor = proto.get("sponsorCollaboratorsModule", {})
            cond = proto.get("conditionsModule", {})
            design = proto.get("designModule", {})
            arms = proto.get("armsInterventionsModule", {})
            locs = proto.get("contactsLocationsModule", {})

            nct_id = ident.get("nctId", "")
            if not nct_id:
                return None

            interventions = [
                {"name": iv.get("name", ""), "type": iv.get("type", "")}
                for iv in arms.get("interventions", [])
                if iv.get("name")
            ]

            # 国名を重複排除（順序保持）
            countries: List[str] = []
            for loc in locs.get("locations", []):
                c = loc.get("country")
                if c and c not in countries:
                    countries.append(c)

            secondary_ids = [
                s.get("id", "") for s in ident.get("secondaryIdInfos", []) if s.get("id")
            ]

            return TrialInfo(
                nct_id=nct_id,
                title=ident.get("briefTitle", ""),
                brief_summary=(proto.get("descriptionModule", {}) or {}).get("briefSummary", ""),
                overall_status=status.get("overallStatus", ""),
                phases=design.get("phases", []) or [],
                study_type=design.get("studyType", ""),
                conditions=cond.get("conditions", []) or [],
                interventions=interventions,
                lead_sponsor=(sponsor.get("leadSponsor", {}) or {}).get("name", ""),
                countries=countries,
                start_date=(status.get("startDateStruct", {}) or {}).get("date", ""),
                last_update_date=(status.get("lastUpdatePostDateStruct", {}) or {}).get("date", ""),
                org_study_id=(ident.get("orgStudyIdInfo", {}) or {}).get("id", ""),
                secondary_ids=secondary_ids,
            )
        except Exception as e:
            print(f"Error parsing study: {e}")
            return None

    @staticmethod
    def status_ja(status: str) -> str:
        """治験ステータスの日本語ラベル"""
        return STATUS_JA.get(status, status or "不明")

    @staticmethod
    def phases_ja(phases: List[str]) -> str:
        """フェーズの日本語ラベル（複数は連結）"""
        if not phases:
            return ""
        return " / ".join(PHASE_JA.get(p, p) for p in phases)


def main():
    """簡易動作確認"""
    client = ClinicalTrialsClient()
    print("=" * 60)
    print("開発コード U3-1402 で検索")
    print("=" * 60)
    studies = list(client.iter_studies(term="U3-1402"))
    print(f"取得件数: {len(studies)}")
    for s in studies[:3]:
        info = client.parse_study(s)
        if info:
            print(f"\n{info.nct_id}: {info.title}")
            print(f"  ステータス: {client.status_ja(info.overall_status)}")
            print(f"  フェーズ: {client.phases_ja(info.phases)}")
            print(f"  スポンサー: {info.lead_sponsor}")
            print(f"  国: {', '.join(info.countries)}")
            print(f"  最終更新: {info.last_update_date}")


if __name__ == "__main__":
    main()
