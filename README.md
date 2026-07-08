# Nexora Finance

Control financiero personal — simple, elegante, inteligente.

Aplicación web progresiva (PWA) para gestionar finanzas personales: ingresos, gastos, tarjetas de crédito/débito, metas de ahorro, gastos fijos, presupuestos y más. Construida con Next.js 16, Better Auth, Prisma + MySQL, y web push notifications.

---

## 🚀 Stack tecnológico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router) |
| Lenguaje | TypeScript 5 |
| Base de datos | MySQL 8 + Prisma ORM |
| Autenticación | Better Auth (email/password + sesiones firmadas HMAC) |
| UI | React 19 + Framer Motion + CSS custom properties |
| Iconos | Lucide React |
| Notificaciones | Web Push API + Service Worker + VAPID |
| Email | Nodemailer + SMTP |
| Validación | Zod 4 |
| Estado global | Zustand 5 |
| Toast | Sonner |

---

## 📁 Estructura del proyecto

```
src/
├── app/
│   ├── (auth)/                # Login, registro, forgot-password, verify-email
│   ├── (dashboard)/           # App principal protegida
│   │   ├── page.tsx           # Dashboard / Inicio
│   │   ├── movements/         # Movimientos (ingresos/gastos) + detalle
│   │   ├── calendar/          # Calendario de pagos y cortes
│   │   ├── stats/             # Estadísticas con filtros avanzados
│   │   ├── goals/             # Metas de ahorro (creación por pasos)
│   │   ├── cards/             # Tarjetas de crédito/débito + detalle
│   │   ├── finances/          # Cartera (ingresos, presupuestos)
│   │   ├── gastos-fijos/      # Gastos fijos y suscripciones
│   │   ├── alerts/            # Centro de alertas
│   │   ├── trash/             # Papelera de movimientos
│   │   ├── more/              # Menú "Más" (navegación secundaria)
│   │   └── settings/          # Configuración, perfil, seguridad, etc.
│   ├── api/                   # API routes REST
│   │   ├── auth/[...all]/     # Better Auth (sign-in, sign-up, sign-out, session)
│   │   ├── transactions/      # CRUD movimientos + papelera + trash
│   │   ├── cards/             # CRUD tarjetas
│   │   ├── goals/             # CRUD metas
│   │   ├── subscriptions/     # CRUD gastos fijos
│   │   ├── incomes/           # CRUD ingresos
│   │   ├── categories/        # CRUD categorías
│   │   ├── stats/             # Estadísticas con rango de fechas
│   │   ├── alerts/            # Alertas del centro de alertas
│   │   ├── notifications/     # Check y test de push notifications
│   │   ├── push-subscriptions/# Gestión de suscripciones push
│   │   ├── user/profile/      # Perfil de usuario
│   │   ├── user/security/     # PIN de seguridad (set, verify, disable)
│   │   └── user/notification-prefs/ # Preferencias de notificaciones
│   ├── logout/                # Ruta de cierre de sesión server-side
│   └── layout.tsx             # Layout raíz + registro Service Worker
├── components/
│   ├── layout/                # TopNav, ThemeProvider, SW Register, BottomNav
│   └── ui/                    # Button, Icon, PinModal, ProgressBar, DonutChart, etc.
├── hooks/                     # usePush, usePinGuard, useTheme, useMediaQuery
├── lib/                       # Prisma client, pin hashing, db-helpers, constants
├── server/
│   ├── auth/                  # Configuración de Better Auth
│   └── middleware/            # Rate limiter, CSRF, security headers
├── schemas/                   # Zod schemas (auth, transaction, card, goal, etc.)
├── stores/                    # Zustand stores (UI, finance)
├── utils/                     # Formato, cálculos, validadores
└── proxy.ts                   # Middleware global (rate limiting, sesiones, seguridad)
prisma/
├── schema.prisma              # Modelo de datos completo
└── seed.ts                    # Datos iniciales (usuario demo)
public/
├── sw.js                      # Service Worker (push, offline, cache)
├── manifest.json              # PWA manifest
└── icons/                     # Iconos PWA (192x192, 512x512)
```

---

## 🔐 Funcionalidades principales

### Autenticación (Better Auth)
- Registro con email/contraseña
- Verificación de email vía SMTP
- Recuperación de contraseña
- Sesiones firmadas con HMAC (cookies HttpOnly)
- **"Mantener sesión abierta"**: 24h por defecto, 1 año si se marca el checkbox
- Cierre de sesión server-side (limpia BD y cookies)
- Rate limiting en endpoints de auth

### Dashboard
- Resumen de ingresos/gastos del mes
- Próximos pagos (gastos fijos + tarjetas)
- Acceso rápido a metas, tarjetas, estadísticas
- Banner de advertencia si no hay PIN configurado
- Auto-check de notificaciones push al abrir

### Movimientos
- Lista infinita con scroll (cursor-based pagination)
- Filtros por tipo, categoría, fechas (bottom sheet)
- Swipe para eliminar (va a papelera con 30 días)
- Detalle de cada movimiento con edición
- Registro de nuevos ingresos/gastos

### Tarjetas
- Crédito y débito con datos de corte y fecha límite
- Detalle por tarjeta con historial de movimientos
- Período de pago interactivo (registrar pagos)
- Eliminación con confirmación

### Metas de ahorro
- Creación por pasos (nombre/icono → montos → fecha → revisar)
- Date picker visual mes/año con grid de 12 meses
- Progreso visual con barra y porcentaje
- Agregar ahorros parciales
- Estimación automática de meses para alcanzar la meta

### Estadísticas
- Filtros avanzados: períodos rápidos (este mes, último mes, 3M, 6M, año) o rango personalizado
- 4 vistas: Resumen, Categorías, Mensual, Metas
- Comparación vs período anterior (%, colores verde/rojo)
- Donut chart de categorías
- Gráfico de barras ingresos vs gastos con scroll horizontal

### Papelera
- Página independiente en "Más → Papelera"
- Restaurar movimientos
- Eliminar permanentemente (con PIN)
- Vaciar todo (con PIN)
- Auto-limpieza a los 30 días

### Notificaciones Push
- Service Worker con cache offline
- Suscripción/desuscripción con VAPID
- Preferencias guardadas en BD (tipos de alerta, días de anticipación)
- Auto-check al abrir la app
- Test manual con botón "Probar notificación"
- Alertas: gastos fijos próximos/vencidos, cortes y pagos de tarjetas, metas
- URLs específicas por tipo de alerta al hacer clic

### Seguridad (PIN)
- PIN de 4 dígitos con hash HMAC-SHA256 (nunca texto plano)
- Protege: eliminar tarjeta, eliminar movimientos, eliminar de papelera, vaciar papelera, eliminar ingreso, eliminar meta, eliminar gasto fijo, acceder a perfil
- Cambio de PIN: primero verifica identidad, luego pide nuevo PIN
- Bloqueo automático configurable: 0min, 1min, 5min, 10min (estilo WhatsApp)
- Modal de entrada de PIN con shake en error, auto-submit, soporte pegado
- Alerta en centro de alertas si no hay PIN configurado
- Sin PIN configurado → las acciones no se bloquean

### Rate Limiting
- Token bucket en MySQL
- Endpoints de auth: 5 intentos (login), 3 (registro), 3 (forgot-password)
- Endpoints de mutación: 30 por ventana de tiempo
- Bloqueo de 15 minutos con header `Retry-After`

---

## ⚙️ Variables de entorno

Copiar `.env.example` → `.env` y completar. Variables requeridas:

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | MySQL connection string |
| `BETTER_AUTH_SECRET` | Secreto para firmar cookies (32+ chars) |
| `BETTER_AUTH_URL` | URL base de la app |
| `NEXT_PUBLIC_APP_URL` | URL pública (cliente) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Claves Web Push |
| `SMTP_*` | Configuración de email (opcional) |

---

## 🛠️ Instalación y desarrollo

```bash
# 1. Clonar
git clone <repo-url>
cd nexora-finances

# 2. Dependencias
npm install

# 3. Variables de entorno
cp .env.example .env
# Editar .env con tus valores (base de datos, claves, etc.)

# 4. Base de datos
npx prisma db push
npx prisma generate
npx prisma db seed   # Crea usuario demo: demo@demo.com / Demo2026!

# 5. Iniciar en desarrollo
npm run dev           # http://localhost:3000

# 6. Build producción
npm run build
npm start
```

---

## 🚢 Despliegue en producción

### Con systemctl (Linux)

```bash
# 1. Build
npm ci
npm run build

# 2. Crear servicio systemd
sudo nano /etc/systemd/system/nexora-finance.service
```

```ini
[Unit]
Description=Nexora Finance
After=network.target mysql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/nexora-finances
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable nexora-finance
sudo systemctl start nexora-finance
```

### Notificaciones push automáticas (systemd timer)

```bash
sudo nano /etc/systemd/system/nexora-notifications.service
```

```ini
[Unit]
Description=Nexora Finance — revisar alertas push

[Service]
Type=oneshot
ExecStart=/usr/bin/curl -s http://localhost:3000/api/notifications/check
```

```bash
sudo nano /etc/systemd/system/nexora-notifications.timer
```

```ini
[Unit]
Description=Revisar notificaciones Nexora cada 15 minutos

[Timer]
OnCalendar=*:0/15
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl enable nexora-notifications.timer
sudo systemctl start nexora-notifications.timer

# Verificar estado
sudo systemctl status nexora-notifications.timer
journalctl -u nexora-notifications.service
```

### Con PM2 (alternativa)

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Nginx reverse proxy

```nginx
server {
    listen 80;
    server_name nexora.app;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🗄️ Modelo de datos (Prisma)

Principales entidades:

- **User** — perfil, moneda, país, tema, PIN de seguridad, preferencias de notificaciones
- **Session / Account / Verification** — autenticación (Better Auth)
- **Transaction** — ingresos y gastos con categoría, cuenta, tarjeta
- **CreditCard** — tarjetas con día de corte, día de pago, marca, tipo
- **FinancialAccount** — cuentas bancarias/efectivo
- **Category** — categorías personalizables con icono y color
- **RecurringPayment** — gastos fijos con frecuencia, fecha límite
- **Goal** — metas de ahorro con target, progreso, fecha objetivo
- **IncomeSource** — fuentes de ingreso recurrentes
- **PushSubscription** — endpoints de Web Push por dispositivo
- **RateLimit** — token bucket para rate limiting
- **AuditLog** — registro de auditoría

---

## 🔒 Seguridad

- Cookies de sesión **HttpOnly + Secure + SameSite=Strict** firmadas con HMAC
- PIN de seguridad hasheado con HMAC-SHA256 (nunca en texto plano)
- CSRF protection vía Origin/Referer + Fetch Metadata (Better Auth)
- Rate limiting en auth y endpoints de mutación
- CSP, HSTS, X-Frame-Options, X-Content-Type-Options
- Proxy middleware que centraliza validación de sesión y rate limiting
- Soft delete (papelera 30 días) antes de eliminación permanente

---

## 📱 PWA

- Manifest con iconos 192x192 y 512x512
- Service Worker con cache offline (network-first)
- Instalable en pantalla de inicio (Android/iOS)
- Notificaciones push nativas
- Tema oscuro por defecto

---

## 🧪 Testing

```bash
# TypeScript
npx tsc --noEmit

# Lint
npm run lint
```

---

## 📄 Licencia

Privado — Todos los derechos reservados.
=======
# nexora-finances