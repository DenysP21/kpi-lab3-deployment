#!/bin/bash
set -e
echo "=== Початок налаштування Target Node ==="

export DEBIAN_FRONTEND=noninteractive
apt-get update -yq
apt-get install -yq nginx docker.io docker-compose curl

echo "Налаштування Nginx..."
cp nginx.conf /etc/nginx/sites-available/mywebapp
ln -sf /etc/nginx/sites-available/mywebapp /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
systemctl restart nginx

echo "Налаштування Systemd для Docker..."
cp notes-app.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now notes-app.service
systemctl restart notes-app.service

echo "=== Розгортання завершено! ==="