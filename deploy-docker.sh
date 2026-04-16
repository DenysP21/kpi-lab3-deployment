#!/bin/bash
set -e
echo "=== Початок налаштування Target Node ==="

export DEBIAN_FRONTEND=noninteractive
apt-get update -yq
apt-get install -yq nginx docker.io docker-compose curl

echo "Зупинка старих сервісів (з першої лаби)..."
systemctl stop mywebapp.service || true
systemctl stop mywebapp.socket || true
systemctl disable mywebapp.service || true
systemctl disable mywebapp.socket || true

echo "Налаштування Nginx..."
cp nginx.conf /etc/nginx/sites-available/mywebapp
ln -sf /etc/nginx/sites-available/mywebapp /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Перевірка конфігу перед рестартом
nginx -t
systemctl restart nginx

echo "Налаштування Systemd для Docker..."
cp notes-app.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now notes-app.service
systemctl restart notes-app.service

echo "=== Розгортання завершено! ==="