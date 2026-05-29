#!/usr/bin/env python3
"""
Add a source to the pipeline queue.

Usage:
    # Web article
    python3 pipeline/ingest.py --url "https://..." --type article --title "Title" --author "Author"

    # YouTube video (transcript extracted automatically)
    python3 pipeline/ingest.py --url "https://youtube.com/watch?v=..." --type video --title "Title" --author "Author"

    # Local text or PDF file
    python3 pipeline/ingest.py --file path/to/file.txt --type book --title "Title" --author "Author"
"""

import argparse
import json
import re
import subprocess
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).parent.parent))
import config
from supabase import create_client

supabase = create_client(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY)


# ---------------------------------------------------------------------------
# Text extraction
# ---------------------------------------------------------------------------

def fetch_article(url: str) -> str:
    """Fetch main text content from a web article."""
    headers = {"User-Agent": "Mozilla/5.0 (compatible; KnowledgePipeline/1.0)"}
    resp = requests.get(url, headers=headers, timeout=30)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    # Remove nav, footer, ads, scripts
    for tag in soup(["nav", "footer", "script", "style", "aside", "header"]):
        tag.decompose()

    # Try common article containers
    for selector in ["article", "main", ".article-body", ".post-content", "#content"]:
        el = soup.select_one(selector)
        if el:
            return el.get_text(separator="\n", strip=True)

    return soup.get_text(separator="\n", strip=True)


def fetch_youtube_transcript(url: str) -> str:
    """Extract transcript from a YouTube video using yt-dlp."""
    print(f"  Extracting transcript from YouTube…")
    try:
        result = subprocess.run(
            ["yt-dlp", "--skip-download", "--write-auto-sub",
             "--sub-format", "vtt", "--sub-lang", "en",
             "--output", "/tmp/yt_transcript", url],
            capture_output=True, text=True, timeout=120
        )
        # Find the VTT file
        vtt_files = list(Path("/tmp").glob("yt_transcript*.vtt"))
        if not vtt_files:
            print("  No auto-captions found — paste transcript manually.")
            return ""
        vtt_text = vtt_files[0].read_text()
        # Strip VTT formatting
        lines = []
        for line in vtt_text.splitlines():
            if "-->" in line or line.strip().isdigit() or not line.strip():
                continue
            # Remove HTML tags
            clean = re.sub(r"<[^>]+>", "", line).strip()
            if clean:
                lines.append(clean)
        # Clean up temp files
        for f in vtt_files:
            f.unlink()
        return "\n".join(lines)
    except FileNotFoundError:
        print("  yt-dlp not found. Install: pip3 install yt-dlp")
        return ""
    except Exception as e:
        print(f"  Transcript extraction failed: {e}")
        return ""


def read_file(path: str) -> str:
    """Read text from a local file."""
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"File not found: {path}")
    if p.suffix.lower() == ".pdf":
        try:
            import pdfplumber
            with pdfplumber.open(p) as pdf:
                return "\n".join(page.extract_text() or "" for page in pdf.pages)
        except ImportError:
            print("  pdfplumber not installed — install: pip3 install pdfplumber")
            print("  Falling back to raw read (may be garbled for PDFs)")
    return p.read_text(encoding="utf-8", errors="ignore")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Ingest a source into the pipeline.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""Examples:
  # Web article (auto-fetched)
  python3 pipeline/ingest.py --url "https://..." --type article --title "Title" --author "Author"

  # YouTube video (transcript via yt-dlp)
  python3 pipeline/ingest.py --url "https://youtube.com/watch?v=..." --type video --title "Title" --author "Author"

  # Local PDF or text file
  python3 pipeline/ingest.py --file path/to/file.pdf --type book --title "Title" --author "Author"

  # Paste text directly (e.g. from a paywalled article — copy text, save to file, use --file)
  echo "Paste article text here..." > /tmp/source.txt
  python3 pipeline/ingest.py --file /tmp/source.txt --type article --title "Title" --author "Author"

  # Pipe text via stdin
  pbpaste | python3 pipeline/ingest.py --stdin --type article --title "Title" --author "Author"
""")
    parser.add_argument("--url",    help="URL of the source (article or YouTube)")
    parser.add_argument("--file",   help="Path to a local file (.txt, .pdf)")
    parser.add_argument("--stdin",  action="store_true", help="Read raw text from stdin (pipe or redirect)")
    parser.add_argument("--type",   required=True, choices=["article", "video", "podcast", "book"], help="Source type")
    parser.add_argument("--title",  required=True, help="Title of the source")
    parser.add_argument("--author", default="", help="Author or speaker name")
    parser.add_argument("--dry-run", action="store_true", help="Print extracted text without saving")
    args = parser.parse_args()

    if not args.url and not args.file and not args.stdin:
        parser.error("Provide --url, --file, or --stdin")

    # Extract raw text
    print(f"\nIngesting: {args.title}")
    raw_text = ""

    if args.stdin:
        print(f"  Reading from stdin…")
        raw_text = sys.stdin.read()
    elif args.file:
        print(f"  Reading file: {args.file}")
        raw_text = read_file(args.file)
    elif args.type == "video" and args.url:
        raw_text = fetch_youtube_transcript(args.url)
    else:
        print(f"  Fetching: {args.url}")
        raw_text = fetch_article(args.url)

    if not raw_text.strip():
        print("  No text extracted.")
        print("  Options:")
        print("    1. Save article text to a .txt file and use --file path/to/file.txt")
        print("    2. Use: pbpaste | python3 pipeline/ingest.py --stdin --type ... --title ...")
        print("    3. For YouTube, ensure yt-dlp is installed: pip3 install yt-dlp")
        return

    word_count = len(raw_text.split())
    print(f"  Extracted {word_count:,} words")

    if word_count < 100:
        print(f"  WARNING: Very short extract ({word_count} words). The page may be JS-rendered or paywalled.")
        print(f"  Tip: Copy the article text and pipe it in: pbpaste | python3 pipeline/ingest.py --stdin ...")
        if not args.dry_run:
            choice = input("  Save anyway? [y/N]: ").strip().lower()
            if choice != 'y':
                return

    if args.dry_run:
        print("\n--- EXTRACTED TEXT (first 1000 chars) ---")
        print(raw_text[:1000])
        print("---")
        return

    # Save to Supabase
    source = {
        "id": str(uuid.uuid4()),
        "type": args.type,
        "title": args.title,
        "url": args.url or "",
        "author": args.author,
        "status": "queued",
        "raw_text": raw_text,
        "processed_at": None,
    }

    result = supabase.table("kp_sources").insert(source).execute()
    source_id = result.data[0]["id"]

    print(f"  Saved to Supabase — source ID: {source_id}")
    print(f"\nNext step:")
    print(f"  python3 pipeline/extract.py --source-id {source_id}")


if __name__ == "__main__":
    main()
