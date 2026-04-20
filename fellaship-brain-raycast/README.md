# Fellaship Brain — Raycast extension

AI-powered thought capture napojené na vlastní `brain-api` VPS backend.

## Setup

```bash
cd fellaship-brain-raycast
npm install
npm run dev   # importuje extension do Raycastu
```

Pak v Raycastu otevři **Fellaship Brain → Preferences** a vyplň:

- **Brain API URL** — např. `https://brain.fellaship.cz`
- **Auth Token** — stejná hodnota jako `BRAIN_AUTH_TOKEN` v `.env` na VPS

## Ikonka

Projekt obsahuje text-based `assets/icon.png` placeholder. Nahraď vlastní 512×512 PNG
(transparent background doporučen). Raycast vyžaduje `icon.png` jako 512×512 PNG.

## Commands

- **Capture Thought** — formulář, zachytí myšlenku, Claude ji klasifikuje.
- **Browse Thoughts** — seznam, filtr kategorie, hledání, konzultace.

## Deeplinks

- `raycast://extensions/vojta/fellaship-brain/capture`
- `raycast://extensions/vojta/fellaship-brain/list`
