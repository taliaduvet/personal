#!/usr/bin/env python3
"""
Prepare a source for Claude Code extraction, or insert pre-built records.

Extraction workflow:
  1. Run this script with --source-id to print the source text
  2. Paste that text into your Claude Code session with: "extract records from this source"
  3. Claude Code extracts records and inserts them via Supabase MCP
  4. Run pipeline/review.py to approve records

OR: use --insert to save a JSON records file that Claude Code generated.

Usage:
    # Print a source ready for Claude Code
    python3 pipeline/extract.py --source-id <uuid>

    # List all queued sources
    python3 pipeline/extract.py --list

    # Insert records from a JSON file Claude Code produced
    python3 pipeline/extract.py --source-id <uuid> --insert records.json
"""

import argparse
import json
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
import config
from pipeline.validate import validate_record
from supabase import create_client

supabase = create_client(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY)

PROMPTS_DIR = Path(__file__).parent.parent / "prompts"
CHUNK_SIZE = config.CHUNK_SIZE


def chunk_text(text: str) -> list[str]:
    """Split text into chunks by word count."""
    words = text.split()
    if len(words) <= CHUNK_SIZE:
        return [text]
    chunks = []
    overlap = CHUNK_SIZE // 8
    i = 0
    while i < len(words):
        chunks.append(" ".join(words[i:i + CHUNK_SIZE]))
        i += CHUNK_SIZE - overlap
    return chunks


def print_source_for_extraction(source: dict, prompt_type: str):
    """Print the source formatted for pasting into Claude Code."""
    prompt_file = PROMPTS_DIR / f"{prompt_type}.md"
    system_prompt = prompt_file.read_text() if prompt_file.exists() else "(prompt file not found)"

    chunks = chunk_text(source["raw_text"])
    chunk_count = len(chunks)

    print("\n" + "=" * 72)
    print(f"SOURCE: {source['title']}")
    print(f"Author: {source.get('author', '—')}")
    print(f"Type:   {source['type']}")
    print(f"ID:     {source['id']}")
    print(f"Words:  {len(source['raw_text'].split()):,}  →  {chunk_count} chunk(s)")
    print("=" * 72)
    print()
    print("PASTE THE FOLLOWING INTO YOUR CLAUDE CODE SESSION:")
    print("-" * 72)
    print()

    if chunk_count == 1:
        print(f"Use this system prompt + source text to extract knowledge records.\n")
        print(f"SYSTEM PROMPT:\n{system_prompt}\n")
        print(f"SOURCE TEXT:\n{source['raw_text']}")
    else:
        print(f"This source has {chunk_count} chunks. Process them one at a time.")
        for i, chunk in enumerate(chunks, 1):
            print(f"\n--- CHUNK {i}/{chunk_count} ---")
            print(f"SYSTEM PROMPT:\n{system_prompt}\n")
            print(f"SOURCE TEXT:\n{chunk}")
            if i < chunk_count:
                print(f"\n[Paste chunk {i} into Claude Code, get records, then continue to chunk {i+1}]")

    print()
    print("-" * 72)
    print()
    print("AFTER EXTRACTION: Ask Claude Code to insert records into Supabase via MCP,")
    print(f"using source_id: {source['id']}")
    print()
    print("OR: Save the JSON to a file and run:")
    print(f"  python3 pipeline/extract.py --source-id {source['id']} --insert records.json")


def insert_records(source_id: str, records_file: str):
    """Validate and insert pre-built records from a JSON file."""
    path = Path(records_file)
    if not path.exists():
        print(f"File not found: {records_file}")
        sys.exit(1)

    data = json.loads(path.read_text())
    # Support both {"records": [...]} and bare [...]
    if isinstance(data, dict):
        records = data.get("records", [])
    else:
        records = data

    print(f"\nValidating {len(records)} records…")
    valid = []
    for rec in records:
        errors = validate_record(rec)
        if errors:
            print(f"  FAIL: {rec.get('title', '?')}")
            for e in errors:
                print(f"    - {e}")
        else:
            valid.append(rec)

    print(f"  {len(valid)}/{len(records)} pass validation")
    if not valid:
        print("Nothing to insert.")
        return

    rows = []
    for rec in valid:
        rows.append({
            "id": str(uuid.uuid4()),
            "source_id": source_id,
            "discipline": rec.get("discipline", "universal"),
            "type": rec.get("type"),
            "title": rec.get("title"),
            "one_liner": rec.get("one_liner"),
            "sections": rec.get("sections", {}),
            "context": rec.get("context", {}),
            "sources": rec.get("sources", []),
            "attribution_tier": rec.get("attribution_tier", 2),
            "depth_score": rec.get("depth_score", 1),
            "conflict_of_interest": rec.get("conflict_of_interest", False),
            "scope": rec.get("scope", []),
            "filters": rec.get("filters", []),
            "meta": rec.get("meta", {}),
            "criteria_evaluation": rec.get("criteria_evaluation", {}),
            "flags": rec.get("flags", []),
            "status": "pending",
        })

    supabase.table("kp_knowledge_items").insert(rows).execute()
    supabase.table("kp_sources").update({
        "status": "extracted",
        "records_created": len(rows),
        "processed_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", source_id).execute()

    print(f"\n  Saved {len(rows)} records as 'pending' in Supabase")
    print(f"\nNext step:")
    print(f"  python3 pipeline/review.py")


def list_sources():
    """List all sources with their status."""
    result = supabase.table("kp_sources").select(
        "id, title, author, type, status, records_created, created_at"
    ).order("created_at", desc=True).limit(20).execute()

    if not result.data:
        print("No sources found.")
        return

    print(f"\n{'Status':<12} {'Type':<10} {'Records':<10} {'Title'}")
    print("-" * 70)
    for s in result.data:
        records = s.get("records_created") or "—"
        print(f"{s['status']:<12} {s['type']:<10} {str(records):<10} {s['title'][:45]}")
        print(f"{'':12} {'':10} {'':10} ID: {s['id']}")


def main():
    parser = argparse.ArgumentParser(description="Prepare sources for Claude Code extraction.")
    parser.add_argument("--source-id", help="UUID of the source in Supabase")
    parser.add_argument("--list", action="store_true", help="List all sources")
    parser.add_argument("--type", default="technical", choices=["technical", "principles"],
                        help="Extraction prompt to use (default: technical)")
    parser.add_argument("--insert", metavar="records.json",
                        help="Insert records from a JSON file into Supabase")
    args = parser.parse_args()

    if args.list:
        list_sources()
        return

    if not args.source_id:
        parser.error("Provide --source-id or --list")

    result = supabase.table("kp_sources").select("*").eq("id", args.source_id).execute()
    if not result.data:
        print(f"Source not found: {args.source_id}")
        sys.exit(1)
    source = result.data[0]

    if args.insert:
        insert_records(args.source_id, args.insert)
    else:
        print_source_for_extraction(source, args.type)


if __name__ == "__main__":
    main()
