# First Principles Extraction Prompt

You are extracting foundational production concepts for a "First Principles" section of a music production reference tool. This section serves producers who are new or who have gaps in their foundational knowledge.

The quality bar here is different from technical content. The question is not "is this non-obvious?" but "is this explained better than it's explained anywhere else?"

---

## WHAT FIRST PRINCIPLES CONTENT IS

A foundational concept explained with unusual clarity. No assumed knowledge. Addresses the common misconception directly. Grounds the abstract in something you can hear.

The target reader: someone who has been making music for under a year, has basic DAW familiarity, but struggles to find clear explanations of fundamental concepts. They've Googled it, found 40-minute YouTube videos that assume half the vocabulary, or oversimplified blog posts that don't actually explain the mechanism.

---

## QUALITY BAR

**1. ZERO ASSUMED KNOWLEDGE**
Every term is explained when it first appears. If the explanation uses a technical term, that term is defined in the same explanation. Test: read it imagining you have never seen a DAW.

**2. ADDRESSES THE COMMON MISCONCEPTION**
The most useful thing a First Principles entry can do is correct the thing people learn wrong first. Identify and directly address the misconception most beginners hold about this concept.

**3. MECHANISTIC BUT ACCESSIBLE**
The explanation must convey what is actually happening — not just "compression makes things louder" but what compression actually does to the dynamic range of a signal, explained in plain language. No formula required. Physical intuition required.

**4. GROUNDED IN SOMETHING YOU CAN HEAR**
Every abstract concept needs a concrete listening example. "Listen to the kick in [reference track] — the way it…" This is what makes the concept stick.

**5. NON-CONDESCENDING**
Explains the concept, not the person's lack of knowledge. No "you might be wondering…" or "even beginners know…" Just the explanation.

---

## WHAT TO REJECT

- Content that assumes prior knowledge without defining it
- Explanations that are accurate but don't address why producers need to understand this
- Purely motivational content with no conceptual substance
- Content that explains what to do without explaining what it is

---

## DISCIPLINE TAGGING

First Principles entries can be:
- `universal` — applies across all production disciplines (compression, EQ, phase, headroom, mono compatibility, dynamic range)
- `bass` — specific to bass production fundamentals
- `drums` — specific to drum production fundamentals
- etc.

Tag `universal` only when genuinely applicable everywhere. Be specific when the concept has a discipline-specific context.

---

## OUTPUT FORMAT

```json
{
  "records": [
    {
      "discipline": "universal",
      "type": "principle",
      "title": "What Compression Actually Does",
      "one_liner": "It reduces the gap between the loudest and quietest moments in a signal.",
      "sections": {
        "explanation": "Full plain-language explanation of the concept. No assumed knowledge. Every term defined.",
        "whyItMatters": "Why a producer needs to understand this. What goes wrong when they don't.",
        "misconception": "The specific thing most producers believe wrongly about this concept, and why it's wrong.",
        "hearIt": "A concrete listening example — a specific track, moment, or experiment the producer can do right now to hear the concept."
      },
      "context": {},
      "sources": [
        {
          "title": "Making Music — Dennis DeSantis",
          "author": "Dennis DeSantis",
          "page": "147",
          "quote": "Direct quote if available",
          "tier": 1
        }
      ],
      "attribution_tier": 1,
      "depth_score": 3,
      "conflict_of_interest": false,
      "scope": [],
      "filters": [],
      "meta": {
        "tag": "Dynamics",
        "category": "Fundamentals"
      },
      "criteria_evaluation": {
        "specific": true,
        "principled": true,
        "attributable": true,
        "actionable": true,
        "non_obvious": null,
        "clear": true
      },
      "flags": []
    }
  ],
  "rejected": [
    {
      "reason": "Assumes reader knows what a transient is without defining it",
      "source_quote": "..."
    }
  ]
}
```

---

Now extract all First Principles content from the source material below.
