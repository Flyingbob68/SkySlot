# SkySlot

Sistema web per la gestione di aeroclub: prenotazione aeromobili, gestione soci, pianificazione istruttori, tracciamento qualifiche e amministrazione del club.

Riscrittura moderna di [OpenFlyers](http://www.openflyers.com/) (PHP/MySQL), reimplementata con stack Node.js + React + PostgreSQL.

## Stack tecnologico

| Layer | Tecnologia |
|-------|-----------|
| Backend | Express 5 + TypeScript + Zod v4 |
| ORM | Prisma 7 (PostgreSQL) |
| Frontend | React 19 + Vite 7 + TypeScript |
| UI | shadcn/ui + Tailwind CSS v4 |
| State management | Zustand |
| Autenticazione | JWT (access 15min + refresh 7d) + OAuth Google |
| Testing | Vitest + Playwright |
| Deploy | PM2 + nginx + systemd |

## Funzionalita'

- **Prenotazione aeromobili** - Calendario visuale con griglia giornaliera/settimanale, gestione conflitti, allocazione automatica, slot da 15 minuti
- **Gestione soci** - Anagrafica completa, profili, quote associative, import/export CSV, directory pubblica
- **Gestione istruttori** - Disponibilita' settimanale ricorrente, eccezioni, assegnazione voli doppio comando
- **Qualifiche e licenze** - Tracciamento scadenze, requisiti per aeromobile (logica AND/OR), alert automatici
- **Amministrazione club** - Configurazione centralizzata, gestione ruoli/permessi, audit log, statistiche
- **Notifiche email** - Conferme prenotazione, alert scadenze qualifiche e abbonamenti
- **Autenticazione** - Registrazione, login con email/password, OAuth Google, reset password, refresh token rotation

## Struttura progetto

```
SkySlot/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # 15 modelli, 5 enum
│   │   └── seed.ts              # Dati iniziali (ruoli, config, admin)
│   └── src/
│       ├── config/              # Variabili ambiente (Zod validation)
│       ├── controllers/         # Request handler per modulo
│       ├── middleware/          # Auth, rate limiting, validazione
│       ├── repositories/       # Data access layer (Prisma)
│       ├── routes/             # Definizione endpoint Express
│       ├── schemas/            # Schemi Zod per validazione input
│       ├── services/           # Business logic
│       ├── types/              # TypeScript types e DTO
│       └── utils/              # Utilita' condivise
├── frontend/
│   └── src/
│       ├── components/         # Componenti UI riutilizzabili
│       ├── hooks/              # Custom React hooks
│       ├── layouts/            # AppLayout (sidebar) + AuthLayout
│       ├── pages/              # Pagine per modulo
│       ├── services/           # Client API
│       ├── stores/             # Zustand stores
│       ├── types/              # TypeScript types
│       └── utils/              # Utilita' frontend
├── deploy/                     # Configurazione deploy Linux
│   ├── ecosystem.config.cjs    # PM2
│   ├── nginx.conf              # Reverse proxy
│   ├── skyslot.service         # systemd unit
│   └── setup.sh                # Script setup server
└── docs/specs/                 # Specifiche funzionali (9 documenti)
```

## Moduli

| Modulo | Endpoint API | Descrizione |
|--------|-------------|-------------|
| Auth | `/api/auth/*` | Login, registrazione, OAuth, reset password |
| Members | `/api/members/*` | CRUD soci, directory, import/export CSV |
| Aircraft | `/api/aircraft/*` | Gestione flotta, freeze/unfreeze |
| Bookings | `/api/bookings/*` | Prenotazioni, calendario, validazione conflitti |
| Qualifications | `/api/qualifications/*` | Definizioni, assegnazione soci, report scadenze |
| Instructors | `/api/instructors/*` | Istruttori, disponibilita', eccezioni |
| Admin | `/api/admin/*` | Configurazione club, ruoli, audit log, statistiche |
| Notifications | `/api/notifications/*` | Preferenze notifiche email |

## Prerequisiti

- **Node.js** >= 20.0.0
- **PostgreSQL** >= 15
- **npm** >= 9

## Setup

### 1. Clona il repository

```bash
git clone https://github.com/Flyingbob68/SkySlot.git
cd SkySlot
```

### 2. Installa le dipendenze

```bash
npm install
```

### 3. Configura le variabili d'ambiente

Crea il file `backend/.env`:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/skyslot

# JWT
JWT_SECRET=una-stringa-segreta-di-almeno-32-caratteri
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Server
PORT=3000
CORS_ORIGIN=http://localhost:5173

# Bcrypt
BCRYPT_ROUNDS=12

# OAuth Google (opzionale)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# SMTP (opzionale)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@tuoaeroclub.it
```

### 4. Inizializza il database

```bash
# Crea il database PostgreSQL
createdb skyslot

# Esegui le migration
npm run db:migrate

# Popola i dati iniziali (ruoli, config, utente admin)
npm run db:seed
```

### 5. Avvia in sviluppo

```bash
# Backend + Frontend in parallelo
npm run dev

# Oppure separatamente
npm run dev:backend    # http://localhost:3000
npm run dev:frontend   # http://localhost:5173
```

## Comandi principali

```bash
# Sviluppo
npm run dev                # Avvia backend + frontend
npm run dev:backend        # Solo backend (Express + tsx watch)
npm run dev:frontend       # Solo frontend (Vite)

# Build
npm run build              # Build entrambi
npm run build:backend      # Solo backend (tsc)
npm run build:frontend     # Solo frontend (Vite build)

# Test
npm run test               # Tutti i test (Vitest)
npm run test:backend       # Solo backend
npm run test:frontend      # Solo frontend

# Database
npm run db:migrate         # Esegui migration Prisma
npm run db:seed            # Seed dati iniziali

# Lint
npm run lint               # ESLint su entrambi
```

## Modello dati

Il database PostgreSQL comprende 15 modelli:

```
Member ──┬── MemberRole ──── Role
         ├── MemberQualification ──── Qualification
         ├── Instructor ──┬── RegularAvailability
         │                └── AvailabilityException
         ├── Booking ──── Aircraft
         ├── RefreshToken
         └── AuditLog

Aircraft ──── AircraftQualification ──── Qualification

ClubConfig (singleton)
IcaoAirfield ──── SunriseSunsetCache
LoginAttempt
```

Convenzioni: ID `cuid()`, timestamp `createdAt`/`updatedAt`, snake_case sulle tabelle via `@@map()`.

## Architettura

- **Repository pattern**: ogni modulo ha un repository dedicato che incapsula le query Prisma
- **API envelope**: tutte le risposte seguono il formato `{ success, data, error, meta? }`
- **Event bus**: comunicazione cross-modulo via EventEmitter tipizzato (booking, member, auth, qualification events)
- **Pessimistic locking**: `SELECT FOR UPDATE` nelle transazioni di prenotazione
- **Validazione**: Zod v4 su tutti gli input a livello di route/controller
- **Immutabilita'**: gli oggetti non vengono mai mutati, si creano copie con le modifiche

## Deploy (Linux)

La cartella `deploy/` contiene la configurazione per il deploy su un server Linux:

```bash
# Sul server
chmod +x deploy/setup.sh
./deploy/setup.sh

# Gestione servizio
sudo systemctl start skyslot
sudo systemctl status skyslot
```

Componenti: PM2 (process manager), nginx (reverse proxy + static files), systemd (supervisione).

## Licenza

Progetto privato. Tutti i diritti riservati.
