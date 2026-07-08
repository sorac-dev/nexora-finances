#!/bin/bash
# Instalar el timer de notificaciones push de Nexora Finance
# Ejecutar como root: sudo bash systemd/install.sh

set -e

echo "=== Nexora Finance — Instalando timer de notificaciones push ==="

# Leer CRON_SECRET o generar uno desde BETTER_AUTH_SECRET
if [ -f .env ]; then
  CRON_TOKEN=$(grep "^CRON_SECRET=" .env | cut -d= -f2 | tr -d '"' | tr -d "'")
  if [ -z "$CRON_TOKEN" ]; then
    CRON_TOKEN=$(grep "^BETTER_AUTH_SECRET=" .env | cut -d= -f2 | tr -d '"' | tr -d "'" | head -c 16)
  fi
fi

if [ -z "$CRON_TOKEN" ]; then
  echo "⚠️  No se encontró CRON_SECRET ni BETTER_AUTH_SECRET en .env"
  echo "   Por favor define CRON_SECRET en tu .env"
  exit 1
fi

echo "   Token: ${CRON_TOKEN:0:4}..."

# Copiar archivos
cp "$(dirname "$0")/nexora-notifications.service" /etc/systemd/system/
cp "$(dirname "$0")/nexora-notifications.timer" /etc/systemd/system/

# Inyectar el token en el service
sed -i "s/\${CRON_TOKEN}/$CRON_TOKEN/g" /etc/systemd/system/nexora-notifications.service

systemctl daemon-reload
systemctl enable nexora-notifications.timer
systemctl restart nexora-notifications.timer

echo ""
echo "✅ Timer instalado y corriendo."
echo "   Frecuencia: 9:00 AM y 6:00 PM"
echo "   Verificar:  systemctl status nexora-notifications.timer"
echo "   Logs:       journalctl -u nexora-notifications.service"
echo "   Probar:     curl -s 'http://localhost:3000/api/cron/notifications?token=$CRON_TOKEN'"
