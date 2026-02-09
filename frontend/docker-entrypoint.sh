#!/bin/sh
set -e

# Hardcode public backend URL so a Fly secret or old env never forces .internal (which causes connection refused).
# If your backend app name is different, change the URL below and rebuild.
BACKEND_URL="${BACKEND_URL:-https://pseudogen-backend.fly.dev}"
BACKEND_HOST="${BACKEND_HOST:-pseudogen-backend.fly.dev}"
# Force public URL if someone set .internal
case "$BACKEND_URL" in
  *".internal"*) BACKEND_URL="https://pseudogen-backend.fly.dev"; BACKEND_HOST="pseudogen-backend.fly.dev";;
esac

# Generate nginx config
cat > /etc/nginx/conf.d/default.conf <<EOF
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /generate-pseudocode {
        proxy_pass ${BACKEND_URL};
        proxy_http_version 1.1;
        proxy_set_header Host ${BACKEND_HOST};
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 30s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
        proxy_ssl_server_name on;
        proxy_ssl_verify off;
    }
}
EOF

# Run nginx in foreground (full path for Alpine). Do not use exec "$@" — Fly/Docker can pass CMD in a way that duplicates "nginx".
exec /usr/sbin/nginx -g "daemon off;"
