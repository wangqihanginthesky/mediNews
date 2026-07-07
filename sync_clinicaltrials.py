#!/usr/bin/env python3
"""
ClinicalTrials.gov ローカル同期スクリプト（POC）

ProcessedData.csv の開発コードをシードに、全世界の関連治験を取得し、
medical_data 同構のレコードとしてローカル JSON (data/clinicaltrials/trials.json) に
冪等 upsert する。Firestore や既存 pipeline には一切触れない。

使い方:
    python sync_clinicaltrials.py --limit 10          # 先頭 10 コードだけ（POC）
    python sync_clinicaltrials.py --limit 10 --full   # watermark を無視して全期間
    python sync_clinicaltrials.py                      # 全コード・差分のみ

差分更新:
    前回の watermark（最大 lastUpdatePostDate）以降に更新された試験のみ取得。
    cron で毎日/毎週回す想定。--full で無視できる。

日付注入:
    --today YYYY-MM-DD で「実行日」を渡せる（未指定なら date.today）。
    ライブラリ側では時刻を直接取らず、ここで注入することで再現・テスト可能にする。
"""

import argparse
import sys
from datetime import date

from utils.clinicaltrials.clinicaltrials_client import ClinicalTrialsClient
from utils.clinicaltrials.seeds import load_seeds_from_csv
from utils.clinicaltrials.local_store import LocalTrialStore, trial_to_record


def main():
    parser = argparse.ArgumentParser(description="ClinicalTrials.gov ローカル同期 (POC)")
    parser.add_argument("--limit", type=int, default=None,
                        help="先頭 N コードだけ処理（POC 用）")
    parser.add_argument("--full", action="store_true",
                        help="watermark を無視して全期間取得")
    parser.add_argument("--csv", default="reference/ProcessedData.csv",
                        help="シード CSV パス")
    parser.add_argument("--data-dir", default="data/clinicaltrials",
                        help="出力ディレクトリ")
    parser.add_argument("--today", default=None,
                        help="実行日 YYYY-MM-DD（未指定なら本日）")
    parser.add_argument("--page-size", type=int, default=100,
                        help="API ページサイズ（最大 1000）")
    parser.add_argument("--keep-low", action="store_true",
                        help="低確度（コードが構造化フィールドに無い誤ヒット疑い）も保存する")
    args = parser.parse_args()

    run_timestamp = args.today or date.today().isoformat()

    client = ClinicalTrialsClient()
    store = LocalTrialStore(data_dir=args.data_dir)
    seeds = load_seeds_from_csv(path=args.csv, limit=args.limit)

    updated_after = None if args.full else (store.watermark or None)

    print("=" * 64)
    print(f"実行日: {run_timestamp}")
    print(f"シード数: {len(seeds)}  | 差分基準(watermark): {updated_after or '(全期間)'}")
    print(f"既存ストア: {len(store.trials)} 件")
    print("=" * 64)

    counts = {"added": 0, "updated": 0, "seeds_hit": 0, "seeds_empty": 0,
              "api_records": 0, "low_skipped": 0, "high": 0}
    empty_codes = []

    for i, seed in enumerate(seeds, 1):
        code = seed["code"]
        hit = 0
        for study in client.iter_studies(term=code, updated_after=updated_after,
                                          page_size=args.page_size):
            trial = client.parse_study(study)
            if not trial:
                continue
            counts["api_records"] += 1
            record = trial_to_record(trial, seed=seed)
            # コードが構造化フィールドに無い低確度ヒットは既定でスキップ（誤ヒット除去）
            if record["match_confidence"] == "low" and not args.keep_low:
                counts["low_skipped"] += 1
                # watermark は API が返した以上、進めてよい（再取得を防ぐ）
                store.bump_watermark(trial.last_update_date)
                continue
            counts["high"] += 1
            hit += 1
            action = store.upsert(record)
            counts[action] += 1
            store.bump_watermark(trial.last_update_date)

        if hit:
            counts["seeds_hit"] += 1
        else:
            counts["seeds_empty"] += 1
            empty_codes.append(code)

        if i % 10 == 0 or i == len(seeds):
            print(f"  [{i}/{len(seeds)}] {code}: {hit} 件  "
                  f"(累計 added={counts['added']} updated={counts['updated']})")

    store.set_run_meta(run_timestamp, counts)
    store.save()

    print("-" * 64)
    print(f"完了: 追加 {counts['added']} / 更新 {counts['updated']} / "
          f"API 取得 {counts['api_records']} 件")
    print(f"高確度採用 {counts['high']} / 低確度スキップ {counts['low_skipped']}"
          f"{'（--keep-low で保存可）' if not args.keep_low else ''}")
    print(f"ヒットしたコード: {counts['seeds_hit']}  ヒット 0: {counts['seeds_empty']}")
    print(f"ストア総数: {len(store.trials)} 件")
    print(f"新 watermark: {store.watermark or '(未設定)'}")
    print(f"出力: {store.trials_file}")
    if empty_codes:
        preview = ", ".join(empty_codes[:15])
        more = "" if len(empty_codes) <= 15 else f" ...(他 {len(empty_codes) - 15})"
        print(f"ヒット 0 コード: {preview}{more}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
