# Little Party RPG

A small, editable idle-RPG prototype built with plain HTML, CSS, JavaScript, and Canvas. No dependencies or build step are required.

## Run it

1. Extract the folder.
2. Open `index.html` in a modern browser.
3. The game starts automatically and repeats fights until paused.

If your browser restricts local files in a way that causes issues, run a tiny local server from this folder:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Current prototype features

- Four party members: Cleric, Mage, Archer, Knight.
- Canvas battle view with simple square characters, labels, and health bars.
- Automatic repeated battles, pause/resume, and a “Fight now” action.
- Enemies attack in order: Knight, Archer, Mage, Cleric.
- Party revives and returns to full HP between fights.
- Combat log with hits, critical hits, healing, evasion, defeat, XP, gold, and drops.
- Fight stats: damage dealt, healing, damage taken, and evaded attacks.
- Enemy selection through a level 90 list.
- Equipment slots for weapons, shields, four armor pieces, two rings, and a necklace.
- Random item drops with up to four extra stat rolls, including low rolls.
- Any item can roll any listed stat; percentage rolls are intentionally uncommon.
- XP and levels capped at 100.

## Simplifications / next steps

This is a playable first pass, not a balanced final game. Armor, damage, level scaling, loot odds, enemy values, and XP curves are deliberately modest and are easy to tune near the top of `game.js`. Equipment is shared inventory and can be equipped on any character; class restrictions are not enforced. Weapon base stats are simplified. The “wooden” starter weapons are intentionally very weak, and there is no armor at the start.

A useful next step would be save/load via `localStorage`, followed by more nuanced class skills and item comparison.
