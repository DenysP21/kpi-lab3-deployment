#!/bin/bash
set -e
echo "=== Початок налаштування Target Node ==="

export DEBIAN_FRONTEND=noninteractive
apt-get update -yq
apt-get install -yq docker.io docker-compose curl

echo "Зупинка старих сервісів (з першої лаби) та хостового Nginx..."
systemctl stop mywebapp.service || true
systemctl stop mywebapp.socket || true
systemctl disable mywebapp.service || true
systemctl disable mywebapp.socket || true
systemctl stop nginx || true
systemctl disable nginx || true

echo "Налаштування Systemd для Docker..."
cp notes-app.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now notes-app.service
systemctl restart notes-app.service

echo "=== Розгортання завершено! ==="