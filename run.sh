#!/bin/bash
# Wrapper script invoked by the macOS LaunchAgent

AGENT_DIR="/Users/asif/Documents/Business/analytics-agent"
LOG="$AGENT_DIR/logs/daily.log"

# Load nvm / node (LaunchAgents don't inherit your shell PATH)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

# Fallback: common Homebrew node paths
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

cd "$AGENT_DIR"

echo "--- $(date) ---" >> "$LOG"
npx tsx daily-report.ts >> "$LOG" 2>&1
echo "Exit code: $?" >> "$LOG"
