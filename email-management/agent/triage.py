#!/usr/bin/env python3
"""
Email Triage Agent — reads Gmail, extracts tasks into parking lot, drafts replies.
Run: python triage.py [--dry-run]
"""
import argparse
import base64
import json
import os
import re
import sys
import time
from pathlib import Path
from email.utils import parsedate_to_datetime, parseaddr

# Load .env if present
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / '.env')
except ImportError:
    pass

SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.compose',
    'https://www.googleapis.com/auth/gmail.modify',
]
MAX_EMAILS_PER_RUN = 25
BATCH_SIZE = 3
TOKEN_LIMIT = 4000
VALID_CATEGORIES_GENERIC = ['work', 'hobbies', 'life', 'other']
VALID_CATEGORIES_CREATIVE = ['misfit', 'stop2030barclay', 'cycles', 'life']


def get_gmail_creds():
    """Build Gmail credentials from env or credentials.json."""
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request

    refresh_token = os.getenv('GMAIL_REFRESH_TOKEN')
    client_id = os.getenv('GMAIL_CLIENT_ID')
    client_secret = os.getenv('GMAIL_CLIENT_SECRET')

    if not refresh_token:
        raise ValueError("GMAIL_REFRESH_TOKEN not set. Run OAuth flow: python -c \"from triage import run_oauth; run_oauth()\"")

    creds_path = Path(__file__).parent / 'credentials.json'
    if (not client_id or not client_secret) and creds_path.exists():
        with open(creds_path) as f:
            data = json.load(f)
            cfg = data.get('installed', data.get('web', {}))
            client_id = client_id or cfg.get('client_id')
            client_secret = client_secret or cfg.get('client_secret')

    if not client_id or not client_secret:
        raise ValueError("Need GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET, or credentials.json")

    creds = Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=client_id,
        client_secret=client_secret,
    )
    creds.refresh(Request())
    return creds


def run_oauth():
    """One-time OAuth flow to get refresh token."""
    from google_auth_oauthlib.flow import InstalledAppFlow

    creds_path = Path(__file__).parent / 'credentials.json'
    if not creds_path.exists():
        print("Download credentials.json from Google Cloud Console and place in", creds_path)
        return
    flow = InstalledAppFlow.from_client_secrets_file(str(creds_path), SCOPES)
    creds = flow.run_local_server(port=8080, open_browser=True)
    print("\nAdd to .env:")
    print(f"GMAIL_REFRESH_TOKEN={creds.refresh_token}")
    return creds


def get_or_create_triaged_label(service):
    """Create Triaged label if missing, return label ID."""
    labels = service.users().labels().list(userId='me').execute()
    for lbl in labels.get('labels', []):
        if lbl.get('name') == 'Triaged':
            return lbl['id']
    new = service.users().labels().create(
        userId='me',
        body={
            'name': 'Triaged',
            'messageListVisibility': 'show',
            'labelListVisibility': 'labelShow',
        },
    ).execute()
    return new['id']


def decode_body(payload):
    """Extract plain text from Gmail message payload."""
    parts = []
    if payload.get('body', {}).get('data'):
        raw = payload['body']['data']
        decoded = base64.urlsafe_b64decode(raw + '==')
        try:
            return decoded.decode('utf-8', errors='replace')
        except Exception:
            return decoded.decode('latin-1', errors='replace')

    for part in payload.get('parts', []):
        mime = part.get('mimeType', '')
        if 'text/plain' in mime and part.get('body', {}).get('data'):
            raw = part['body']['data']
            decoded = base64.urlsafe_b64decode(raw + '==')
            try:
                parts.append(decoded.decode('utf-8', errors='replace'))
            except Exception:
                parts.append(decoded.decode('latin-1', errors='replace'))
        elif 'text/html' in mime and part.get('body', {}).get('data') and not any('text/plain' in p.get('mimeType', '') for p in payload.get('parts', [])):
            raw = part['body']['data']
            decoded = base64.urlsafe_b64decode(raw + '==')
            try:
                html = decoded.decode('utf-8', errors='replace')
            except Exception:
                html = decoded.decode('latin-1', errors='replace')
            try:
                from bs4 import BeautifulSoup
                parts.append(BeautifulSoup(html, 'html.parser').get_text(separator=' ', strip=True))
            except Exception:
                parts.append(re.sub(r'<[^>]+>', ' ', html))

    return ' '.join(parts).strip() if parts else ''


def strip_html_and_truncate(text):
    """Strip HTML, normalize, truncate to ~TOKEN_LIMIT chars."""
    try:
        from bs4 import BeautifulSoup
        text = BeautifulSoup(text, 'html.parser').get_text(separator=' ', strip=True)
    except Exception:
        text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    if len(text) > TOKEN_LIMIT * 4:
        text = text[:TOKEN_LIMIT * 4] + '...'
    return text


def should_skip_email(msg, service):
    """Pre-filter: skip newsletters, no-reply, receipts."""
    headers = {h['name'].lower(): h['value'] for h in msg.get('payload', {}).get('headers', [])}
    if 'list-unsubscribe' in headers:
        return True
    from_addr = (headers.get('from') or '').lower()
    if 'noreply' in from_addr or 'no-reply' in from_addr or 'donotreply' in from_addr:
        return True
    subj = (headers.get('subject') or '').lower()
    if any(x in subj for x in ['receipt', 'order confirmed', 'shipped', 'delivery']):
        return True
    return False


def extract_tasks_with_gemini(emails_batch, category_preset):
    """Call Gemini to extract tasks and draft replies. Returns list of results."""
    import google.generativeai as genai
    genai.configure(api_key=os.getenv('GEMINI_API_KEY'))

    categories = VALID_CATEGORIES_CREATIVE if category_preset == 'creative' else VALID_CATEGORIES_GENERIC
    cat_str = ', '.join(categories)

    prompt_parts = []
    for i, (subj, body) in enumerate(emails_batch):
        prompt_parts.append(f"--- Email {i} ---\nSubject: {subj}\nBody:\n{body[:8000]}\n")

    system = f"""You extract actionable tasks from emails and draft polite replies.
Categories (use exactly): {cat_str}
Return JSON only. For each email, output:
- is_actionable: true only if there is a clear task the recipient should do (e.g. send something, reply, schedule, complete work). False for newsletters, FYI, social niceties.
- tasks: array of {{"text": "short task desc", "category": "one of {cat_str}", "deadline": "YYYY-MM-DD" or null, "priority": "critical|high|medium|low"}}
- needsReply: true if a reply is appropriate
- draftReply: polite, warm, boundary-respecting reply (no over-apologizing). Empty string if needsReply false.

Examples of NOT actionable: "See you tomorrow", "Thanks for the update", newsletter content.
Examples of actionable: "Can you send the invoice by Friday?", "Please review the contract", "Let me know when you're free to meet."

Return JSON: {{"results": [{{"email_index": 0, "is_actionable": bool, "tasks": [...], "needsReply": bool, "draftReply": "..."}}, ...]}}"""

    user = "Extract tasks and draft replies for these emails:\n\n" + "\n".join(prompt_parts)

    model = genai.GenerativeModel(
        'gemini-2.5-flash-lite',  # Best free tier: 15 RPM, 1000 RPD
        generation_config=genai.GenerationConfig(
            response_mime_type="application/json",
            temperature=0.2,
        ),
    )
    response = model.generate_content(system + "\n\n" + user)
    text = (response.text or '').strip()
    try:
        data = json.loads(text)
        return data.get('results', [])
    except json.JSONDecodeError:
        return []


def validate_category(cat, preset):
    valid = VALID_CATEGORIES_CREATIVE if preset == 'creative' else VALID_CATEGORIES_GENERIC
    return cat if cat in valid else (valid[0] if valid else 'other')


def main(dry_run=False):
    pair_id = os.getenv('PARKING_LOT_PAIR_ID', 'solo_default')
    added_by = os.getenv('PARKING_LOT_ADDED_BY', 'Talia')
    category_preset = os.getenv('PARKING_LOT_CATEGORY_PRESET', 'generic')

    creds = get_gmail_creds()
    from googleapiclient.discovery import build
    service = build('gmail', 'v1', credentials=creds)

    triaged_id = get_or_create_triaged_label(service) if not dry_run else None

    # Unread Primary tab only (exclude Triaged, Updates, Social, Promotions), newest first, cap
    q = "is:unread -label:Triaged category:primary"
    results = service.users().messages().list(userId='me', q=q, maxResults=MAX_EMAILS_PER_RUN).execute()
    msg_ids = results.get('messages', [])
    total_est = results.get('resultSizeEstimate', len(msg_ids))
    if not msg_ids:
        print("No unread emails to triage.")
        if total_est and total_est > 0:
            print("(Gmail reports unread — they may all have the Triaged label. Remove it to reprocess.)")
        return

    # Group by thread, take latest per thread
    threads_seen = set()
    to_process = []
    for m in msg_ids:
        msg = service.users().messages().get(userId='me', id=m['id'], format='full').execute()
        tid = msg.get('threadId')
        if tid in threads_seen:
            continue
        threads_seen.add(tid)
        if should_skip_email(msg, service):
            continue
        headers = {h['name'].lower(): h['value'] for h in msg.get('payload', {}).get('headers', [])}
        subj = headers.get('subject', '(no subject)')
        body = strip_html_and_truncate(decode_body(msg.get('payload', {})))
        to_process.append({
            'id': msg['id'],
            'thread_id': tid,
            'subject': subj,
            'body': body,
            'raw': msg,
        })

    if not to_process:
        print("No emails to process after filtering (newsletters, no-reply, receipts are skipped).")
        print(f"  Fetched {len(msg_ids)} unread, all filtered out.")
        return

    if dry_run:
        print(f"DRY RUN: Would process {len(to_process)} emails (of {len(msg_ids)} unread, {len(msg_ids) - len(to_process)} filtered)")
        for e in to_process[:5]:
            print(f"  - {e['subject'][:60]}...")
        if len(to_process) > 5:
            print(f"  ... and {len(to_process) - 5} more")
        return

    from supabase import create_client
    supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_ANON_KEY'))

    # Get already processed
    processed = set()
    try:
        rows = supabase.table('processed_emails').select('email_id').execute()
        processed = {r['email_id'] for r in (rows.data or [])}
    except Exception:
        pass

    emails_processed = 0
    tasks_created = 0
    last_error = None

    for batch_start in range(0, len(to_process), BATCH_SIZE):
        batch = to_process[batch_start:batch_start + BATCH_SIZE]
        batch_data = [(e['subject'], e['body']) for e in batch]

        results = extract_tasks_with_gemini(batch_data, category_preset)
        if not results:
            continue

        for i, res in enumerate(results):
            if i >= len(batch):
                break
            email_info = batch[i]
            eid = email_info['id']
            if eid in processed:
                continue

            is_actionable = res.get('is_actionable', False)
            tasks = res.get('tasks', [])
            needs_reply = res.get('needsReply', False)
            draft_reply = res.get('draftReply', '')

            # Ensure reply-needed emails get a task even if Gemini didn't mark them actionable
            if needs_reply and draft_reply and not (is_actionable and tasks):
                tasks = [{'text': f"Reply to: {email_info['subject'][:80]}", 'category': 'life', 'deadline': None, 'priority': 'medium'}]

            if tasks:
                for t in tasks:
                    cat = validate_category(t.get('category', 'other'), category_preset)
                    supabase.table('email_tasks').insert({
                        'pair_id': pair_id,
                        'added_by': added_by,
                        'thread_id': email_info['thread_id'],
                        'email_id': eid,
                        'subject': email_info['subject'],
                        'text': (t.get('text') or 'Task')[:500],
                        'category': cat,
                        'deadline': t.get('deadline'),
                        'priority': (t.get('priority') or 'medium')[:20],
                        'draft_reply': draft_reply[:5000] if needs_reply else None,
                    }).execute()
                    tasks_created += 1

            if needs_reply and draft_reply:
                try:
                    from email.mime.text import MIMEText
                    headers = {h['name'].lower(): h['value'] for h in email_info['raw'].get('payload', {}).get('headers', [])}
                    to_raw = headers.get('reply-to') or headers.get('from', '')
                    to_addr = parseaddr(to_raw)[1] or to_raw
                    subj = headers.get('subject', '')
                    if subj and not subj.lower().startswith('re:'):
                        subj = 'Re: ' + subj
                    msg_id = headers.get('message-id', '')
                    msg = MIMEText(draft_reply, 'plain', 'utf-8')
                    msg['To'] = to_addr
                    msg['Subject'] = subj
                    if msg_id:
                        msg['In-Reply-To'] = msg_id
                        msg['References'] = msg_id
                    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
                    service.users().drafts().create(
                        userId='me',
                        body={
                            'message': {
                                'raw': raw,
                                'threadId': email_info['thread_id'],
                            },
                        },
                    ).execute()
                except Exception as ex:
                    last_error = str(ex)

            supabase.table('processed_emails').insert({'email_id': eid}).execute()
            service.users().messages().modify(
                userId='me',
                id=eid,
                body={'addLabelIds': [triaged_id]},
            ).execute()
            emails_processed += 1

        time.sleep(1.5)

    status = 'success' if not last_error else 'partial'
    try:
        supabase.table('agent_runs').insert({
            'pair_id': pair_id,
            'added_by': added_by,
            'status': status,
            'emails_processed': emails_processed,
            'tasks_created': tasks_created,
            'error_message': last_error,
        }).execute()
    except Exception as e:
        print(f"Could not log agent_runs: {e}")

    print(f"Done. Processed {emails_processed} emails, created {tasks_created} tasks.")
    if last_error:
        print(f"Note: {last_error}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--dry-run', action='store_true', help='Fetch and analyze only, no writes')
    args = parser.parse_args()
    main(dry_run=args.dry_run)
