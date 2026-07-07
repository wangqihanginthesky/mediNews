"""
種子（シード）抽出

ClinicalTrials.gov は英語のみ。ProcessedData.csv の薬剤名は日本語なので
そのままでは一致しない。開発コード（code 列）は言語中立で直接ヒットするため、
POC ではこれを主シードとして使う。
"""

import csv
from typing import List, Dict, Optional

# メモリ内 CSV フィールドサイズ上限を上げる（content 列が長いため）
csv.field_size_limit(10 * 1024 * 1024)

DEFAULT_CSV_PATH = "reference/ProcessedData.csv"


def load_seeds_from_csv(
    path: str = DEFAULT_CSV_PATH,
    limit: Optional[int] = None,
) -> List[Dict[str, str]]:
    """
    ProcessedData.csv から言語中立な開発コードのシードを抽出する。

    - delete_flag が立っている行はスキップ
    - code 列で重複排除（最初に出た行の日本語メタを保持）
    - 各シードは以下を持つ:
        code            : 開発コード（検索キー・言語中立）
        drug_name_ja    : 商品名（日本語・対照用）
        common_name_ja  : 一般名（日本語・対照用）
        company_ja      : 企業名（日本語・対照用）
        disease_area_ja : 疾患領域（日本語・対照用）

    Args:
        path: CSV パス
        limit: 先頭 N 件だけ返す（POC で「一部分」だけ回す用）
    """
    seeds: List[Dict[str, str]] = []
    seen_codes = set()

    with open(path, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if str(row.get("delete_flag", "")).strip().lower() in ("true", "1"):
                continue
            code = (row.get("code") or "").strip()
            if not code or code in seen_codes:
                continue
            seen_codes.add(code)
            seeds.append({
                "code": code,
                "drug_name_ja": (row.get("normalized_drug_name") or row.get("drug_name") or "").strip(),
                "common_name_ja": (row.get("common_name") or "").strip(),
                "company_ja": (row.get("normalized_company_name") or row.get("companies") or "").strip(),
                "disease_area_ja": (row.get("disease_area") or "").strip(),
            })
            if limit is not None and len(seeds) >= limit:
                break

    return seeds


def main():
    """簡易動作確認"""
    seeds = load_seeds_from_csv(limit=10)
    print(f"抽出シード数: {len(seeds)}")
    for s in seeds:
        print(f"  {s['code']:20s} | {s['drug_name_ja']} | {s['company_ja']}")


if __name__ == "__main__":
    main()
