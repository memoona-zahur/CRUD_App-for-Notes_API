#!/usr/bin/env bash
#
# install_docker.sh — installs Docker Engine + the Compose plugin on Ubuntu,
# starts the daemon, and adds the current user to the docker group.
#
# Run it once, from this project directory:
#     bash install_docker.sh
# Enter your sudo password when prompted (it's the only time you'll need it).
#
set -euo pipefail

echo "==> apt update"
sudo apt-get update

echo "==> install prerequisites"
sudo apt-get install -y ca-certificates curl

echo "==> add Docker apt key"
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo "==> add Docker apt repo"
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

echo "==> install Docker Engine + Compose plugin"
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "==> start the Docker daemon"
sudo systemctl enable --now docker

echo "==> add $USER to the docker group"
sudo usermod -aG docker "$USER"

echo "==> verify the daemon works"
sudo docker run --rm hello-world || true

echo ""
echo "DONE. Current shells still lack the docker group."
echo "Run this in THIS terminal so docker works without sudo:  newgrp docker"
