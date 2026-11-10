#!/bin/bash
set -u
ROOT="/Users/ron1n97/projects/stuff/mgimo-hack-app/scripts"
GOST="$ROOT/bin/gost"
SSH_KEY="/Users/ron1n97/.ssh/mgimo_hack_app_ed25519"
VPS="root@177.177.212.34"
LOG_DIR="/Users/ron1n97/projects/stuff/mgimo-hack-app/scripts/logs"
mkdir -p "$LOG_DIR"
while true; do
  if ! pgrep -f "$GOST -L http://127.0.0.1:11080" >/dev/null 2>&1; then
    "$GOST" -L http://127.0.0.1:11080 >>"$LOG_DIR/gost-http.log" 2>&1 &
    sleep 1
  fi
  if ! pgrep -f "40000:127.0.0.1:11080" >/dev/null 2>&1; then
    /usr/bin/ssh -i "$SSH_KEY" -o IdentitiesOnly=yes -o ServerAliveInterval=15 -o ServerAliveCountMax=3 \
      -o ExitOnForwardFailure=yes -N -R 0.0.0.0:40000:127.0.0.1:11080 "$VPS" \
      >>"$LOG_DIR/tg-tunnel.log" 2>&1 || true
    echo "tunnel exited $(date -u +%Y-%m-%dT%H:%M:%SZ)" >>"$LOG_DIR/tg-tunnel.log"
    sleep 2
  else
    sleep 5
  fi
done
