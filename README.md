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

## Deploy (macOS, local-first)

```bash
./install-macos.sh                                        # 1. backend → launchd @ 127.0.0.1:8765
cd fellaship-brain-raycast && npm install && npm run dev  # 2. Raycast extension
cat hammerspoon/init.lua >> ~/.hammerspoon/init.lua       # 3. global hotkey
```

Full guide: [`DEPLOY.md`](./DEPLOY.md). UI preview: otevři [`preview/index.html`](./preview/index.html) v browseru.

## Design

- Modern **blue-forward** paleta (#2563eb brand accent)
- Minimalistický list podobný Things / Todoist dark, ale sekce podle data
  (Dnes / Včera / ...) a tag badge v Color.Blue
- Každá kategorie má emoji + tlumené barevné akcenty
