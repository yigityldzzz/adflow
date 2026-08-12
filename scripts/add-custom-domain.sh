#!/bin/bash
# Safely activate a verified custom tracking domain for AdFlow.
#
# This is intentionally a MANUAL step, not something the API does
# automatically — this VPS hosts other clients' live sites (nisansite,
# FlowKit, various CRM installs) behind the same nginx, and nginx only
# allows one `default_server` per port. Any bug in automatic domain
# activation could silently break traffic routing for those other sites.
# Running this script by hand keeps a human in the loop for the one
# genuinely risky step, while everything else (domain ownership
# verification, database state, tracking URL generation) is already fully
# automatic via the AdFlow dashboard.
#
# Usage: ./add-custom-domain.sh track.example.com
#
# What it does:
#   1. Confirms the domain is already verified (has a matching TXT record) in
#      the AdFlow database.
#   2. Writes a new nginx server block that proxies the domain to the same
#      backend as adflow.digitaladexpert.de (mirrors apps/api/../adflow config).
#   3. Validates the FULL nginx config with `nginx -t` BEFORE touching the
#      live config — if validation fails, nothing is changed and no other
#      site is affected.
#   4. Reloads nginx (zero-downtime) only after validation passes.
#   5. Flips Domain.live = true in the database so AdFlow starts generating
#      tracking URLs on this domain.

set -euo pipefail

DOMAIN="${1:-}"
if [ -z "$DOMAIN" ]; then
  echo "Usage: $0 <domain>"
  exit 1
fi

# Basic sanity check on the domain format
if ! [[ "$DOMAIN" =~ ^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$ ]]; then
  echo "Error: '$DOMAIN' doesn't look like a valid domain."
  exit 1
fi

DB_USER="adflow"
DB_NAME="adflowdb"
DB_PASS=$(grep -oP '(?<=postgresql://adflow:)[^@]+' /root/adflow/apps/api/.env || true)
if [ -z "$DB_PASS" ]; then
  echo "Error: could not read DB password from /root/adflow/apps/api/.env"
  exit 1
fi

echo "→ Checking that $DOMAIN is verified in the AdFlow database..."
VERIFIED=$(PGPASSWORD="$DB_PASS" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -t -A -c \
  "SELECT verified FROM \"Domain\" WHERE domain='$DOMAIN';" || echo "")

if [ -z "$VERIFIED" ]; then
  echo "Error: no Domain row found for '$DOMAIN'. Has it been added in the AdFlow dashboard?"
  exit 1
fi
if [ "$VERIFIED" != "t" ]; then
  echo "Error: '$DOMAIN' is not verified yet (TXT record not confirmed). Verify it in the dashboard first."
  exit 1
fi

CONF_PATH="/etc/nginx/sites-available/adflow-custom-$DOMAIN"
LINK_PATH="/etc/nginx/sites-enabled/adflow-custom-$DOMAIN"

if [ -e "$CONF_PATH" ] || [ -e "$LINK_PATH" ]; then
  echo "Error: config for $DOMAIN already exists ($CONF_PATH). Remove it first if you're re-running this."
  exit 1
fi

echo "→ Writing nginx server block for $DOMAIN..."
cat > "$CONF_PATH" <<NGINXCONF
server {
    listen 80;
    server_name $DOMAIN;

    location /r/ {
        proxy_pass         http://127.0.0.1:6000;
        proxy_http_version 1.1;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_set_header   CF-Connecting-IP  \$http_cf_connecting_ip;
        proxy_buffering    off;
        proxy_read_timeout 5s;
    }

    location /api/ {
        proxy_pass         http://127.0.0.1:6000;
        proxy_http_version 1.1;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_set_header   CF-Connecting-IP  \$http_cf_connecting_ip;
    }

    location /api/conversions/pixel/ {
        proxy_pass         http://127.0.0.1:6000;
        proxy_buffering    off;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   CF-Connecting-IP \$http_cf_connecting_ip;
    }

    location / {
        return 404 "This domain only serves AdFlow tracking links.";
    }
}
NGINXCONF

ln -s "$CONF_PATH" "$LINK_PATH"

echo "→ Validating full nginx configuration (nginx -t)..."
if ! nginx -t 2>&1; then
  echo "✗ nginx -t FAILED — rolling back, no other site was touched."
  rm -f "$LINK_PATH" "$CONF_PATH"
  exit 1
fi

echo "→ Config valid. Reloading nginx..."
systemctl reload nginx

echo "→ Marking $DOMAIN as live in the database..."
PGPASSWORD="$DB_PASS" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c \
  "UPDATE \"Domain\" SET live=true WHERE domain='$DOMAIN';" > /dev/null

echo "✓ Done. $DOMAIN is now live — new tracking links using it will resolve correctly."
echo "  Note: this assumes $DOMAIN's DNS is CNAMEd (Cloudflare-proxied) to adflow.digitaladexpert.de."
echo "  If Cloudflare SSL mode for this domain isn't 'Full', switch it — the origin serves one cert regardless of Host header."
