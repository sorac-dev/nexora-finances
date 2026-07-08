#!/bin/bash
# Instalar el timer de notificaciones push de Nexora Finance
# Ejecutar como root: sudo bash systemd/install.sh

set -e

echo "=== Nexora Finance — Instalando timer de notificaciones push ==="

# Ajustar el puerto si es necesario
PORT=3004
sed -i "s/localhost:3004/localhost:$PORT/g" "$(dirname "$0")/nexora-notifications.service"

cp "$(dirname "$0")/nexora-notifications.service" /etc/systemd/system/
cp "$(dirname "$0")/nexora-notifications.timer" /etc/systemd/system/

systemctl daemon-reload
systemctl enable nexora-notifications.timer
systemctl start nexora-notifications.timer

echo ""
echo "✅ Timer instalado y corriendo."
echo "   Frecuencia: 9:00 AM y 6:00 PM"
echo "   Verificar:  systemctl status nexora-notifications.timer"
echo "   Logs:       journalctl -u nexora-notifications.service"
echo ""
echo "Para cambiar el puerto: sudo bash systemd/install.sh 3004"
