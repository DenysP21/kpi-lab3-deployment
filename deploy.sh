#!/bin/bash
# Зупиняємо скрипт при будь-якій помилці
set -e

echo "=== Початок розгортання Notes Service (Варіант N=18) ==="

# 1. Встановлення необхідних пакетів
echo "[1/8] Встановлення залежностей (Nginx, MariaDB, Node.js)..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -yq
apt-get install -yq curl dirmngr apt-transport-https lsb-release ca-certificates nginx mariadb-server git sudo

# Встановлення Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -yq nodejs

# 2. Створення користувачів системи
echo "[2/8] Створення користувачів..."

create_user() {
    local username=$1
    local groups=$2
    if ! id -u "$username" >/dev/null 2>&1; then
        if getent group "$username" >/dev/null 2>&1; then
            useradd -m -s /bin/bash -g "$username" "$username"
        else
            useradd -m -s /bin/bash "$username"
        fi
        
        echo "$username:12345678" | chpasswd
        chage -d 0 "$username"
        if [ -n "$groups" ]; then
            usermod -aG "$groups" "$username"
        fi
        echo "Користувача $username створено."
    else
        echo "Користувач $username вже існує, пропускаємо."
    fi
}

create_user "student" "sudo"
create_user "teacher" "sudo"
create_user "operator" ""

# Системний користувач для застосунку (без пароля і доступу до shell)
if ! id -u "app" >/dev/null 2>&1; then
    useradd -r -s /bin/false app
    echo "Системного користувача app створено."
fi

# Налаштування прав для operator (з абсолютними шляхами)
echo "operator ALL=(root) NOPASSWD: /usr/bin/systemctl start mywebapp.service, /usr/bin/systemctl stop mywebapp.service, /usr/bin/systemctl restart mywebapp.service, /usr/bin/systemctl status mywebapp.service, /usr/bin/systemctl reload nginx" > /etc/sudoers.d/operator
chmod 440 /etc/sudoers.d/operator

# 3. Налаштування бази даних MariaDB
echo "[3/8] Налаштування MariaDB..."
systemctl enable --now mariadb
mysql -e "CREATE DATABASE IF NOT EXISTS notes_db;"
mysql -e "CREATE USER IF NOT EXISTS 'app'@'127.0.0.1' IDENTIFIED BY '12345678';"
mysql -e "GRANT ALL PRIVILEGES ON notes_db.* TO 'app'@'127.0.0.1';"
mysql -e "FLUSH PRIVILEGES;"

# 4. Копіювання застосунку 
echo "[4/8] Розгортання застосунку..."
mkdir -p /opt/mywebapp
cp server.js migrate.js package.json package-lock.json /opt/mywebapp/
cd /opt/mywebapp
npm ci --production
chown -R app:app /opt/mywebapp

# 5. Створення systemd-unit та socket activation
echo "[5/8] Налаштування Systemd Socket Activation..."

cat <<EOF > /etc/systemd/system/mywebapp.socket
[Unit]
Description=MyWebApp Socket

[Socket]
ListenStream=127.0.0.1:8000

[Install]
WantedBy=sockets.target
EOF

cat <<EOF > /etc/systemd/system/mywebapp.service
[Unit]
Description=MyWebApp Node.js Application
Requires=mywebapp.socket
After=network.target mariadb.service

[Service]
Type=simple
User=app
WorkingDirectory=/opt/mywebapp
ExecStartPre=/usr/bin/node /opt/mywebapp/migrate.js --db-user=app --db-pass=12345678 --db-name=notes_db
ExecStart=/usr/bin/node /opt/mywebapp/server.js --db-user=app --db-pass=12345678 --db-name=notes_db --port=8000
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now mywebapp.socket

# 6. Налаштування Nginx (Reverse Proxy)
echo "[6/8] Налаштування Nginx..."
cat <<'EOF' > /etc/nginx/sites-available/mywebapp
server {
    listen 80;
    server_name _;

    location /health/ {
        deny all;
    }

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        
        access_log /var/log/nginx/mywebapp_access.log;
        error_log /var/log/nginx/mywebapp_error.log;
    }
}
EOF

ln -sf /etc/nginx/sites-available/mywebapp /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
systemctl restart nginx
systemctl enable nginx

# 7. Створення файлу gradebook
echo "[7/8] Створення файлу gradebook..."
echo "18" > /home/student/gradebook
chown student:student /home/student/gradebook

# 8. Блокування дефолтного користувача
echo "[8/8] Блокування дефолтного користувача..."
DEFAULT_USER=$(id -un 1000 2>/dev/null || echo "")
if [ -n "$DEFAULT_USER" ] && [ "$DEFAULT_USER" != "student" ]; then
    usermod -L "$DEFAULT_USER"
    echo "Користувача $DEFAULT_USER заблоковано."
fi

echo "=== Розгортання успішно завершено! ==="