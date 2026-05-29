# Bass Production Reference

Interactive bass production reference for Ableton Live, NI Massive, NI Twin 3, and Waves Pro Suite.

## Quick start

1. Open Terminal and run:

```bash
cd "/Volumes/BitchBaby1999/Coding/Personal/Bass App"
python3 -m http.server 8765
```

2. In your browser, open: **http://localhost:8765/index.html**

   Do **not** double-click the HTML file (`file://` breaks AI features).

3. Click **Settings** (gear), paste your [Anthropic API key](https://console.anthropic.com/), click **Save**, then **Test connection**.

## Zones

| Zone | What it does |
|------|----------------|
| **Start Here** | Answer 4 song questions → AI recommends a style, techniques, and character |
| **Styles** | 9 bass styles with build steps and signal chains |
| **Techniques** | 20 processing and MIDI techniques |
| **Character** | 16 tone pairs (warm/cold, dark/bright, …) |
| **Writing** | 6 bassline writing guides |
| **Builder** | Combine style + techniques + character → custom recipe (AI) |
| **Fix It** | 8 common problems with step-by-step fixes |
| **Reference** | 6-step reference listening workflow |
| **Vocal + Bass** | 8 vocal-register scenarios |

## Quick Mode

Toggle **Quick Mode** in the nav to hide explanatory text in detail panels — only **Build** and **Signal chain** stay visible.

## For developers

See [ARCHITECTURE.md](ARCHITECTURE.md) for file regions, data contracts, and how to edit content.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| AI buttons greyed out | Use `http://localhost:8765`, not `file://` |
| Test connection fails | Check API key and billing at console.anthropic.com |
| Console shows manifest error | Content counts in `CONTENT_MANIFEST` don't match data — see ARCHITECTURE.md |
