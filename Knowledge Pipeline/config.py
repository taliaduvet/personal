"""Central config — loads from .env, fails loudly if anything is missing."""

import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")


def _require(key: str) -> str:
    val = os.getenv(key)
    if not val:
        raise EnvironmentError(
            f"Missing required env var: {key}\n"
            f"Copy .env.example to .env and fill it in."
        )
    return val


SUPABASE_URL = _require("SUPABASE_URL")
SUPABASE_SERVICE_KEY = _require("SUPABASE_SERVICE_KEY")
BASS_APP_PATH = Path(os.getenv("BASS_APP_PATH", "/Volumes/BitchBaby1999/Coding/Personal/Bass App"))

# Max words Claude Code will process in a single extraction pass
CHUNK_SIZE = 12_000
