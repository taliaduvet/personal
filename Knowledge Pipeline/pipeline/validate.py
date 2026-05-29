#!/usr/bin/env python3
"""
Validate a knowledge record against the quality schema.
Returns a list of error strings — empty list means valid.
"""

import json
from pathlib import Path

import jsonschema

SCHEMA_PATH = Path(__file__).parent.parent / "schema" / "record.json"
_schema = json.loads(SCHEMA_PATH.read_text())

# Sections required per content type
REQUIRED_SECTIONS = {
    "style":     ["sound", "emotion", "whenUse", "build"],
    "technique": ["whatItDoes", "whenUse", "howToDo", "keyTip"],
    "character": ["description", "why", "how"],
    "principle": ["explanation", "whyItMatters", "misconception"],
    "problem":   ["cause", "fixSteps"],
    "writing":   ["body"],
    "reference": ["body"],
}

# Minimum character count for key text fields
MIN_LENGTHS = {
    "one_liner": 20,
    "sections.explanation": 200,  # principles need depth
    "sections.whatItDoes": 80,
    "sections.howToDo": 80,
}


def validate_record(rec: dict) -> list[str]:
    """Validate a record dict. Returns list of error strings."""
    errors = []

    # 1. JSON schema validation
    try:
        jsonschema.validate(instance=rec, schema=_schema)
    except jsonschema.ValidationError as e:
        errors.append(f"Schema: {e.message}")
        return errors  # no point continuing if schema is wrong

    # 2. Required sections for content type
    rec_type = rec.get("type", "")
    required = REQUIRED_SECTIONS.get(rec_type, [])
    sections = rec.get("sections", {})
    for key in required:
        if not sections.get(key, "").strip():
            errors.append(f"Missing required section '{key}' for type '{rec_type}'")

    # 3. fixSteps must be a non-empty list for problem type
    if rec_type == "problem":
        fix_steps = sections.get("fixSteps", [])
        if not isinstance(fix_steps, list) or len(fix_steps) < 2:
            errors.append("'fixSteps' must be a list with at least 2 steps")

    # 4. Minimum text length checks
    one_liner = rec.get("one_liner", "")
    if len(one_liner) < MIN_LENGTHS["one_liner"]:
        errors.append(f"one_liner too short ({len(one_liner)} chars, min {MIN_LENGTHS['one_liner']})")

    # 5. Attribution — at least one source with a title
    sources = rec.get("sources", [])
    if not sources or not sources[0].get("title"):
        errors.append("At least one source with a title is required")

    # 6. Tier 1 attribution requires timestamp or page
    for src in sources:
        if src.get("tier") == 1 and not src.get("timestamp") and not src.get("page") and not src.get("quote"):
            errors.append(f"Tier 1 source '{src.get('title')}' needs timestamp, page, or direct quote")

    # 7. Depth score must reflect content
    depth = rec.get("depth_score", 0)
    if depth == 3:
        # Depth 3 requires a pitfall or edge case — check keyTip or flags
        has_pitfall = (
            sections.get("keyTip", "") or
            any("pitfall" in f.lower() or "watch" in f.lower() for f in rec.get("flags", []))
        )
        if rec_type in ("technique", "style") and not has_pitfall:
            errors.append("depth_score 3 requires a keyTip or documented pitfall")

    # 8. Criteria evaluation — warn if any required criterion is False
    criteria = rec.get("criteria_evaluation", {})
    for key in ["specific", "principled", "attributable", "actionable"]:
        if criteria.get(key) is False:
            errors.append(f"Criterion '{key}' is marked False — record should be rejected or improved")

    # 9. Context must have at least one dimension (except universal principles)
    if rec_type != "principle":
        context = rec.get("context", {})
        has_context = any(v for v in context.values() if isinstance(v, list) and v)
        if not has_context:
            errors.append("At least one context dimension (tempo, density, tone, feel, genre) is required")

    return errors


if __name__ == "__main__":
    # Quick test with a minimal record
    test = {
        "discipline": "drums",
        "type": "technique",
        "title": "Test Technique",
        "one_liner": "This is a test one liner that is long enough.",
        "sections": {
            "whatItDoes": "Does something specific.",
            "whenUse": "Use when X.",
            "howToDo": "Do it by doing Y.",
            "keyTip": "Watch out for Z.",
        },
        "context": {"tempo": ["80–100 BPM"]},
        "sources": [{"title": "Test Source", "tier": 2}],
        "attribution_tier": 2,
        "depth_score": 2,
        "conflict_of_interest": False,
    }
    errs = validate_record(test)
    if errs:
        print("Validation errors:")
        for e in errs:
            print(f"  - {e}")
    else:
        print("Valid.")
