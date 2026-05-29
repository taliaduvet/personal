#!/usr/bin/env python3
"""
Interactive CLI review tool for pending knowledge records.

Usage:
    python3 pipeline/review.py
    python3 pipeline/review.py --discipline drums
    python3 pipeline/review.py --limit 20
"""

import argparse
import json
import sys
from pathlib import Path

from rich.columns import Columns
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

sys.path.insert(0, str(Path(__file__).parent.parent))
import config
from supabase import create_client

supabase = create_client(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY)
console = Console()


# ---------------------------------------------------------------------------
# Display helpers
# ---------------------------------------------------------------------------

def render_record(rec: dict) -> Panel:
    """Render a knowledge record as a rich Panel."""
    lines = []

    lines.append(f"[bold yellow]{rec.get('type', '?').upper()}[/] — [bold]{rec.get('title', '?')}[/]")
    lines.append(f"[dim]{rec.get('discipline', '?')} | depth {rec.get('depth_score')}/3 | attr tier {rec.get('attribution_tier')}[/]")
    lines.append("")
    lines.append(f"[italic]{rec.get('one_liner', '')}[/]")
    lines.append("")

    # Sections
    for key, val in (rec.get("sections") or {}).items():
        if not val:
            continue
        if isinstance(val, list):
            val_str = "\n".join(f"  {i+1}. {v}" for i, v in enumerate(val))
        else:
            val_str = str(val)[:300] + ("…" if len(str(val)) > 300 else "")
        lines.append(f"[cyan]{key}[/]: {val_str}")

    # Context
    ctx = rec.get("context", {})
    ctx_parts = [f"{k}: {', '.join(v)}" for k, v in ctx.items() if v]
    if ctx_parts:
        lines.append("")
        lines.append(f"[dim]Context: {' | '.join(ctx_parts)}[/]")

    # Flags
    flags = rec.get("flags", [])
    if flags:
        lines.append(f"[bold red]Flags: {', '.join(flags)}[/]")

    # Conflict of interest
    if rec.get("conflict_of_interest"):
        lines.append("[bold red]⚠ Conflict of interest flagged[/]")

    return Panel("\n".join(lines), border_style="yellow", padding=(0, 1))


def render_source(rec: dict) -> Panel:
    """Render source attribution."""
    sources = rec.get("sources", [])
    lines = []
    for src in sources:
        tier = src.get("tier", "?")
        tier_label = {1: "✓ Direct quote", 2: "~ Paraphrase", 3: "∑ Synthesised"}.get(tier, "?")
        lines.append(f"[bold]{src.get('title', '?')}[/] — {src.get('author', '')}")
        if src.get("timestamp"):
            lines.append(f"  Timestamp: {src['timestamp']}")
        if src.get("page"):
            lines.append(f"  Page: {src['page']}")
        if src.get("quote"):
            quote = src["quote"][:300] + ("…" if len(src["quote"]) > 300 else "")
            lines.append(f"  [italic]\"{quote}\"[/]")
        lines.append(f"  Attribution: {tier_label} (Tier {tier})")

    return Panel("\n".join(lines) if lines else "[dim]No sources[/]",
                 title="Source", border_style="blue", padding=(0, 1))


def render_criteria(rec: dict) -> Panel:
    """Render quality criteria pass/fail."""
    criteria = rec.get("criteria_evaluation", {})
    icons = {True: "[green]✓[/]", False: "[red]✗[/]", None: "[dim]—[/]"}
    lines = []
    for key, label in [
        ("specific",     "Specific"),
        ("principled",   "Principled"),
        ("attributable", "Attributable"),
        ("actionable",   "Actionable"),
        ("non_obvious",  "Non-obvious"),
        ("clear",        "Clear (principles)"),
    ]:
        val = criteria.get(key)
        lines.append(f"{icons.get(val, '?')} {label}")
    return Panel("\n".join(lines), title="Criteria", border_style="dim", padding=(0, 1))


# ---------------------------------------------------------------------------
# Actions
# ---------------------------------------------------------------------------

def approve(rec_id: str):
    supabase.table("kp_knowledge_items").update({"status": "published"}).eq("id", rec_id).execute()
    console.print("[green]✓ Approved[/]")


def reject(rec_id: str):
    supabase.table("kp_knowledge_items").update({"status": "rejected"}).eq("id", rec_id).execute()
    console.print("[red]✗ Rejected[/]")


def edit_record(rec: dict):
    """Open the record JSON in $EDITOR for manual editing, then save."""
    import os
    import tempfile
    import subprocess

    editor = os.environ.get("EDITOR", "nano")
    editable = {k: rec[k] for k in
                ["title", "one_liner", "sections", "context", "filters", "meta",
                 "scope", "depth_score", "attribution_tier", "flags"]
                if k in rec}

    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
        json.dump(editable, f, indent=2)
        tmp_path = f.name

    subprocess.run([editor, tmp_path])

    try:
        updated = json.loads(Path(tmp_path).read_text())
        supabase.table("kp_knowledge_items").update(updated).eq("id", rec["id"]).execute()
        supabase.table("kp_knowledge_items").update({"status": "published"}).eq("id", rec["id"]).execute()
        console.print("[green]✓ Saved and approved[/]")
    except json.JSONDecodeError:
        console.print("[red]Invalid JSON — changes not saved[/]")
    finally:
        Path(tmp_path).unlink(missing_ok=True)


# ---------------------------------------------------------------------------
# Main review loop
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Review pending knowledge records.")
    parser.add_argument("--discipline", help="Filter by discipline")
    parser.add_argument("--limit", type=int, default=50, help="Max records per session")
    args = parser.parse_args()

    query = supabase.table("kp_knowledge_items").select("*").eq("status", "pending").limit(args.limit)
    if args.discipline:
        query = query.eq("discipline", args.discipline)
    result = query.order("created_at").execute()
    records = result.data

    if not records:
        console.print("[green]No pending records.[/]")
        return

    console.print(f"\n[bold]Review session — {len(records)} pending records[/]\n")
    approved = rejected = skipped = 0

    for i, rec in enumerate(records, 1):
        console.clear()
        console.print(f"[dim]Record {i}/{len(records)} — {approved} approved, {rejected} rejected, {skipped} skipped[/]\n")
        console.print(render_record(rec))
        console.print(Columns([render_source(rec), render_criteria(rec)]))

        while True:
            choice = input("\n[A]pprove  [R]eject  [E]dit+Approve  [S]kip  [Q]uit: ").lower().strip()
            if choice == "a":
                approve(rec["id"])
                approved += 1
                break
            elif choice == "r":
                reject(rec["id"])
                rejected += 1
                break
            elif choice == "e":
                edit_record(rec)
                approved += 1
                break
            elif choice == "s":
                skipped += 1
                break
            elif choice == "q":
                console.print(f"\n[bold]Session ended.[/] {approved} approved, {rejected} rejected, {skipped} skipped.")
                return
            else:
                console.print("Enter A, R, E, S, or Q.")

    console.print(f"\n[bold green]Session complete.[/] {approved} approved, {rejected} rejected, {skipped} skipped.")


if __name__ == "__main__":
    main()
