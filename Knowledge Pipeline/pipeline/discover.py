#!/usr/bin/env python3
"""
Three-layer knowledge source discovery pipeline.

Layer 1 (RSS):    Monitor curated feed list for new relevant items.
Layer 2 (Search): DuckDuckGo topic searches to find sources outside known feeds.
Layer 3 (Links):  Extract outbound links from already-processed sources.

Each candidate is scored heuristically (domain authority, keyword match,
practitioner signals) and deduplicated against existing Supabase sources.
High-scoring candidates are saved to kp_discovery_candidates for approval.

Usage:
    python3 pipeline/discover.py                    # Run all layers, show digest
    python3 pipeline/discover.py --approve          # Run + interactive approval
    python3 pipeline/discover.py --pending          # Review existing pending only
    python3 pipeline/discover.py --layer rss        # Single layer
    python3 pipeline/discover.py --dry-run          # Show without saving
    python3 pipeline/discover.py --min-score 4.0    # Raise threshold (default 3)
"""

import argparse
import json
import re
import subprocess
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse, urlunparse

sys.path.insert(0, str(Path(__file__).parent.parent))
import config
from supabase import create_client

try:
    import feedparser
    HAS_FEEDPARSER = True
except ImportError:
    HAS_FEEDPARSER = False

try:
    from ddgs import DDGS
    HAS_DDGS = True
except ImportError:
    try:
        from duckduckgo_search import DDGS
        HAS_DDGS = True
    except ImportError:
        HAS_DDGS = False

from rich.console import Console
from rich.panel import Panel

supabase = create_client(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY)
console = Console()

PIPELINE_DIR = Path(__file__).parent
FEEDS_CONFIG_PATH = PIPELINE_DIR / "feeds.json"
TOPICS_CONFIG_PATH = PIPELINE_DIR / "search_topics.json"


# ---------------------------------------------------------------------------
# Config loaders
# ---------------------------------------------------------------------------

def load_feeds_config() -> dict:
    return json.loads(FEEDS_CONFIG_PATH.read_text())


def load_topics_config() -> dict:
    return json.loads(TOPICS_CONFIG_PATH.read_text())


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------

# Keywords scored against title/description text.
# Short keywords (<=3 chars) use word-boundary regex to avoid false substring
# matches: 'di' in 'studio'/'audio', 'amp' in 'sample'/'example', 'eq' in 'frequencies'.
# Multi-word and longer keywords use plain substring match.
TITLE_KEYWORDS = {
    # Core production topics — high value (substring safe)
    'bass': 2, '808': 2, 'kick': 2, 'snare': 2, 'groove': 2,
    'low end': 2, 'sub bass': 2, 'reese': 2, 'in the studio': 2,
    'classic tracks': 2, 'session notes': 2, 'sidechain': 2,
    # Broader technique signals — moderate value (substring safe)
    'drums': 1, 'drum': 1, 'compression': 1, 'recording': 1,
    'mixing': 1, 'tracking': 1, 'arrangement': 1, 'sound design': 1,
    'synthesis': 1, 'saturation': 1, 'parallel': 1, 'technique': 1,
    'tutorial': 1, 'how to': 1, 'interview': 1, 'production': 1,
    'engineer': 1, 'producer': 1, 'reverb': 1, 'pocket': 1,
    'feel': 1, 'quantize': 1,
    # Short keywords — word-boundary match only (marked with leading \b)
    r'\beq\b': 1, r'\bdi\b': 1, r'\bamp\b': 1,
}

# Pre-compiled regex for short boundary-matched keywords
_BOUNDARY_KW_RE = {
    kw: re.compile(kw, re.I)
    for kw in TITLE_KEYWORDS
    if kw.startswith(r'\b')
}

NEGATIVE_SIGNALS = [
    'top 10', 'best plugins', 'plugin review', 'gear review', 'gear roundup',
    'product review', 'review:', 'what is reverb',
    'beginner guide', 'for beginners', 'intro to',
    'free vst', 'free plugin', 'free samples', 'free drum kit', 'free 808',
    'drum kits [', '[wav', 'one shots', 'sample pack', 'sample library',
    'sale', 'discount', 'deal of the week', 'buy now',
    'new album', 'tour dates', 'announces', 'press release', 'chart',
    'awards', 'billboard', 'streaming numbers', 'dream studio',
    'opens in', 'booking agency', 'unveils', 'study examines',
    'leak reveals', 'unreleased products',
    'broadway', 'west end', 'live sound', 'theatre', 'theatrical',
    'shop', 'gear4music', 'amazon',
]

CONTENT_TYPE_MAP = {
    'interview': ['interview', 'in conversation', 'talks to', 'speaks with', 'q&a', 'qa'],
    'video': ['youtube.com', 'youtu.be', 'vimeo.com'],
    'podcast': ['podcast', 'episode', 'ep.', 'listen now'],
    'article': [],  # default
}


def get_domain(url: str) -> str:
    try:
        return urlparse(url).netloc.lower().removeprefix('www.')
    except Exception:
        return ''


def score_candidate(item: dict, feeds_config: dict) -> tuple[float, list[str]]:
    """Heuristic relevance score. Returns (score, reasons list)."""
    score = 0.0
    reasons = []

    title = (item.get('title') or '').lower()
    description = (item.get('description') or '').lower()
    url = item.get('url', '')
    author = (item.get('author') or '').lower()
    domain = get_domain(url)

    # Score title and description separately — title keywords are worth more
    # and domain bonus requires title-level signal, not just description noise.
    # Short keywords (r'\bX\b') use pre-compiled regex; others use substring.
    def _kw_match(kw: str, text: str) -> bool:
        if kw in _BOUNDARY_KW_RE:
            return bool(_BOUNDARY_KW_RE[kw].search(text))
        return kw in text

    title_kw_hits, title_kw_names = 0, []
    for kw, pts in TITLE_KEYWORDS.items():
        if _kw_match(kw, title):
            title_kw_hits += pts
            title_kw_names.append(kw.strip(r'\b'))
    title_kw_hits = min(title_kw_hits, 5)

    desc_kw_hits, desc_kw_names = 0, []
    for kw, pts in TITLE_KEYWORDS.items():
        if _kw_match(kw, description) and not _kw_match(kw, title):
            desc_kw_hits += round(pts * 0.5)  # half value from description only
            desc_kw_names.append(kw.strip(r'\b'))
    desc_kw_hits = min(desc_kw_hits, 3)

    total_kw = title_kw_hits + desc_kw_hits
    if total_kw > 0:
        score += total_kw
        all_kw = title_kw_names[:3] + [f"({k})" for k in desc_kw_names[:2]]
        reasons.append(f"keywords ({', '.join(all_kw)}) +{total_kw}")

    # Domain authority — requires title keyword signal (not just description)
    high_auth = feeds_config.get('high_authority_domains', [])
    if domain in high_auth and title_kw_hits >= 2:
        rank = high_auth.index(domain)
        pts = 3 if rank < 5 else 2
        score += pts
        reasons.append(f"trusted domain +{pts}")

    # Negative signals
    full_text = f"{title} {description}"
    for neg in NEGATIVE_SIGNALS:
        if neg in full_text:
            score -= 2
            reasons.append(f"noise ({neg!r}) -2")
            break

    # Known practitioner bonus
    for name in feeds_config.get('practitioner_names', []):
        if name.lower() in full_text or name.lower() in author:
            score += 2
            reasons.append(f"practitioner ({name}) +2")
            break

    # Generic podcast episode with no title technique keywords → reject
    # Catches "WCA #590 with Phillip Broussard", "RSR Ep 220: Guest" etc.
    generic_pod = re.search(r'\b(WCA|RSR|ep\.?|episode)\s*#?\d+', title, re.I)
    if generic_pod and title_kw_hits == 0:
        score -= 4
        reasons.append("generic podcast episode title, no technique signal -4")

    return score, reasons


def detect_content_type(item: dict) -> str:
    text = f"{item.get('title', '')} {item.get('url', '')}".lower()
    for ctype, signals in CONTENT_TYPE_MAP.items():
        if ctype == 'article':
            continue
        if any(s in text for s in signals):
            return ctype
    return 'article'


def detect_disciplines(item: dict) -> list[str]:
    text = f"{item.get('title', '')} {item.get('description', '')}".lower()
    tags = []
    if any(w in text for w in ['bass', '808', 'sub', 'reese', 'low end', 'di bass', 'bass guitar']):
        tags.append('bass')
    if any(w in text for w in ['drum', 'kick', 'snare', 'groove', 'hi-hat', 'percussion', 'pocket']):
        tags.append('drums')
    if any(w in text for w in ['mix', 'mastering', 'bus', 'stem', 'compression', 'eq', 'sidechain']):
        tags.append('mixing')
    if any(w in text for w in ['arrangement', 'arrange', 'song structure', 'composition']):
        tags.append('arrangement')
    return tags if tags else ['general']


# ---------------------------------------------------------------------------
# Deduplication
# ---------------------------------------------------------------------------

def get_known_urls() -> set[str]:
    """All URLs already seen in sources or candidates tables.

    Paginates in 1000-row batches — Supabase default limit is 1000, so a
    single .execute() silently truncates larger tables.
    """
    known: set[str] = set()

    def _fetch_all(table: str, col: str = 'url') -> None:
        offset = 0
        while True:
            rows = (
                supabase.table(table)
                .select(col)
                .range(offset, offset + 999)
                .execute()
                .data or []
            )
            for row in rows:
                if row.get(col):
                    known.add(normalize_url(row[col]))
            if len(rows) < 1000:
                break
            offset += 1000

    _fetch_all("kp_sources")
    _fetch_all("kp_discovery_candidates")
    return known


def normalize_url(url: str) -> str:
    return url.rstrip('/').lower()


# ---------------------------------------------------------------------------
# Layer 1: RSS feeds
# ---------------------------------------------------------------------------

def run_rss_layer(feeds_config: dict, known_urls: set) -> list[dict]:
    if not HAS_FEEDPARSER:
        console.print("[yellow]  feedparser not installed — skipping RSS (pip install feedparser)[/]")
        return []

    candidates = []
    feeds = feeds_config.get('rss_feeds', [])
    console.print(f"    Checking {len(feeds)} feeds…")

    for feed_def in feeds:
        try:
            parsed = feedparser.parse(feed_def['url'])
            new_count = 0
            for entry in parsed.entries[:30]:
                url = entry.get('link', '')
                if not url or normalize_url(url) in known_urls:
                    continue
                candidates.append({
                    'url': url,
                    'title': entry.get('title', ''),
                    'description': entry.get('summary', '')[:500],
                    'author': entry.get('author', feed_def.get('name', '')),
                    'source_name': feed_def['name'],
                    'source_layer': 'rss',
                })
                new_count += 1
            console.print(f"      {feed_def['name']}: {new_count} new items")
        except Exception as e:
            console.print(f"      [yellow]{feed_def['name']}: error — {e}[/]")

    return candidates


# ---------------------------------------------------------------------------
# Layer 1b: YouTube channel recent videos (via yt-dlp)
# ---------------------------------------------------------------------------

def run_youtube_layer(feeds_config: dict, known_urls: set) -> list[dict]:
    candidates = []
    channels = feeds_config.get('youtube_channels', [])
    console.print(f"    Checking {len(channels)} YouTube channels via yt-dlp…")

    for ch in channels:
        try:
            result = subprocess.run(
                [
                    "yt-dlp", "--flat-playlist", "--playlist-items", "1-15",
                    "--print", "%(title)s\t%(webpage_url)s\t%(uploader)s\t%(description)s",
                    "--no-warnings", ch['url'],
                ],
                capture_output=True, text=True, timeout=30,
            )
            new_count = 0
            for line in result.stdout.strip().splitlines():
                parts = line.split('\t')
                if len(parts) < 2:
                    continue
                title = parts[0]
                url = parts[1]
                uploader = parts[2] if len(parts) > 2 else ch['name']
                description = parts[3][:300] if len(parts) > 3 else ''
                if not url or normalize_url(url) in known_urls:
                    continue
                candidates.append({
                    'url': url,
                    'title': title,
                    'description': description,
                    'author': uploader,
                    'source_name': ch['name'],
                    'source_layer': 'rss',  # grouped with RSS as "known sources"
                })
                new_count += 1
            console.print(f"      {ch['name']}: {new_count} new videos")
        except FileNotFoundError:
            console.print("      [yellow]yt-dlp not found — skipping YouTube channels[/]")
            break
        except Exception as e:
            console.print(f"      [yellow]{ch['name']}: error — {e}[/]")

    return candidates


# ---------------------------------------------------------------------------
# Layer 2: Topic searches (DuckDuckGo)
# ---------------------------------------------------------------------------

def run_search_layer(topics_config: dict, known_urls: set) -> list[dict]:
    if not HAS_DDGS:
        console.print("[yellow]  duckduckgo-search not installed — skipping search (pip install duckduckgo-search)[/]")
        return []

    candidates = []
    topics = topics_config.get('topics', [])
    console.print(f"    Running {len(topics)} topic searches…")

    try:
        with DDGS() as ddgs:
            for topic in topics:
                try:
                    results = ddgs.text(topic['query'], max_results=8)
                    new_count = 0
                    for r in (results or []):
                        url = r.get('href', '')
                        if not url or normalize_url(url) in known_urls:
                            continue
                        candidates.append({
                            'url': url,
                            'title': r.get('title', ''),
                            'description': r.get('body', '')[:500],
                            'author': '',
                            'source_name': f"search:{topic.get('label', topic['query'][:40])}",
                            'source_layer': 'search',
                        })
                        new_count += 1
                    console.print(f"      {topic['label']}: {new_count} new results")
                except Exception as e:
                    console.print(f"      [yellow]{topic.get('label', '?')}: error — {e}[/]")
    except Exception as e:
        console.print(f"    [yellow]Search layer error: {e}[/]")

    return candidates


# ---------------------------------------------------------------------------
# Layer 3: Link extraction from processed sources
# ---------------------------------------------------------------------------

def run_links_layer(feeds_config: dict, known_urls: set) -> list[dict]:
    high_auth = set(feeds_config.get('high_authority_domains', []))

    # Get all processed sources with raw text
    rows = supabase.table("kp_sources").select("url, raw_text, title").eq("status", "extracted").execute().data or []
    console.print(f"    Scanning {len(rows)} processed sources for outbound links…")

    candidates = []
    seen_links: set[str] = set()

    for source in rows:
        raw = source.get('raw_text', '')
        if not raw:
            continue

        # Extract all https URLs from raw text
        found_urls = re.findall(r'https?://[^\s\'"<>()]+', raw)
        for url in found_urls:
            url = url.rstrip('.,;)')
            norm = normalize_url(url)
            if norm in known_urls or norm in seen_links:
                continue
            domain = get_domain(url)
            if domain not in high_auth:
                continue
            # Skip non-article URLs (images, search pages, homepages)
            path = urlparse(url).path
            if not path or path in ('/', '') or path.endswith(('.jpg', '.png', '.gif', '.pdf', '.mp3')):
                continue

            seen_links.add(norm)
            candidates.append({
                'url': url,
                'title': '',
                'description': f"Link found in: {source.get('title', source['url'])[:60]}",
                'author': '',
                'source_name': f"link from: {source.get('title', '')[:40]}",
                'source_layer': 'links',
            })

    console.print(f"    Found {len(candidates)} candidate links on trusted domains")
    return candidates


# ---------------------------------------------------------------------------
# Save to Supabase
# ---------------------------------------------------------------------------

def save_candidates(scored: list[dict]) -> int:
    """Save scored candidates to Supabase.

    Writes the generated UUID back to each item dict so callers (e.g.
    approve_interactive) can reference item['id'] without a re-fetch.
    Uses upsert on URL to avoid uniqueness conflicts on repeated runs.
    """
    rows = []
    for item in scored:
        row_id = str(uuid.uuid4())
        item['id'] = row_id  # write back so approve_interactive can use it
        rows.append({
            'id': row_id,
            'url': item['url'],
            'title': item.get('title', '')[:400],
            'description': item.get('description', '')[:500],
            'author': item.get('author', '')[:200],
            'source_name': item.get('source_name', '')[:200],
            'source_layer': item.get('source_layer', 'search'),
            'relevance_score': item.get('score', 0),
            'relevance_reasons': json.dumps(item.get('reasons', [])),
            'discipline_tags': item.get('discipline_tags', []),
            'content_type': item.get('content_type', 'article'),
            'status': 'pending',
        })
    if rows:
        # Upsert on url — safe to re-run without uniqueness crashes
        supabase.table("kp_discovery_candidates").upsert(
            rows, on_conflict="url", ignore_duplicates=True
        ).execute()
    return len(rows)


# ---------------------------------------------------------------------------
# Approval CLI
# ---------------------------------------------------------------------------

def render_candidate(item: dict, idx: int, total: int) -> Panel:
    score = item.get('relevance_score', item.get('score', 0))
    color = 'green' if score >= 5 else 'yellow' if score >= 3 else 'red'
    reasons = item.get('relevance_reasons') or item.get('reasons', [])
    if isinstance(reasons, str):
        try:
            reasons = json.loads(reasons)
        except Exception:
            reasons = [reasons]
    lines = [
        f"[bold]{item.get('title') or '(no title)'}[/]",
        f"[dim]{item.get('url', '')}[/]",
        f"[dim]Author: {item.get('author') or '—'}  |  Layer: {item.get('source_layer', '?')}  |  Via: {item.get('source_name', '?')}[/]",
        f"Disciplines: [cyan]{', '.join(item.get('discipline_tags') or ['?'])}[/]  Type: {item.get('content_type', '?')}",
        f"Score: [{color}]{score:.1f}[/]  Reasons: {', '.join(reasons)[:100]}",
    ]
    if item.get('description'):
        lines.append(f"\n[dim]{item['description'][:250]}…[/]")
    return Panel('\n'.join(lines), title=f"[bold]{idx}/{total}[/]", border_style=color)


def ingest_approved(item: dict):
    """Shell out to ingest.py for the approved candidate."""
    content_type = item.get('content_type', 'article')
    # Map our content types to ingest.py --type choices
    type_map = {'video': 'video', 'podcast': 'podcast', 'article': 'article', 'interview': 'article'}
    ingest_type = type_map.get(content_type, 'article')

    cmd = [
        sys.executable,
        str(PIPELINE_DIR / "ingest.py"),
        "--url", item['url'],
        "--type", ingest_type,
        "--title", item.get('title') or item['url'][:100],
        "--author", item.get('author') or '',
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode == 0:
        console.print(f"  [green]✓ Ingested[/]")
        # Print ingest output — contains the source_id needed for extraction
        if result.stdout.strip():
            console.print(result.stdout.strip())
        supabase.table("kp_discovery_candidates").update({
            "status": "ingested",
            "processed_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", item["id"]).execute()
    else:
        err = (result.stderr or result.stdout or 'unknown error').strip()[:300]
        console.print(f"  [red]Ingest failed:[/] {err}")


def approve_interactive(candidates: list[dict]) -> tuple[int, int]:
    approved = rejected = skipped = 0
    for i, item in enumerate(candidates, 1):
        console.clear()
        console.print(render_candidate(item, i, len(candidates)))
        while True:
            choice = input("\n[A]pprove + ingest  [R]eject  [S]kip  [Q]uit: ").lower().strip()
            if choice == 'a':
                ingest_approved(item)
                approved += 1
                break
            elif choice == 'r':
                supabase.table("kp_discovery_candidates").update({
                    "status": "rejected",
                    "processed_at": datetime.now(timezone.utc).isoformat(),
                }).eq("id", item["id"]).execute()
                rejected += 1
                break
            elif choice == 's':
                skipped += 1
                break
            elif choice == 'q':
                console.print(f"\nSession ended. {approved} approved, {rejected} rejected, {skipped} skipped.")
                return approved, rejected
            else:
                console.print("Enter A, R, S, or Q.")
    console.print(f"\n[bold green]Done.[/] {approved} approved, {rejected} rejected, {skipped} skipped.")
    return approved, rejected


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Discover new knowledge sources.")
    parser.add_argument("--layer", choices=["rss", "youtube", "search", "links", "all"], default="all",
                        help="Which discovery layer to run (default: all)")
    parser.add_argument("--approve", action="store_true",
                        help="Launch interactive approval after discovery")
    parser.add_argument("--pending", action="store_true",
                        help="Skip discovery — just review existing pending candidates")
    parser.add_argument("--min-score", type=float, default=3.0,
                        help="Minimum relevance score to save (default: 3.0)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show candidates without saving to Supabase")
    args = parser.parse_args()

    feeds_config = load_feeds_config()
    topics_config = load_topics_config()

    # --- Pending-only mode ---
    if args.pending:
        result = supabase.table("kp_discovery_candidates").select("*").eq("status", "pending").order(
            "relevance_score", desc=True
        ).execute()
        pending = result.data or []
        if not pending:
            console.print("[green]No pending candidates.[/]")
            return
        console.print(f"\n[bold]{len(pending)} pending candidates to review[/]\n")
        approve_interactive(pending)
        return

    # --- Discovery run ---
    console.print(f"\n[bold]Discovery run — {datetime.now().strftime('%Y-%m-%d %H:%M')}[/]")
    known_urls = get_known_urls()
    console.print(f"  {len(known_urls)} URLs already in pipeline\n")

    raw_candidates: list[dict] = []

    if args.layer in ("rss", "all"):
        console.print("[bold]Layer 1 — RSS feeds[/]")
        raw_candidates.extend(run_rss_layer(feeds_config, known_urls))

    if args.layer in ("youtube", "all"):
        console.print("[bold]Layer 1b — YouTube channels[/]")
        raw_candidates.extend(run_youtube_layer(feeds_config, known_urls))

    if args.layer in ("search", "all"):
        console.print("\n[bold]Layer 2 — Topic searches[/]")
        raw_candidates.extend(run_search_layer(topics_config, known_urls))

    if args.layer in ("links", "all"):
        console.print("\n[bold]Layer 3 — Link extraction[/]")
        raw_candidates.extend(run_links_layer(feeds_config, known_urls))

    # Deduplicate within this run
    seen: set[str] = set()
    deduped: list[dict] = []
    for item in raw_candidates:
        key = normalize_url(item['url'])
        if key not in seen:
            seen.add(key)
            deduped.append(item)

    # Score and tag
    scored: list[dict] = []
    for item in deduped:
        score, reasons = score_candidate(item, feeds_config)
        item.update({
            'score': score,
            'reasons': reasons,
            'relevance_score': score,
            'relevance_reasons': reasons,
            'content_type': detect_content_type(item),
            'discipline_tags': detect_disciplines(item),
        })
        if score >= args.min_score:
            scored.append(item)

    scored.sort(key=lambda x: x['score'], reverse=True)

    console.print(
        f"\n  {len(raw_candidates)} raw  →  {len(deduped)} deduped  →  "
        f"[bold]{len(scored)} above threshold[/] (min score {args.min_score})"
    )

    if not scored:
        console.print("\n[yellow]No candidates above threshold.[/]")
        console.print("  Try: --min-score 1.0  or  --layer search  to see what's coming in")
        return

    # Print digest — plain lines so terminal width doesn't mangle it
    console.print(f"\n[bold]Discovery Digest — {len(scored)} candidates[/] (top 30 shown)\n")
    for item in scored[:30]:
        sc = item.get('score', 0)
        color = 'green' if sc >= 6 else 'yellow' if sc >= 4 else 'dim'
        disc = ', '.join(item.get('discipline_tags', ['?']))
        layer = item.get('source_layer', '?')
        label = (item.get('title') or item['url'])[:65]
        via = item.get('source_name', '')[:25]
        console.print(f"  [{color}]{sc:4.1f}[/{color}]  [{layer[:6]:<6}]  [{disc:<20}]  {label}  [dim]({via})[/]")

    if args.dry_run:
        console.print("\n[dim]Dry run — nothing saved.[/]")
        return

    saved = save_candidates(scored)
    console.print(f"\n  Saved {saved} candidates → Supabase kp_discovery_candidates")
    console.print(f"  Review: [bold]python3 pipeline/discover.py --pending --approve[/]")

    if args.approve:
        console.print()
        approve_interactive(scored)


if __name__ == "__main__":
    main()
