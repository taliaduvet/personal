#!/usr/bin/env python3
"""
Scout test — connectivity check per Test Pilot Protocol.
Verifies Gmail API, Supabase, and Gemini API before building the main agent.
Run: python scout_test.py
"""
import os
import sys
from pathlib import Path

# Add agent dir to path
sys.path.insert(0, str(Path(__file__).parent))

# Load .env
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / '.env')
except ImportError:
    pass

def check_env():
    """Check required env vars."""
    required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'GEMINI_API_KEY', 'PARKING_LOT_PAIR_ID']
    missing = [k for k in required if not os.getenv(k)]
    if missing:
        print(f"Missing env vars: {', '.join(missing)}")
        print("Copy .env.example to .env and fill in values.")
        return False
    return True

def check_gmail():
    """Verify Gmail API connectivity."""
    try:
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
        from googleapiclient.discovery import build

        refresh_token = os.getenv('GMAIL_REFRESH_TOKEN')
        client_id = os.getenv('GMAIL_CLIENT_ID')
        client_secret = os.getenv('GMAIL_CLIENT_SECRET')

        if not all([refresh_token, client_id, client_secret]):
            creds_path = Path(__file__).parent / 'credentials.json'
            if creds_path.exists():
                import json
                with open(creds_path) as f:
                    creds_data = json.load(f)
                    client_id = creds_data.get('installed', creds_data.get('web', {})).get('client_id')
                    client_secret = creds_data.get('installed', creds_data.get('web', {})).get('client_secret')
            if not refresh_token:
                print("Gmail: GMAIL_REFRESH_TOKEN not set. Run OAuth flow first (python -c \"from triage import run_oauth; run_oauth()\")")
                return False
            if not client_id or not client_secret:
                print("Gmail: credentials.json missing or invalid. Download from Google Cloud Console.")
                return False

        creds = Credentials(
            token=None,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=client_id,
            client_secret=client_secret
        )
        creds.refresh(Request())
        service = build('gmail', 'v1', credentials=creds)
        profile = service.users().getProfile(userId='me').execute()
        print(f"Gmail: OK (connected as {profile.get('emailAddress', '?')})")
        return True
    except Exception as e:
        print(f"Gmail: FAIL — {e}")
        return False

def check_supabase():
    """Verify Supabase connectivity."""
    try:
        from supabase import create_client
        url = os.getenv('SUPABASE_URL')
        key = os.getenv('SUPABASE_ANON_KEY')
        client = create_client(url, key)
        # Try talk_about (existing table) or agent_runs
        try:
            client.table('agent_runs').select('id').limit(1).execute()
        except Exception:
            client.table('talk_about').select('id').limit(1).execute()
        print("Supabase: OK")
        return True
    except Exception as e:
        print(f"Supabase: FAIL — {e}")
        return False

def check_gemini():
    """Verify Gemini API connectivity."""
    try:
        import google.generativeai as genai
        genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
        model = genai.GenerativeModel('gemini-2.5-flash-lite')
        response = model.generate_content("Reply with exactly: OK")
        if response and response.text:
            print("Gemini: OK")
            return True
        print("Gemini: FAIL — no response")
        return False
    except Exception as e:
        print(f"Gemini: FAIL — {e}")
        return False

def main():
    print("Scout test — connectivity check\n")
    if not check_env():
        sys.exit(1)
    results = [check_gmail(), check_supabase(), check_gemini()]
    if all(results):
        print("\nAll checks passed. Safe to proceed with main build.")
    else:
        print("\nSome checks failed. Fix before building.")
        sys.exit(1)

if __name__ == '__main__':
    main()
