"""
ClinicalTrials.gov 本地化 POC モジュール

独立して存在し、既存の app.py / frontend / pipeline には接続されていない。
ClinicalTrials.gov API v2 から治験データを取得し、ローカル JSON に保存する。
"""

from .clinicaltrials_client import ClinicalTrialsClient, TrialInfo
from .seeds import load_seeds_from_csv
from .local_store import LocalTrialStore, trial_to_record

__all__ = [
    "ClinicalTrialsClient",
    "TrialInfo",
    "load_seeds_from_csv",
    "LocalTrialStore",
    "trial_to_record",
]
