#!/bin/bash
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  AdFlow — Production Deploy"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 1. Install Node.js 20 if needed ──────────────────────────────
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

# ── 2. Install PostgreSQL if needed ──────────────────────────────
if ! command -v psql &>/dev/null; then
  apt-get update && apt-get install -y postgresql postgresql-contrib
  systemctl start postgresql && systemctl enable postgresql
fi

# ── 3. Create database & user ────────────────────────────────────
sudo -u postgres psql -tc "SELECT 1 FROM pg_user WHERE usename = 'adflow'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER adflow WITH PASSWORD '${DB_PASSWORD:-adflow_secret_change_me}';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = 'adflowdb'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE adflowdb OWNER adflow;"

# ── 4. Install PM2 if needed ─────────────────────────────────────
if ! command -v pm2 &>/dev/null; then
  npm install -g pm2
fi

# ── 5. Install dependencies ──────────────────────────────────────
echo "[AdFlow] Installing dependencies..."
cd /root/adflow
npm install --workspace=apps/api --ignore-scripts
npm install --workspace=apps/web --ignore-scripts

# ── 6. Build API ─────────────────────────────────────────────────
echo "[AdFlow] Building API..."
cd /root/adflow/apps/api
npm run db:generate
npm run db:migrate
npm run build

# ── 7. Build Web ─────────────────────────────────────────────────
echo "[AdFlow] Building Next.js..."
cd /root/adflow/apps/web
npm run build

# ── 8. Nginx ─────────────────────────────────────────────────────
echo "[AdFlow] Configuring Nginx..."
cp /root/adflow/nginx.conf /etc/nginx/sites-available/adflow
ln -sf /etc/nginx/sites-available/adflow /etc/nginx/sites-enabled/adflow
nginx -t && systemctl reload nginx

# ── 9. PM2 ───────────────────────────────────────────────────────
echo "[AdFlow] Starting PM2 processes..."
cd /root/adflow
pm2 delete adflow-api adflow-web 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Deploy complete!"
echo "  API:  http://localhost:6000/health"
echo "  Web:  http://localhost:3020"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
