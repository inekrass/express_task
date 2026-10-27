#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

server="root@89.125.250.250"
remote_dir="/opt/express-task-deploy"

scp app.js index.js package.json package-lock.json Dockerfile .dockerignore \
  "$server:$remote_dir/"

ssh "$server" 'sh -s' <<'REMOTE'
set -eu
cd /opt/express-task-deploy

exec 9>/opt/express-task-deploy/update.lock
flock -n 9 || { echo 'Another update is running'; exit 1; }

docker build -t express-task:current .
if docker container inspect express-task-previous >/dev/null 2>&1; then
  echo 'Previous container already exists; check it before updating'
  exit 1
fi

rollback() {
  if docker container inspect express-task-previous >/dev/null 2>&1; then
    docker rm -f express-task-app >/dev/null 2>&1 || true
    docker rename express-task-previous express-task-app
  fi
  docker start express-task-app >/dev/null
  echo 'Update failed; previous application restored'
}

trap rollback EXIT
trap 'exit 1' HUP INT TERM
docker stop express-task-app
docker rename express-task-app express-task-previous

docker run -d --name express-task-app --network express-task-net \
  --restart unless-stopped --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=16m \
  --cap-drop ALL --security-opt no-new-privileges:true \
  --memory 256m --cpus 1 --pids-limit 100 \
  --log-opt max-size=10m --log-opt max-file=3 express-task:current

for attempt in 1 2 3 4 5 6 7 8 9 10; do
  if docker exec express-task-app node --input-type=module -e \
    'const r = await fetch("http://127.0.0.1:3000/login/", {signal: AbortSignal.timeout(2000)}); if (r.status !== 200 || await r.text() !== "inekrass") process.exit(1);' \
    >/dev/null 2>&1; then
    trap - EXIT HUP INT TERM
    docker rm express-task-previous
    echo 'Updated: https://express.89.125.250.250.sslip.io:8443/'
    exit 0
  fi
  sleep 1
done

docker logs --tail 30 express-task-app
exit 1
REMOTE
