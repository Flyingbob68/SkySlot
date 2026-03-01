#!/bin/bash
# SkySlot Linux server setup script
# Run as root on a fresh Ubuntu/Debian server

set -euo pipefail

APP_USER="skyslot"
APP_DIR="/opt/skyslot"
LOG_DIR="/var/log/skyslot"
NODE_VERSION="20"

echo "=== SkySlot Server Setup ==="

# 1. System packages
echo "Installing system packages..."
apt-get update
apt-get install -y curl git nginx certbot python3-certbot-nginx

# 2. Node.js via NodeSource
echo "Installing Node.js ${NODE_VERSION}..."
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
apt-get install -y nodejs

# 3. PM2
echo "Installing PM2..."
npm install -g pm2

# 4. PostgreSQL
echo "Installing PostgreSQL..."
apt-get install -y postgresql postgresql-contrib

# 5. Create app user
echo "Creating application user..."
if ! id "$APP_USER" &>/dev/null; then
    useradd -r -m -s /bin/bash "$APP_USER"
fi

# 6. Create directories
echo "Creating directories..."
mkdir -p "$APP_DIR" "$LOG_DIR"
chown "$APP_USER":"$APP_USER" "$APP_DIR" "$LOG_DIR"

# 7. Setup PostgreSQL database
echo "Setting up database..."
sudo -u postgres psql -c "CREATE USER skyslot WITH PASSWORD 'CHANGE_ME';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE skyslot OWNER skyslot;" 2>/dev/null || true

# 8. Install systemd service
echo "Installing systemd service..."
cp "$APP_DIR/deploy/skyslot.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable skyslot

echo ""
echo "=== Setup complete ==="
echo "Next steps:"
echo "1. Copy application files to $APP_DIR"
echo "2. Copy .env.example to .env and configure"
echo "3. Run: cd $APP_DIR && npm install --production"
echo "4. Run: npx prisma migrate deploy"
echo "5. Configure nginx: cp deploy/nginx.conf /etc/nginx/sites-available/skyslot"
echo "6. Run: certbot --nginx -d skyslot.example.com"
echo "7. Start: systemctl start skyslot"
