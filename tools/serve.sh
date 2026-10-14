#!/usr/bin/env bash
# Restarts the production server on port 3100 (used by e2e/visual tests). Run after every `pnpm build`.
cd "$(dirname "$0")/.."
for p in $(ps -eo pid,args | awk '/next-server/ && !/awk/ {print $1}'); do kill "$p" 2>/dev/null; done
sleep 1
nohup pnpm exec next start -p 3100 > .next-server.log 2>&1 &
for i in $(seq 1 60); do curl -s -o /dev/null -w '%{http_code}' http://localhost:3100/ 2>/dev/null | grep -q 200 && echo "server up" && exit 0; sleep 0.5; done
echo "server failed"; tail -20 .next-server.log; exit 1
