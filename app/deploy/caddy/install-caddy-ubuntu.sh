#!/usr/bin/env bash
# Install Caddy on Ubuntu/Debian (official Cloudsmith repo) and configure Writ reverse proxy.
# Run on the server: bash install-caddy-ubuntu.sh
set -euo pipefail

sudo apt-get update
sudo apt-get install -y debian-keyring debian-archive-keyring curl gnupg

curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
	| sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
	| sudo tee /etc/apt/sources.list.d/caddy-stable.list

sudo apt-get update
sudo apt-get install -y caddy

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
sudo cp "${SCRIPT_DIR}/Caddyfile" /etc/caddy/Caddyfile

sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl enable caddy
sudo systemctl restart caddy

echo "Caddy is running. Ensure writ-server (:5000) and writ-client (:5175) are up, then open http://YOUR_PUBLIC_IP/ (port 80)."
