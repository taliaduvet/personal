#!/usr/bin/env python3
"""
Pull all published knowledge records from Supabase and write them
into the Bass App's knowledge_base/ directory, then regenerate index.html.

Usage:
    python3 pipeline/sync.py
    python3 pipeline/sync.py --dry-run
"""

import argparse
import json
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
import config
from supabase import create_client

supabase = create_client(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY)


# ---------------------------------------------------------------------------
# Transform Supabase record → ContentRecord schema used by the app
# ---------------------------------------------------------------------------

def to_content_record(row: dict) -> dict:
    """Convert a Supabase knowledge_items row to a ContentRecord for the app."""
    rec = {
        "id": row["id"],
        "type": row["type"],
        "title": row["title"],
        "oneLiner": row["one_liner"],
        "filters": row.get("filters") or [],
        "sections": row.get("sections") or {},
        "meta": row.get("meta") or {},
        # Store context and sources for Start Here matching and citations
        "context": row.get("context") or {},
        "sources": row.get("sources") or [],
    }
    return rec


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Sync published records to Bass App.")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print what would be written without writing")
    parser.add_argument("--no-regen", action="store_true",
                        help="Skip regenerating index.html after sync")
    args = parser.parse_args()

    # Fetch all published records
    result = supabase.table("kp_knowledge_items").select("*").eq("status", "published").execute()
    rows = result.data

    if not rows:
        print("No published records found.")
        return

    print(f"Fetched {len(rows)} published records")

    # Group by discipline
    by_discipline: dict[str, list] = defaultdict(list)
    for row in rows:
        discipline = row.get("discipline", "universal")
        by_discipline[discipline].append(to_content_record(row))

    # Summarise
    for disc, recs in sorted(by_discipline.items()):
        by_type = defaultdict(int)
        for r in recs:
            by_type[r["type"]] += 1
        summary = ", ".join(f"{count} {t}" for t, count in sorted(by_type.items()))
        print(f"  {disc}: {len(recs)} records ({summary})")

    if args.dry_run:
        print("\nDry run — nothing written.")
        return

    # Write JSON files to Bass App's knowledge_base/ directory
    kb_dir = config.BASS_APP_PATH / "knowledge_base"
    kb_dir.mkdir(exist_ok=True)

    for discipline, records in by_discipline.items():
        out_path = kb_dir / f"{discipline}.json"
        out_path.write_text(json.dumps(records, indent=2, ensure_ascii=False))
        print(f"  Wrote {out_path.name} ({len(records)} records)")

    # Write a manifest so generate_index.py knows what's available
    manifest = {disc: len(recs) for disc, recs in by_discipline.items()}
    (kb_dir / "manifest.json").write_text(json.dumps(manifest, indent=2))
    print(f"  Wrote manifest.json")

    # Regenerate index.html
    if not args.no_regen:
        gen_script = config.BASS_APP_PATH / "generate_index.py"
        if gen_script.exists():
            print(f"\nRegenerating index.html…")
            result = subprocess.run(
                ["python3", str(gen_script)],
                capture_output=True, text=True,
                cwd=str(config.BASS_APP_PATH)
            )
            if result.returncode == 0:
                print(f"  {result.stdout.strip()}")
            else:
                print(f"  Error: {result.stderr.strip()}")
        else:
            print(f"\ngenerate_index.py not found at {gen_script}")

    print("\nSync complete.")


if __name__ == "__main__":
    main()
