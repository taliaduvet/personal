#!/usr/bin/env python3
"""
Gmail-only diagnostic — no Supabase or Gemini required.
Verifies Gmail connectivity and prints unread count for the triage query.
Run: python gmail_check.py
"""
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / '.env')
except ImportError:
    pass


def main():
    try:
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
        from googleapiclient.discovery import build
    except ImportError:
        print("Install: pip install google-auth google-auth-oauthlib google-api-python-client")
        sys.exit(1)

    refresh_token = os.getenv('GMAIL_REFRESH_TOKEN')
    client_id = os.getenv('GMAIL_CLIENT_ID')
    client_secret = os.getenv('GMAIL_CLIENT_SECRET')

    if not refresh_token:
        print("GMAIL_REFRESH_TOKEN not set. Run: python -c \"from triage import run_oauth; run_oauth()\"")
        sys.exit(1)

    creds_path = Path(__file__).parent / 'credentials.json'
    if (not client_id or not client_secret) and creds_path.exists():
        with open(creds_path) as f:
            data = json.load(f)
            cfg = data.get('installed', data.get('web', {}))
            client_id = client_id or cfg.get('client_id')
            client_secret = client_secret or cfg.get('client_secret')

    if not client_id or not client_secret:
        print("Need GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET, or credentials.json")
        sys.exit(1)

    creds = Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=client_id,
        client_secret=client_secret,
    )
    creds.refresh(Request())
    service = build('gmail', 'v1', credentials=creds)

    profile = service.users().getProfile(userId='me').execute()
    email = profile.get('emailAddress', '?')

    q = "is:unread -label:Triaged category:primary"
    r = service.users().messages().list(userId='me', q=q, maxResults=1).execute()
    total = r.get('resultSizeEstimate', 0)

    print(f"Gmail: OK (connected as {email})")
    print(f"Unread in Primary tab (excl. Triaged): {total}")
    print("Run triage.py --dry-run to see what would be processed.")


if __name__ == '__main__':
    main()
