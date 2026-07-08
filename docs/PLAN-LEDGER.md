# Plan de Implementación — Capa de Dominio Centralizada (Ledger)

## Objetivo

Eliminar la desincronización entre movimientos, gastos fijos, dashboard, alertas, push y calendario. Centralizar todo el cálculo financiero en un solo módulo (`src/lib/ledger.ts`) que sea la **fuente única de verdad**.

---

## 1. Cambios en la Base de Datos

### 1.1 Transaction — nuevos campos

```prisma
model Transaction {
  // ... campos existentes se mantienen ...
  subscriptionId String?  @db.VarChar(36)   // FK a RecurringPayment
  cycleKey       String?  @db.VarChar(20)   // ej: "2026-07-13"

  subscription RecurringPayment? @relation(fields: [subscriptionId], references: [id], onDelete: SetNull)
}
```

### 1.2 RecurringPayment — simplificar

```prisma
model RecurringPayment {
  // ... campos existentes ...
  firstDueDate      DateTime  // Fecha del primer vencimiento (INMUTABLE)
  firstDeadlineDate  DateTime // Fecha del primer límite (INMUTABLE)

  // dueDate y deadline PASAN A SER CALCULADOS por ledger.ts
  // Se mantienen en BD por compatibilidad pero ledger.ts los recalcula
  transactions Transaction[]
}
```

### 1.3 FinancialAccount — eliminar

El balance se calcula con SQL SUM. La tabla completa se elimina.

### 1.4 Índices nuevos

```sql
-- Búsqueda rápida: ¿pagaste Netflix en julio 2026?
ALTER TABLE Transaction ADD INDEX idx_sub_cycle (subscriptionId, cycleKey, deletedAt);

-- Búsqueda rápida: ¿ya pagaste esta tarjeta este ciclo?
ALTER TABLE Transaction ADD INDEX idx_card_cycle (cardId, cycleKey, deletedAt);
```

---

## 2. El motor central — src/lib/ledger.ts

### 2.1 Funciones de dominio

```typescript
// Cálculo de fechas de ciclo
function getNextDueDate(firstDate: Date, frequency: string, from: Date): Date
function getNextDeadlineDate(firstDeadline: Date, frequency: string, from: Date): Date
function getCycleKey(date: Date, frequency: string): string

// Consultas de estado
async function getBalance(userId: string): Promise<number>
async function getMonthStats(userId: string, year: number, month: number): Promise<{ income: number; expenses: number }>

// Pagos pendientes
async function getPendingPayments(userId: string): Promise<Payment[]>
  // Devuelve subs no pagados + tarjetas en ventana de pago
  // 1 sola query SQL que JOINEA Transaction con RecurringPayment

// Verificación de pago
async function isSubscriptionPaid(subId: string, cycleKey: string): Promise<boolean>

// Calendario
async function getCalendarEvents(userId: string, year: number, month: number): Promise<Event[]>
```

### 2.2 Cómo calcula "próximo vencimiento" sin campo mutable

```
Netflix: firstDueDate = 2026-01-13, frequency = monthly
Hoy: 2026-07-08

1. Calcular cuántos meses pasaron desde enero 2026 hasta hoy: 6 meses
2. nextDueDate = firstDueDate + 6 meses = 2026-07-13
3. nextDeadline = firstDeadlineDate + 6 meses = 2026-07-18
4. cycleKey = "2026-07-13"

¿Ya pagué?
SELECT 1 FROM Transaction WHERE subscriptionId = ? AND cycleKey = "2026-07-13"
```

### 2.3 Cómo se usa en cada módulo

```
DASHBOARD (Pagos pendientes):
  ledger.getPendingPayments(userId)
    → itera subs activas, calcula nextDueDate, verifica cycleKey
    → itera tarjetas crédito, calcula ciclo actual, verifica pago
    → devuelve solo los no pagados

ALERTAS:
  ledger.getPendingPayments(userId)
    → filtra por los que están en los próximos 7 días o vencidos
    → mismo cálculo que dashboard

PUSH NOTIFICATIONS:
  ledger.getPendingPayments(userId) [misma función]
    → filtra por urgentes (mismo día, 1 día antes)

CALENDARIO:
  ledger.getCalendarEvents(userId, año, mes)
    → para cada sub activa: calcula nextDueDate/nextDeadline
    → para cada tarjeta: calcula fechas de corte y pago
```

---

## 3. API que cambia

### 3.1 Nuevo: GET /api/dashboard

```typescript
// Reemplaza las 7 llamadas actuales del dashboard
export async function GET(request: NextRequest) {
  const userId = await getUserId(request);
  
  const [balance, monthStats, pendingPayments, goals, cards, profile] = await Promise.all([
    ledger.getBalance(userId),
    ledger.getMonthStats(userId, year, month),
    ledger.getPendingPayments(userId),
    prisma.goal.findMany({ where: { userId, deletedAt: null }, take: 3 }),
    prisma.creditCard.count({ where: { userId, deletedAt: null } }),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);

  return NextResponse.json({
    balance,
    monthIncome: monthStats.income,
    monthExpenses: monthStats.expenses,
    pendingPayments,
    goals,
    cardsCount: cards,
    userName: profile?.name,
  });
}
```

**Dashboard frontend: 1 fetch en vez de 7.**

### 3.2 Modificado: POST /api/transactions

```typescript
export async function POST(request: NextRequest) {
  const { subscriptionId, ...body } = await request.json();

  // Si es un pago de gasto fijo, calcular cycleKey
  let cycleKey = null;
  if (subscriptionId) {
    const sub = await prisma.recurringPayment.findUnique({ where: { id: subscriptionId } });
    if (sub) {
      cycleKey = ledger.getCycleKey(new Date(), sub.frequency);
    }
  }

  const tx = await prisma.transaction.create({
    data: {
      userId, type: body.type, amount: body.amount,
      description: body.description, date: new Date(body.date),
      categoryId, accountId: "default",
      subscriptionId: subscriptionId || null,
      cycleKey,
    },
  });

  return NextResponse.json(tx);
}
```

**Ya no toca FinancialAccount. Ya no avanza dueDate.**

### 3.3 Modificado: DELETE /api/transactions/[id]

Sin cambios en la lógica. Soft delete normal. Al desaparecer la transacción, `cycleKey` queda libre. La próxima consulta de `getPendingPayments` lo detecta como no pagado.

### 3.4 Se eliminan

| Endpoint | Motivo |
|---|---|
| `GET /api/accounts` | Balance se incluye en dashboard |
| `POST /api/subscriptions/sync` | Ya no necesario — fechas se calculan |
| `PUT /api/subscriptions/[id]` (avance de fecha) | Ya no se avanza fecha |

---

## 4. Cambios en Frontend

### 4.1 Dashboard

- 1 fetch a `/api/dashboard` en vez de 7
- `data.pendingPayments` ya viene filtrado del servidor
- Sin `allTxs`, sin `paidThisCycle`, sin cálculos de fecha en frontend

### 4.2 Gastos fijos

- `handlePay`: solo llama a `POST /api/transactions` con `subscriptionId`
- `handleSkip`: solo llama a `POST /api/transactions` con `subscriptionId` + amount=0
- Sin avance de `dueDate`, sin `paidThisCycle` state
- El botón de sincronizar (🔄) desaparece
- Botón "Posponer pago (sin registrar)" se mantiene

### 4.3 Alertas / Push / Calendario

- Usan `ledger.getPendingPayments()` desde el servidor
- Sin cálculos de fecha duplicados

---

## 5. Fases de implementación

### Fase 1: DB + ledger.ts (30 min)

1. Agregar columnas a Transaction y RecurringPayment
2. Ejecutar migración SQL
3. Crear `src/lib/ledger.ts` con todas las funciones
4. Probar `getBalance()`, `getMonthStats()`, `getPendingPayments()` con datos reales

**Hito: ledger.ts funciona con datos existentes**

### Fase 2: Nuevo dashboard API (15 min)

1. Crear `GET /api/dashboard`
2. Actualizar `dashboard/page.tsx` a 1 fetch
3. Verificar que balance, ingresos/gastos, pagos pendientes son correctos

**Hito: Dashboard muestra datos correctos con nuevo sistema**

### Fase 3: Refactor transactions (15 min)

1. Actualizar `POST /api/transactions` para cycleKey
2. Actualizar `handlePay` y `handleSkip` en gastos-fijos
3. Eliminar `FinancialAccount` del schema y rate limiter

**Hito: Pagar un gasto fijo crea Transaction con cycleKey**

### Fase 4: Alertas + Push + Calendario (15 min)

1. Actualizar `api/alerts` para usar `ledger.getPendingPayments()`
2. Actualizar `api/notifications/check` para usar `ledger`
3. Actualizar calendario para usar `ledger.getCalendarEvents()`

**Hito: Alertas, push y calendario sincronizados**

### Fase 5: Limpieza (10 min)

1. Eliminar código muerto (cálculos de fecha duplicados en 4 archivos)
2. Eliminar botón sync (🔄)
3. Eliminar `/api/accounts`, `FinancialAccount`
4. Verificar build sin errores

**Hito: Código limpio, build OK**

---

## 6. Verificación post-implementación

### Casos de prueba

| # | Acción | Resultado esperado |
|---|---|---|
| 1 | Crear ingreso de $1000 | Balance = $1000, Ingresos mes = $1000 |
| 2 | Crear gasto de $200 | Balance = $800, Gastos mes = $200 |
| 3 | Pagar Netflix ($50, suscripción) | Netflix desaparece de pagos pendientes |
| 4 | Borrar pago de Netflix | Netflix reaparece en pagos pendientes |
| 5 | Pagar tarjeta crédito (en ventana de pago) | Tarjeta desaparece de pagos pendientes |
| 6 | Abrir dashboard con 100+ transacciones | Ingresos/gastos del mes correctos (no limitados a 15) |
| 7 | Centro de alertas | Solo muestra pagos NO realizados |
| 8 | Push notification | Solo envía alertas de pagos NO realizados |

---

## 7. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Migración falla en producción | Hacer backup de BD antes. Las columnas nuevas son nullable — no rompen nada existente |
| `ledger.ts` da resultados distintos a los actuales | Comparar con datos reales antes de desplegar. Fase 1 es solo lectura |
| Performance con muchos usuarios | Índices compuestos. SQL SUM es O(log n). Probar con 100k transacciones |
| Romper calendario | `getCalendarEvents()` mantiene misma interfaz de salida |

---

## 8. Rollback

Si algo falla en producción:

```sql
-- Revertir columnas nuevas
ALTER TABLE Transaction DROP COLUMN subscriptionId;
ALTER TABLE Transaction DROP COLUMN cycleKey;
ALTER TABLE RecurringPayment DROP COLUMN firstDueDate;

-- Restaurar balance (si FinancialAccount aún no se eliminó)
-- Nada más que tocar — las columnas eran nullable
```

Las fases 1-2 no son destructivas. Solo la Fase 5 elimina cosas.

---

**Tiempo total estimado: 1.5 horas**

**¿Aprobado?**
