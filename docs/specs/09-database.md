# 09 - Schema Database

## 9.1 Diagramma Entita'

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│    Member     │────<│ MemberQualification│>────│ Qualification│
│              │     └──────────────────┘     └──────┬───────┘
│  id          │                                      │
│  email       │     ┌──────────────────┐             │
│  firstName   │     │AircraftQualif.   │>────────────┘
│  lastName    │     └────────┬─────────┘
│  password    │              │
│  roles[]     │     ┌────────┴─────────┐
│  ...         │     │    Aircraft      │
└──────┬───────┘     │                  │
       │             │  id              │
       │             │  callsign        │
       │             │  type            │
       │             │  seats           │
       │             │  ...             │
       │             └────────┬─────────┘
       │                      │
       │     ┌────────────────┴────────────────┐
       │     │           Booking               │
       └────>│                                 │
             │  id, startDate, endDate         │
             │  aircraftId, memberId           │
             │  slotType, instructorId         │
             │  ...                            │
             └─────────────────────────────────┘
                              ^
       ┌──────────────┐       │
       │  Instructor   │──────┘
       │               │
       │  id, memberId │     ┌─────────────────────┐
       │  trigram       │────<│ RegularAvailability  │
       │               │     └─────────────────────┘
       │               │     ┌─────────────────────┐
       │               │────<│ AvailabilityException│
       └───────────────┘     └─────────────────────┘

┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   ClubConfig  │  │   AuditLog   │  │  RefreshToken │
└──────────────┘  └──────────────┘  └──────────────┘

┌──────────────┐  ┌──────────────┐
│    Role      │  │  IcaoAirfield │
│  permissions │  │  lat, lon    │
└──────────────┘  └──────────────┘
```

## 9.2 Tabelle

### members

```sql
CREATE TABLE members (
  id            TEXT PRIMARY KEY DEFAULT cuid(),
  email         TEXT UNIQUE NOT NULL,
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  fiscal_code   TEXT,
  date_of_birth DATE,
  address       TEXT,
  zip_code      TEXT,
  city          TEXT,
  state         TEXT,
  country       TEXT DEFAULT 'IT',
  home_phone    TEXT,
  work_phone    TEXT,
  cell_phone    TEXT,
  member_number TEXT,
  subscription_expiry DATE,
  email_verified BOOLEAN DEFAULT FALSE,
  active        BOOLEAN DEFAULT TRUE,
  language      TEXT DEFAULT 'it',
  timezone      TEXT DEFAULT 'Europe/Rome',
  notification_enabled BOOLEAN DEFAULT TRUE,
  privacy_flags INTEGER DEFAULT 0,  -- bitmask per visibilita' contatti
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### member_roles (junction)

```sql
CREATE TABLE member_roles (
  member_id TEXT REFERENCES members(id) ON DELETE CASCADE,
  role_id   TEXT REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (member_id, role_id)
);
```

### roles

```sql
CREATE TABLE roles (
  id          TEXT PRIMARY KEY DEFAULT cuid(),
  name        TEXT UNIQUE NOT NULL,
  permissions TEXT[] NOT NULL DEFAULT '{}',  -- array di stringhe permesso
  is_system   BOOLEAN DEFAULT FALSE,        -- ruoli predefiniti non eliminabili
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### aircraft

```sql
CREATE TABLE aircraft (
  id            TEXT PRIMARY KEY DEFAULT cuid(),
  callsign      TEXT UNIQUE NOT NULL,
  type          TEXT NOT NULL,
  seats         INTEGER NOT NULL CHECK (seats > 0),
  hourly_rate   DECIMAL(10,2),
  non_bookable  BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  comments      TEXT,
  active        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### bookings

```sql
CREATE TABLE bookings (
  id            TEXT PRIMARY KEY DEFAULT cuid(),
  start_date    TIMESTAMPTZ NOT NULL,
  end_date      TIMESTAMPTZ NOT NULL,
  aircraft_id   TEXT NOT NULL REFERENCES aircraft(id),
  member_id     TEXT NOT NULL REFERENCES members(id),
  slot_type     TEXT NOT NULL CHECK (slot_type IN ('SOLO', 'DUAL', 'MAINTENANCE')),
  instructor_id TEXT REFERENCES members(id),
  free_seats    INTEGER DEFAULT 0,
  comments      TEXT,
  created_by    TEXT NOT NULL REFERENCES members(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_dates CHECK (end_date > start_date),
  CONSTRAINT instructor_for_dual CHECK (
    (slot_type = 'DUAL' AND instructor_id IS NOT NULL) OR
    (slot_type != 'DUAL')
  ),
  CONSTRAINT different_persons CHECK (member_id != instructor_id)
);

-- Indici per performance
CREATE INDEX idx_bookings_dates ON bookings (start_date, end_date);
CREATE INDEX idx_bookings_aircraft ON bookings (aircraft_id, start_date, end_date);
CREATE INDEX idx_bookings_member ON bookings (member_id, start_date);
CREATE INDEX idx_bookings_instructor ON bookings (instructor_id, start_date);
```

### qualifications

```sql
CREATE TABLE qualifications (
  id          TEXT PRIMARY KEY DEFAULT cuid(),
  name        TEXT UNIQUE NOT NULL,
  has_expiry  BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### member_qualifications

```sql
CREATE TABLE member_qualifications (
  id               TEXT PRIMARY KEY DEFAULT cuid(),
  member_id        TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  qualification_id TEXT NOT NULL REFERENCES qualifications(id) ON DELETE CASCADE,
  expiry_date      DATE,
  no_alert         BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (member_id, qualification_id)
);
```

### aircraft_qualifications

```sql
CREATE TABLE aircraft_qualifications (
  id               TEXT PRIMARY KEY DEFAULT cuid(),
  aircraft_id      TEXT NOT NULL REFERENCES aircraft(id) ON DELETE CASCADE,
  check_group      INTEGER NOT NULL,  -- AND tra gruppi, OR nello stesso gruppo
  qualification_id TEXT NOT NULL REFERENCES qualifications(id) ON DELETE CASCADE,

  UNIQUE (aircraft_id, check_group, qualification_id)
);
```

### instructors

```sql
CREATE TABLE instructors (
  id            TEXT PRIMARY KEY DEFAULT cuid(),
  member_id     TEXT UNIQUE NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  trigram       TEXT UNIQUE NOT NULL CHECK (length(trigram) = 3),
  display_order INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### regular_availability

```sql
CREATE TABLE regular_availability (
  id            TEXT PRIMARY KEY DEFAULT cuid(),
  instructor_id TEXT NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
  start_day     INTEGER NOT NULL CHECK (start_day BETWEEN 0 AND 6),
  start_time    TIME NOT NULL,
  end_day       INTEGER NOT NULL CHECK (end_day BETWEEN 0 AND 6),
  end_time      TIME NOT NULL
);
```

### availability_exceptions

```sql
CREATE TABLE availability_exceptions (
  id            TEXT PRIMARY KEY DEFAULT cuid(),
  instructor_id TEXT NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
  start_date    TIMESTAMPTZ NOT NULL,
  end_date      TIMESTAMPTZ NOT NULL,
  is_present    BOOLEAN NOT NULL,

  CONSTRAINT valid_exception_dates CHECK (end_date > start_date)
);
```

### club_config

```sql
CREATE TABLE club_config (
  id                          TEXT PRIMARY KEY DEFAULT 'default',
  club_name                   TEXT NOT NULL,
  club_logo                   BYTEA,
  club_logo_mime              TEXT,
  club_website                TEXT,
  icao_code                   TEXT,
  first_hour                  TIME DEFAULT '07:00',
  last_hour                   TIME DEFAULT '21:00',
  default_timezone            TEXT DEFAULT 'Europe/Rome',
  default_language            TEXT DEFAULT 'it',
  default_slot_duration       INTEGER DEFAULT 60,
  min_slot_duration           INTEGER DEFAULT 30,
  info_message                TEXT,
  mail_from_address           TEXT,
  book_date_limit_weeks       INTEGER DEFAULT 4,
  book_duration_limit_hours   INTEGER DEFAULT 0,
  book_instruction_min_minutes INTEGER DEFAULT 0,
  book_allocating_rule        TEXT DEFAULT 'SPECIFIC' CHECK (book_allocating_rule IN ('SPECIFIC', 'BY_TYPE')),
  book_comment_enabled        BOOLEAN DEFAULT FALSE,
  qualification_mode          TEXT DEFAULT 'OFF' CHECK (qualification_mode IN ('OFF', 'WARNING', 'RESTRICTED')),
  subscription_mode           TEXT DEFAULT 'OFF' CHECK (subscription_mode IN ('OFF', 'WARNING', 'RESTRICTED')),
  registration_mode           TEXT DEFAULT 'INVITE' CHECK (registration_mode IN ('OPEN', 'INVITE', 'DISABLED')),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);
```

### audit_logs

```sql
CREATE TABLE audit_logs (
  id         TEXT PRIMARY KEY DEFAULT cuid(),
  timestamp  TIMESTAMPTZ DEFAULT NOW(),
  user_id    TEXT REFERENCES members(id),
  action     TEXT NOT NULL,
  entity     TEXT NOT NULL,
  entity_id  TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT
);

CREATE INDEX idx_audit_timestamp ON audit_logs (timestamp DESC);
CREATE INDEX idx_audit_user ON audit_logs (user_id, timestamp DESC);
CREATE INDEX idx_audit_entity ON audit_logs (entity, entity_id, timestamp DESC);
```

### refresh_tokens

```sql
CREATE TABLE refresh_tokens (
  id         TEXT PRIMARY KEY DEFAULT cuid(),
  member_id  TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked    BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_refresh_tokens_member ON refresh_tokens (member_id);
```

### icao_airfields

```sql
CREATE TABLE icao_airfields (
  icao_code TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  latitude  DECIMAL(10,6) NOT NULL,
  longitude DECIMAL(10,6) NOT NULL,
  altitude  INTEGER DEFAULT 0
);
```

### sunrise_sunset_cache

```sql
CREATE TABLE sunrise_sunset_cache (
  date      DATE NOT NULL,
  icao_code TEXT NOT NULL REFERENCES icao_airfields(icao_code),
  sunrise   TIMESTAMPTZ,
  sunset    TIMESTAMPTZ,
  aero_dawn TIMESTAMPTZ,
  aero_dusk TIMESTAMPTZ,
  PRIMARY KEY (date, icao_code)
);
```

### login_attempts

```sql
CREATE TABLE login_attempts (
  id         TEXT PRIMARY KEY DEFAULT cuid(),
  identifier TEXT NOT NULL,  -- email o IP
  type       TEXT NOT NULL CHECK (type IN ('email', 'ip')),
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  success    BOOLEAN NOT NULL
);

CREATE INDEX idx_login_attempts ON login_attempts (identifier, type, attempted_at DESC);
```

## 9.3 Note Implementative

- Tutti i timestamp sono `TIMESTAMPTZ` (UTC con timezone)
- Le chiavi primarie usano `cuid()` per generazione distribuita
- Gli indici sono definiti sulle colonne usate nei filtri e JOIN piu' frequenti
- Le foreign key hanno `ON DELETE CASCADE` dove appropriato
- I vincoli CHECK garantiscono l'integrita' a livello database
- JSONB per i valori di audit (flessibile per campi diversi per entita')
