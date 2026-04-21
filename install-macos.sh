#!/usr/bin/env bash
# Fellaship Brain — macOS local-first installer.
# Safe: no sudo, loopback only (127.0.0.1), user-scope launchd agent.
# Secrets in ~/Library/Application Support/FellaShipBrain/.env (mode 600).

set -euo pipefail

APP_NAME="FellaShipBrain"
APP_DIR="$HOME/Library/Application Support/$APP_NAME"
LAUNCH_AGENT="$HOME/Library/LaunchAgents/cz.fellaship.brain.plist"
PORT="${FELLASHIP_BRAIN_PORT:-8765}"
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

color() { printf "\033[1;36m%s\033[0m\n" "$*"; }
ok()    { printf "\033[1;32m✓\033[0m %s\n" "$*"; }
warn()  { printf "\033[1;33m!\033[0m %s\n" "$*"; }
die()   { printf "\033[1;31m✗\033[0m %s\n" "$*" >&2; exit 1; }

[ "$(uname)" = "Darwin" ] || die "Tento installer je pro macOS. Pro Linux/VPS použij DEPLOY.md."

color "🧠 Fellaship Brain — macOS local installer"
echo "    App dir:        $APP_DIR"
echo "    LaunchAgent:    $LAUNCH_AGENT"
echo "    Listen on:      127.0.0.1:$PORT (jen loopback, nic veřejně)"
echo

# ---------- 1. Prereqs ----------
command -v python3 >/dev/null || die "python3 chybí. Nainstaluj: brew install python@3.12"
PYV=$(python3 -c 'import sys; print("%d.%d" % sys.version_info[:2])')
ok "python3 $PYV"

command -v openssl >/dev/null || die "openssl chybí (na macOS by měl být)."

# ---------- 2. App dir + venv ----------
mkdir -p "$APP_DIR"
chmod 700 "$APP_DIR"
cp "$REPO_DIR/brain-api/main.py"         "$APP_DIR/main.py"
cp "$REPO_DIR/brain-api/requirements.txt" "$APP_DIR/requirements.txt"

if [ ! -d "$APP_DIR/venv" ]; then
    python3 -m venv "$APP_DIR/venv"
    ok "venv vytvořen"
fi
"$APP_DIR/venv/bin/pip" install --quiet --upgrade pip
"$APP_DIR/venv/bin/pip" install --quiet -r "$APP_DIR/requirements.txt"
ok "deps nainstalované"

# ---------- 3. .env ----------
ENV_FILE="$APP_DIR/.env"
if [ -f "$ENV_FILE" ]; then
    ok ".env už existuje, nepřepisuju"
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    TOKEN="${BRAIN_AUTH_TOKEN:-}"
else
    TOKEN="$(openssl rand -hex 32)"

    # API key: try env, then Keychain, then prompt
    API_KEY="${ANTHROPIC_API_KEY:-}"
    if [ -z "$API_KEY" ]; then
        API_KEY="$(security find-generic-password -a "$USER" -s "anthropic-api-key" -w 2>/dev/null || true)"
    fi
    if [ -z "$API_KEY" ]; then
        printf "\n"
        read -r -s -p "Vlož ANTHROPIC_API_KEY (sk-ant-...): " API_KEY
        printf "\n"
        [ -n "$API_KEY" ] || die "API key je prázdný."
        # Save to Keychain for next time
        security add-generic-password -a "$USER" -s "anthropic-api-key" -w "$API_KEY" -U >/dev/null 2>&1 || true
        ok "API key uložen do macOS Keychain (service: anthropic-api-key)"
    fi

    cat > "$ENV_FILE" <<EOF
ANTHROPIC_API_KEY=$API_KEY
BRAIN_AUTH_TOKEN=$TOKEN
BRAIN_DB_PATH=$APP_DIR/brain.db
EOF
    chmod 600 "$ENV_FILE"
    ok ".env vytvořen (mode 600)"
fi

# ---------- 4. launchd plist ----------
mkdir -p "$(dirname "$LAUNCH_AGENT")"
cat > "$LAUNCH_AGENT" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>cz.fellaship.brain</string>
  <key>ProgramArguments</key>
  <array>
    <string>$APP_DIR/venv/bin/uvicorn</string>
    <string>main:app</string>
    <string>--host</string>
    <string>127.0.0.1</string>
    <string>--port</string>
    <string>$PORT</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$APP_DIR</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>$APP_DIR/venv/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
  <key>StandardOutPath</key>
  <string>$APP_DIR/brain.log</string>
  <key>StandardErrorPath</key>
  <string>$APP_DIR/brain.err.log</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>ProcessType</key>
  <string>Interactive</string>
</dict>
</plist>
EOF

# launchd EnvironmentVariables plist doesn't read .env — load it in a wrapper.
cat > "$APP_DIR/run.sh" <<'EOF'
#!/usr/bin/env bash
set -a
# shellcheck disable=SC1091
source "$(dirname "$0")/.env"
set +a
exec "$(dirname "$0")/venv/bin/uvicorn" main:app --host 127.0.0.1 --port "${FELLASHIP_BRAIN_PORT:-8765}"
EOF
chmod +x "$APP_DIR/run.sh"

# Rewrite plist to call the wrapper (so .env is loaded)
cat > "$LAUNCH_AGENT" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>cz.fellaship.brain</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$APP_DIR/run.sh</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$APP_DIR</string>
  <key>StandardOutPath</key>
  <string>$APP_DIR/brain.log</string>
  <key>StandardErrorPath</key>
  <string>$APP_DIR/brain.err.log</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>ProcessType</key>
  <string>Interactive</string>
</dict>
</plist>
EOF
ok "LaunchAgent zapsaný"

# ---------- 5. Load agent ----------
launchctl unload "$LAUNCH_AGENT" 2>/dev/null || true
launchctl load "$LAUNCH_AGENT"
sleep 2

# ---------- 6. Smoke test ----------
if curl -fsS "http://127.0.0.1:$PORT/health" >/dev/null; then
    ok "brain-api běží na http://127.0.0.1:$PORT"
else
    warn "Health check selhal. Log: $APP_DIR/brain.err.log"
    tail -20 "$APP_DIR/brain.err.log" || true
    die "Server se nerozběhl."
fi

# ---------- 7. Output user-facing config ----------
color ""
color "═══════════════════════════════════════════════════════════════"
color "  ✅  Hotovo. Teď nastav Raycast extension:"
color "═══════════════════════════════════════════════════════════════"
cat <<EOF

  1. cd fellaship-brain-raycast
  2. npm install && npm run dev

  V Raycastu → Fellaship Brain → Preferences:
      Brain API URL:  http://127.0.0.1:$PORT
      Auth Token:     $TOKEN

  (Token je také v $ENV_FILE)

  Hammerspoon:
      cat hammerspoon/init.lua >> ~/.hammerspoon/init.lua
      # pak v Hammerspoon menu → Reload Config

  Management:
      Stop:       launchctl unload $LAUNCH_AGENT
      Start:      launchctl load $LAUNCH_AGENT
      Logs:       tail -f $APP_DIR/brain.log
      Uninstall:  $REPO_DIR/uninstall-macos.sh

EOF
