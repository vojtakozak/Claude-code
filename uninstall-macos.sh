#!/usr/bin/env bash
# Fellaship Brain — clean uninstall (macOS).
# Zachovává DB jako zálohu, mazání se ptá interaktivně.

set -euo pipefail

APP_DIR="$HOME/Library/Application Support/FellaShipBrain"
LAUNCH_AGENT="$HOME/Library/LaunchAgents/cz.fellaship.brain.plist"

echo "🧹 Fellaship Brain uninstall"

if [ -f "$LAUNCH_AGENT" ]; then
    launchctl unload "$LAUNCH_AGENT" 2>/dev/null || true
    rm -f "$LAUNCH_AGENT"
    echo "   ✓ LaunchAgent odstraněn"
fi

if [ -d "$APP_DIR" ]; then
    read -r -p "Smazat také $APP_DIR (včetně DB)? [y/N] " yn
    if [[ "$yn" =~ ^[Yy]$ ]]; then
        rm -rf "$APP_DIR"
        echo "   ✓ App dir smazán"
    else
        echo "   · App dir zachován: $APP_DIR"
    fi
fi

read -r -p "Smazat ANTHROPIC_API_KEY z macOS Keychain? [y/N] " yn
if [[ "$yn" =~ ^[Yy]$ ]]; then
    security delete-generic-password -s "anthropic-api-key" 2>/dev/null || true
    echo "   ✓ Keychain položka odstraněna"
fi

echo "   Raycast extension a Hammerspoon config uklidíš ručně (neví kde je přesně máš)."
