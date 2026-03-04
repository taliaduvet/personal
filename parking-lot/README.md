# Parking Lot

Your anti-timeblindness system. Park tasks, see how long they've been waiting, add deadlines, and focus on what matters today.

## How to open

1. **Double-click** `index.html` in Finder, or
2. **Right-click** → Open with → Chrome (recommended for voice input)
3. **Desktop shortcut:** Drag `Parking Lot.webloc` to your Desktop, then double-click it anytime

## New powers

- **4 columns** (Misfit, Stop 2030 Barclay, Cycles, Life)—see everything at a glance
- **Smart add:** Type "misfit invoice due march 15" and it auto-categorizes + sets the deadline (keywords removed from title)
- **Today's Suggestions:** Select items from any column, add up to 5 for your 4-hour block
- **Focus mode:** Click the ◎ button to hide the columns and see only your suggestions
- **View archive:** See all completed items
- **Analytics:** This week's parked vs completed, by category
- **Voice (multiple):** Add tab → Voice → say "misfit invoice, life dentist, cycles report" (comma or "next" as separator)
- **Copy for Sheets:** One-click copy to paste into Google Sheets
- **Responsive:** Columns stack on mobile/small screens

## Voice input not working?

If you're opening via `file://`, the mic may not work. Run a local server instead:

```bash
cd /Volumes/BitchBaby1999/Coding/Personal/parking-lot
npx serve
```

Then open `http://localhost:3000` in Chrome.

## Backup

Click **Export backup** to download a JSON file. Use **Import** to restore if your browser clears data. Export regularly—localStorage can be cleared by browser updates or clearing data.

---

## Test Pilot (first run)

1. Open `index.html` in Chrome (or double-click `Parking Lot.webloc` from Desktop).
2. Click the **+** button, type `misfit invoice due march 15`—verify it goes to Misfit with deadline Mar 15.
3. Switch to **Quick add** tab, paste: `life dentist 3/20` and `cycles grant report`—click Add all.
4. Click items in the columns to select them, then **Add selected to Today's Suggestions**.
5. Click **◎** (Focus mode)—verify only your suggestions show.
6. Click **Done** on one item—verify "Completed today" tally increments.
7. Click **Remove** on another—verify it goes back to its column.
8. Click **Export backup**—verify a JSON file downloads.
