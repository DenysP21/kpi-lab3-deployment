#!/bin/bash
echo "=== Перевірка доступності сервісу ==="
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://192.168.0.115/)

if [ "$HTTP_CODE" -eq 200 ]; then
  echo "Сервіс доступний (HTTP 200)"
else
  echo "Помилка: Сервіс повернув HTTP $HTTP_CODE"
  exit 1
fi

echo "=== Перевірка Nginx (Health Check) ==="
HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://192.168.0.115/health/alive)

if [ "$HEALTH_CODE" -eq 403 ]; then
  echo "Nginx налаштовано правильно (Доступ до /health/ заборонено - HTTP 403)"
else
  echo "Помилка Nginx: Очікувався HTTP 403, отримано $HEALTH_CODE"
  exit 1
fi