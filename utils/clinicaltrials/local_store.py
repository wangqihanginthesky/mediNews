"""
治験 → medical_data 同構レコードへのマッピング + ローカル JSON ストア

- 出力レコードは既存 medical_data と同じ扁平キー構造（将来の取り込みを容易にするため）。
- ただし本 POC では Firestore には一切書き込まず、ローカル JSON にのみ保存する。
- nct_id を主キーに重複排除（冪等 upsert）。
"""

import json
from pathlib import Path
from typing import Dict, List, Optional, Any

from .clinicaltrials_client import ClinicalTrialsClient, TrialInfo

# 介入のうち薬剤とみなす type
DRUG_INTERVENTION_TYPES = {"DRUG", "BIOLOGICAL"}


def _normalize_code(s: str) -> str:
    """コード比較用の正規化（大文字化・区切り文字除去）"""
    return "".join(ch for ch in s.upper() if ch.isalnum())


def code_match_confidence(trial: TrialInfo, code: str) -> str:
    """
    シードコードが「その薬剤の試験」を本当に指しているかの確度を判定。

    query.term はフルテキスト検索。短い/一般的なコード（例 af-001）は、無関係な
    スポンサーが偶然同じプロトコル番号（SEARCH-AF-001 等）を使っているだけの試験に
    誤ヒットする。実データを見ると:
      - 本物の薬剤コード（U3-1402, mRNA-1647）は「介入名」または「タイトル」に出る
      - 誤ヒットはコードが OrgStudyId / SecondaryId に埋め込まれているだけ
    そこで介入名・タイトルに含まれる場合のみ "high"、それ以外は "low"（誤ヒット疑い）。

    Returns: "high" | "low"
    """
    if not code:
        return "low"
    norm = _normalize_code(code)
    if len(norm) < 3:
        return "low"
    haystacks = [trial.title] + [iv.get("name", "") for iv in trial.interventions]
    for h in haystacks:
        if norm in _normalize_code(h or ""):
            return "high"
    return "low"


def trial_to_record(trial: TrialInfo, seed: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    """
    TrialInfo を medical_data 同構の扁平 dict に変換する。

    Args:
        trial: parse 済み治験情報
        seed:  この試験がヒットしたシード（日本語メタを対照用に付与）
    """
    seed = seed or {}
    client = ClinicalTrialsClient

    # 薬剤名（介入から抽出）。無ければ全介入名。
    drug_names = [iv["name"] for iv in trial.interventions if iv.get("type") in DRUG_INTERVENTION_TYPES]
    if not drug_names:
        drug_names = [iv["name"] for iv in trial.interventions]

    phase_ja = client.phases_ja(trial.phases)
    code = seed.get("code", "")

    return {
        "nct_id": trial.nct_id,
        "match_confidence": code_match_confidence(trial, code),
        "event_type": phase_ja or "臨床試験",
        "trial_status": client.status_ja(trial.overall_status),
        "phase": " / ".join(trial.phases),
        "study_type": trial.study_type,
        "disease_area": trial.conditions[0] if trial.conditions else "",
        "indication": " / ".join(trial.conditions),
        "disease_area_ja_seed": seed.get("disease_area_ja", ""),
        "company": trial.lead_sponsor,
        "drug_name": drug_names[0] if drug_names else "",
        "drug_names_all": " / ".join(drug_names),
        "common_name": seed.get("common_name_ja", ""),
        "drug_name_ja_seed": seed.get("drug_name_ja", ""),
        "code": seed.get("code", ""),
        "matched_codes": [seed["code"]] if seed.get("code") else [],
        "countries": " / ".join(trial.countries),
        "title": trial.title,
        "content": trial.brief_summary,
        "source": "ClinicalTrials.gov",
        "url": f"https://clinicaltrials.gov/study/{trial.nct_id}",
        "datetime": trial.last_update_date,
        "start_date": trial.start_date,
    }


class LocalTrialStore:
    """nct_id をキーにしたローカル JSON ストア（冪等 upsert）"""

    def __init__(self, data_dir: str = "data/clinicaltrials"):
        self.data_dir = Path(data_dir)
        self.trials_file = self.data_dir / "trials.json"
        self.state_file = self.data_dir / "sync_state.json"
        self.trials: Dict[str, Dict[str, Any]] = {}
        self.state: Dict[str, Any] = {"watermark": "", "last_run": "", "counts": {}}
        self._load()

    def _load(self):
        if self.trials_file.exists():
            try:
                with open(self.trials_file, encoding="utf-8") as f:
                    self.trials = json.load(f)
                print(f"既存 {len(self.trials)} 件をロード")
            except Exception as e:
                print(f"trials.json ロード失敗: {e}")
                self.trials = {}
        if self.state_file.exists():
            try:
                with open(self.state_file, encoding="utf-8") as f:
                    self.state = json.load(f)
            except Exception as e:
                print(f"sync_state.json ロード失敗: {e}")

    def save(self):
        self.data_dir.mkdir(parents=True, exist_ok=True)
        with open(self.trials_file, "w", encoding="utf-8") as f:
            json.dump(self.trials, f, ensure_ascii=False, indent=2)
        with open(self.state_file, "w", encoding="utf-8") as f:
            json.dump(self.state, f, ensure_ascii=False, indent=2)

    @property
    def watermark(self) -> str:
        return self.state.get("watermark", "") or ""

    def upsert(self, record: Dict[str, Any]) -> str:
        """
        レコードを nct_id で upsert する。

        Returns:
            "added" | "updated"（重複時は matched_codes を統合）
        """
        nct_id = record["nct_id"]
        if nct_id in self.trials:
            existing = self.trials[nct_id]
            # matched_codes を統合（複数シードが同じ試験にヒットするケース）
            merged_codes = list(dict.fromkeys(
                existing.get("matched_codes", []) + record.get("matched_codes", [])
            ))
            record["matched_codes"] = merged_codes
            self.trials[nct_id] = record
            return "updated"
        else:
            self.trials[nct_id] = record
            return "added"

    def bump_watermark(self, date_str: str):
        """見た中で最大の lastUpdatePostDate を watermark に反映"""
        if date_str and date_str > self.watermark:
            self.state["watermark"] = date_str

    def set_run_meta(self, run_timestamp: str, counts: Dict[str, int]):
        self.state["last_run"] = run_timestamp
        self.state["counts"] = counts
