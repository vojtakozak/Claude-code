# 🧠 Fellaship Brain

Kompletní "druhý mozek" systém pro Vojtu — rychlé zachytávání myšlenek
s AI klasifikací a konzultací s Claudem jedním klikem.

```
Hotkey → Raycast form → (Whisper diktát) → Claude klasifikuje
       → uloží na VPS → "Konzultuj" tlačítko otevře claude.ai
       s připraveným promptem v clipboardu.
```

## Komponenty

| Komponenta | Cesta | Popis |
|---|---|---|
| **VPS backend** | [`brain-api/`](./brain-api) | FastAPI + SQLite + Claude SDK |
| **Raycast extension** | [`fellaship-brain-raycast/`](./fellaship-brain-raycast) | Capture + Browse |
| **Hammerspoon hotkey** | [`hammerspoon/init.lua`](./hammerspoon/init.lua) | Global hotkey → Raycast |

## Deploy

Viz [`DEPLOY.md`](./DEPLOY.md) — step-by-step od VPS přes Raycast po Hammerspoon.

## Design

- Modern **blue-forward** paleta (#2563eb brand accent)
- Minimalistický list podobný Things / Todoist dark, ale sekce podle data
  (Dnes / Včera / ...) a tag badge v Color.Blue
- Každá kategorie má emoji + tlumené barevné akcenty
