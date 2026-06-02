# Sistema de Recompensas Orientado a Eventos

Sistema de recompensas para consumos en restaurantes. Está implementado como un monorepo con dos microservicios independientes construidos con NestJS, TypeScript, TypeORM, PostgreSQL y RabbitMQ.

## Arquitectura General

El Servicio de Transacciones registra un consumo y publica el evento `transaction.created`. El Servicio de Recompensas consume ese evento, calcula los beneficios, actualiza la cuenta del cliente y publica `reward.processed`.

```mermaid
flowchart LR
    client[Sistema del Restaurante] -->|POST /transactions| tx[MS Transacciones]
    tx --> txdb[(PostgreSQL Transacciones)]
    tx -->|transaction.created| mq[(RabbitMQ)]
    mq -->|transaction.created.queue| rewards[MS Recompensas]
    rewards --> rewardsdb[(PostgreSQL Recompensas)]
    rewards -->|reward.processed| mq
```

Cada microservicio es dueño de su base de datos. No existen consultas directas entre bases de datos ni llamadas HTTP entre microservicios.

### MS Transacciones

Recibe solicitudes HTTP, valida los datos, persiste la transacción y registra
el evento saliente en un outbox.

```mermaid
flowchart LR
    rest[TransactionsController] --> uc[CreateTransactionUseCase]
    uc --> aggregate[RestaurantTransaction]
    aggregate --> values[Money, CustomerCardNumber, RestaurantCode]
    uc --> port[CreateTransactionGateway]
    port --> repo[TypeOrmCreateTransactionGateway]
    repo --> db[(PostgreSQL)]
    publisher[RabbitMqOutboxPublisher] --> db
    publisher --> mq[(RabbitMQ)]
```

| Clase | Responsabilidad |
| --- | --- |
| `RestaurantTransaction` | Agregado raíz de una transacción válida |
| `Money` | Valida montos positivos con máximo dos decimales |
| `CustomerCardNumber` | Valida identificadores de cliente de 9 a 32 dígitos |
| `RestaurantCode` | Valida códigos de restaurante |
| `CreateTransactionUseCase` | Orquesta la creación de la transacción |
| `CreateTransactionGateway` | Puerto de salida de la aplicación |
| `TypeOrmCreateTransactionGateway` | Guarda transacción y outbox atómicamente |
| `TransactionsController` | Adaptador REST |
| `RabbitMqOutboxPublisher` | Publica eventos pendientes confirmados por RabbitMQ |

### MS Recompensas

Consume eventos, calcula beneficios, actualiza saldos y registra el evento de
recompensa procesada.

```mermaid
flowchart LR
    mq[(RabbitMQ)] --> consumer[RabbitMqTransactionConsumer]
    consumer --> uc[ProcessRewardUseCase]
    uc --> calculator[RewardCalculator]
    uc --> port[ProcessRewardGateway]
    port --> repo[TypeOrmProcessRewardGateway]
    repo --> db[(PostgreSQL)]
    publisher[RabbitMqOutboxPublisher] --> db
    publisher --> mq
```

| Clase | Responsabilidad |
| --- | --- |
| `RewardCalculator` | Calcula puntos y cashback |
| `RewardAccount` | Aplica recompensas al saldo acumulado |
| `ProcessRewardUseCase` | Orquesta el procesamiento de recompensas |
| `ProcessRewardGateway` | Puerto de salida de la aplicación |
| `TypeOrmProcessRewardGateway` | Guarda cuenta, recompensa, inbox y outbox atómicamente |
| `RabbitMqTransactionConsumer` | Consume y valida `transaction.created` |
| `RabbitMqOutboxPublisher` | Publica eventos `reward.processed` pendientes |

## Casos de Uso

### Registrar Transacción

1. El cliente envía `POST /transactions`.
2. El controlador valida el DTO.
3. El caso de uso crea el agregado `RestaurantTransaction`.
4. Se guardan la transacción y el evento outbox en una única transacción SQL.
5. Se devuelve el UUID de la transacción.
6. El publicador outbox envía `transaction.created` a RabbitMQ.

### Procesar Recompensa

1. RabbitMQ entrega `transaction.created`.
2. El consumidor valida el evento y verifica que no haya sido procesado.
3. `RewardCalculator` calcula puntos y cashback.
4. Se guardan la cuenta, recompensa, inbox y outbox en una única transacción SQL.
5. El consumidor confirma el mensaje.
6. El publicador outbox envía `reward.processed`.

## Reglas de Recompensa

```text
puntos   = floor(monto / 10)
cashback = round(monto * 0.02, 2)
```

| Consumo | Puntos | Cashback |
| ---: | ---: | ---: |
| `9.99` | `0` | `0.20` |
| `100.00` | `10` | `2.00` |
| `125.75` | `12` | `2.52` |

Los cálculos usan `decimal.js` y la persistencia usa `numeric(12, 2)`.

## API REST

### `POST /transactions`

Registra un consumo:

```json
{
  "amount": 100,
  "cardNumber": "123456789",
  "restaurantCode": "REST001"
}
```

Respuesta `201 Created`:

```json
{
  "transactionId": "uuid-generado"
}
```

Se rechazan montos no positivos, montos con más de dos decimales, tarjetas con
menos de 9 o más de 32 dígitos y códigos de restaurante inválidos.

## Confiabilidad

RabbitMQ entrega mensajes al menos una vez. El sistema usa Outbox
Transaccional e Inbox Idempotente para evitar pérdida de eventos y recompensas
duplicadas.

```mermaid
sequenceDiagram
    actor Cliente as Sistema del Restaurante
    participant TX as MS Transacciones
    participant TXDB as PostgreSQL Transacciones
    participant MQ as RabbitMQ
    participant RW as MS Recompensas
    participant RWDB as PostgreSQL Recompensas

    Cliente->>TX: POST /transactions
    TX->>TXDB: insertar transacción + outbox
    TXDB-->>TX: confirmar transacción
    TX-->>Cliente: 201 { transactionId }
    TX->>MQ: publicar transaction.created
    MQ-->>TX: confirmación
    MQ->>RW: entregar transaction.created
    RW->>RWDB: validar inbox + actualizar cuenta + guardar recompensa + outbox
    RWDB-->>RW: confirmar transacción
    RW-->>MQ: confirmar mensaje
    RW->>MQ: publicar reward.processed
    MQ-->>RW: confirmación
```

Medidas implementadas:

- Escrituras de negocio y outbox atómicas.
- Inbox por `eventId` para ignorar entregas duplicadas.
- `transaction_id` único en recompensas.
- Confirmaciones del publicador RabbitMQ.
- Dead-letter queue para mensajes inválidos.
- Bloqueo pesimista y columna de versión para actualizar cuentas.

## Modelo de Datos

```mermaid
erDiagram
    TRANSACTIONS {
        uuid id PK
        numeric amount
        varchar card_number
        varchar restaurant_code
        timestamptz transaction_date
        timestamptz created_at
    }
    TX_OUTBOX {
        uuid id PK
        varchar event_type
        jsonb payload
        timestamptz created_at
        timestamptz published_at
        int attempts
    }
    REWARD_ACCOUNTS ||--o{ REWARDS : recibe
    REWARD_ACCOUNTS {
        uuid id PK
        varchar customer_card_number UK
        int total_points
        numeric total_cashback
        int version
    }
    REWARDS {
        uuid id PK
        uuid transaction_id UK
        varchar customer_card_number
        int points
        numeric cashback
        timestamptz reward_date
    }
    REWARD_INBOX {
        uuid event_id PK
        timestamptz processed_at
    }
    REWARD_OUTBOX {
        uuid id PK
        varchar event_type
        jsonb payload
        timestamptz created_at
        timestamptz published_at
        int attempts
    }
```

### Base de Datos de Transacciones

Propiedad de MS Transacciones. Inicializada por
`ms-restaurant/database/init.sql`.

| Tabla | Propósito |
| --- | --- |
| `transactions` | Historial de consumos |
| `outbox_messages` | Eventos `transaction.created` pendientes o publicados |

### Base de Datos de Recompensas

Propiedad de MS Recompensas. Inicializada por `ms-rewards/database/init.sql`.

| Tabla | Propósito |
| --- | --- |
| `reward_accounts` | Saldo acumulado por cliente |
| `rewards` | Historial de recompensas |
| `inbox_messages` | Eventos procesados para evitar duplicados |
| `outbox_messages` | Eventos `reward.processed` pendientes o publicados |

## Despliegue

```mermaid
flowchart TB
    client[Sistema del Restaurante]
    tx[Contenedor MS Transacciones]
    rw[Contenedor MS Recompensas]
    txdb[(Contenedor PostgreSQL Transacciones)]
    rwdb[(Contenedor PostgreSQL Recompensas)]
    mq[(RabbitMQ configurado por RABBITMQ_URL)]

    client -->|HTTP :3000| tx
    tx --> txdb
    tx --> mq
    mq --> rw
    rw --> rwdb
    rw --> mq
```

La configuración se centraliza en un único archivo `.env` raíz ignorado por
Git. Cree su archivo local desde la plantilla versionada:

```bash
cp .env.example .env
```

Variables disponibles:

| Variable | Propósito | Requerida |
| --- | --- | --- |
| `RABBITMQ_URL` | Conexión AMQP o AMQPS al broker | Sí |
| `RABBITMQ_EXCHANGE` | Exchange RabbitMQ | No, default: `rewards.exchange` |
| `TRANSACTION_QUEUE` | Cola consumida por MS Recompensas | No, default: `transaction.created.queue` |
| `RESTAURANT_PORT` | Puerto HTTP de MS Transacciones | No, default: `3000` |
| `TRANSACTIONS_DB_*` | Nombre, usuario, contraseña, host interno y puerto local de PostgreSQL | No, poseen defaults locales |
| `TRANSACTIONS_DATABASE_URL` | PostgreSQL de transacciones | Sí al ejecutar sin Docker |
| `REWARDS_PORT` | Puerto de MS Recompensas | No, default: `3001` |
| `REWARDS_DB_*` | Nombre, usuario, contraseña, host interno y puerto local de PostgreSQL | No, poseen defaults locales |
| `REWARDS_DATABASE_URL` | PostgreSQL de recompensas | Sí al ejecutar sin Docker |
| `DB_SYNCHRONIZE` | Sincronización automática TypeORM | No, default: `false` |

Las credenciales RabbitMQ no se almacenan en Git. Configure como mínimo:

```dotenv
RABBITMQ_URL=amqp://<usuario>:<contrasena>@<host>:<puerto>/<virtual_host_codificado>
```

Para el virtual host `/`, use `%2F`:

```dotenv
RABBITMQ_URL=amqp://<usuario>:<contrasena>@<host>:5672/%2F
```

Ejecute:

```bash
docker compose up --build
```

Pruebe el flujo:

```bash
curl -X POST http://localhost:3000/transactions \
  -H 'Content-Type: application/json' \
  -d '{"amount":100,"cardNumber":"123456789","restaurantCode":"REST001"}'
```

## Pruebas y Calidad

Pruebas unitarias, cobertura y compilación:

```bash
cd ms-restaurant
pnpm install
pnpm exec eslint "{src,test}/**/*.ts"
pnpm run test:cov --runInBand
pnpm run build

cd ../ms-rewards
pnpm install
pnpm exec eslint "{src,test}/**/*.ts"
pnpm run test:cov --runInBand
pnpm run build
```

Pruebas de integración con PostgreSQL y RabbitMQ disponibles:

```bash
RUN_STACK_INTEGRATION=true pnpm run test
```

Pruebas E2E con el stack Docker activo:

```bash
RUN_STACK_E2E=true pnpm run test:e2e
```

El pipeline de GitHub Actions ejecuta formato, lint, cobertura, integración y compilación. Para las pruebas usa PostgreSQL y RabbitMQ efímeros, sin depender de credenciales externas.
