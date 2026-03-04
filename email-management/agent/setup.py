#!/usr/bin/env python3
"""
Guided setup for the Email Triage Agent.
Checks .env, runs OAuth flow if needed, prompts for Supabase migration.
"""
import os
import sys
from pathlib import Path

# Load .env
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / '.env')
except ImportError:
    pass

def main():
    env_path = Path(__file__).parent / '.env'
    env_example = Path(__file__).parent / '.env.example'
    creds_path = Path(__file__).parent / 'credentials.json'

    print("Email Triage Agent — Setup\n")

    # 1. Check .env
    if not env_path.exists():
        print("1. .env not found.")
        if env_example.exists():
            import shutil
            shutil.copy(env_example, env_path)
            print("   Created .env from .env.example. Edit it with your values.")
        else:
            print("   Create .env with: SUPABASE_URL, SUPABASE_ANON_KEY, GEMINI_API_KEY, PARKING_LOT_PAIR_ID")
        print()
    else:
        print("1. .env exists")

    # 2. Check credentials.json
    if not creds_path.exists():
        print("2. credentials.json not found.")
        print("   Download from Google Cloud Console → APIs & Services → Credentials → Create OAuth 2.0 Client ID (Desktop)")
        print("   Save as: " + str(creds_path))
        print()
    else:
        print("2. credentials.json exists")

    # 3. OAuth
    if not os.getenv('GMAIL_REFRESH_TOKEN'):
        print("3. GMAIL_REFRESH_TOKEN not set.")
        if creds_path.exists():
            resp = input("   Run OAuth flow now? (y/n): ").strip().lower()
            if resp == 'y':
                from triage import run_oauth
                run_oauth()
                print("\n   Add GMAIL_REFRESH_TOKEN to .env and run setup again.")
        else:
            print("   Add credentials.json first, then run: python -c \"from triage import run_oauth; run_oauth()\"")
        print()
    else:
        print("3. GMAIL_REFRESH_TOKEN set")

    # 4. Supabase
    if not os.getenv('SUPABASE_URL') or not os.getenv('SUPABASE_ANON_KEY'):
        print("4. SUPABASE_URL or SUPABASE_ANON_KEY not set.")
        print("   Add to .env (same values as parking lot app config.js)")
        print()
    else:
        print("4. Supabase configured")

    # 5. Gemini
    if not os.getenv('GEMINI_API_KEY'):
        print("5. GEMINI_API_KEY not set.")
        print("   Get free key from https://aistudio.google.com/apikey")
        print()
    else:
        print("5. Gemini API key set")

    print("---")
    print("Next steps:")
    print("  1. Run the Supabase migration (email_tasks, processed_emails, agent_runs) in SQL Editor")
    print("  2. python scout_test.py  # verify connectivity")
    print("  3. python triage.py --dry-run  # test without writing")
    print("  4. python triage.py  # run for real")

if __name__ == '__main__':
    main()
