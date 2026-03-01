# Legacy Migration: OpenFlyers → SkySlot

## Overview

This directory contains tools to migrate data from the old OpenFlyers 1.3.1 PHP/MySQL
booking system to the new SkySlot PostgreSQL database.

## Files

| File | Description |
|------|-------------|
| `legacy-schema.sql` | Complete MySQL schema of the old database (reverse-engineered from PHP source) |
| `migrate-legacy.ts` | TypeScript script that reads from old MySQL and outputs PostgreSQL INSERT statements |
| `README.md` | This file |

## Prerequisites

1. **MySQL dump** of the old `pren_sql` database. If the old server is still accessible:
   ```bash
   mysqldump -u aecfi -p pren_sql > legacy-dump.sql
   ```

2. **Local MySQL** to import the dump:
   ```bash
   mysql -u root -p -e "CREATE DATABASE pren_sql"
   mysql -u root -p pren_sql < legacy-dump.sql
   ```

3. **mysql2 npm package**:
   ```bash
   npm install mysql2 --save-dev
   ```

## Usage

### Generate SQL file

```bash
LEGACY_MYSQL_URL="mysql://root:password@localhost:3306/pren_sql" \
MIGRATION_OUTPUT=sql \
npx tsx prisma/legacy/migrate-legacy.ts > migration-output.sql
```

Review the generated `migration-output.sql`, then apply it:

```bash
psql -h localhost -U skyslot -d skyslot -f migration-output.sql
```

## Schema Mapping

### Old → New Table Mapping

| Old Table (MySQL) | New Table (PostgreSQL) | Notes |
|---|---|---|
| `authentication` | `members` | Main user table; login/password/profile fields restructured |
| `members` | `members.member_number`, `members.subscription_expiry` | Merged into members table |
| `instructors` | `instructors` | 1:1 mapping |
| `aircrafts` | `aircraft` | Singular table name |
| `booking` | `bookings` | Plural; added `created_by` field |
| `qualification` | `qualifications` | Plural |
| `member_qualif` | `member_qualifications` | Full name |
| `aircraft_qualif` | `aircraft_qualifications` | Full name |
| `profiles` | `roles` | Permission model changed from bitmask to string array |
| `clubs` | `club_config` | Single-row config; logo not migrated automatically |
| `parameter` | `club_config` | Merged into club_config columns |
| `icao` | `icao_airfields` | Coordinates converted from string to decimal |
| `regular_presence_inst_dates` | `regular_availability` | Time format simplified to HH:MM |
| `exceptionnal_inst_dates` | `availability_exceptions` | Fixed typo in table name |
| `logs` | `audit_logs` | Structured format; legacy messages stored as JSON |
| `sr_ss` | `sunrise_sunset_cache` | Not migrated (regenerated automatically) |

### Key Data Transformations

1. **IDs**: Old integer IDs → new CUIDs. Mapping is preserved in SQL comments.
2. **Passwords**: Old MD5 hashes stored as `legacy_md5:<hash>`. All users must reset passwords (bcrypt used in new system).
3. **Profiles/Roles**: Old bitmask system → new string-array permissions. Each profile becomes a Role.
4. **Slot Types**: `0` → `SOLO`, `1` → `DUAL`, `2` → `MAINTENANCE`
5. **Languages**: `italiano` → `it`, `english` → `en`, etc.
6. **Timezones**: Best-effort mapping to IANA format; defaults to `Europe/Rome`
7. **Coordinates**: String format `N43.810278` → decimal `43.810278`
8. **Emails**: Users without email get `legacy_<NUM>@migration.local`

### Permission Mapping (profiles.PERMITS → roles.permissions)

| Old Bit | Old Permission | New Permission String |
|---|---|---|
| 0 (1) | Book anytime | `booking:anytime` |
| 1 (2) | Book solo | `booking:solo` |
| 2 (4) | Book with instructor | `booking:instruction` |
| 3 (8) | Ground aircraft | `aircraft:ground` |
| 4 (16) | Ground instructor | `instructor:ground` |
| 5 (32) | Book unavailable instructor | `booking:unfree_instructor` |
| 6 (64) | Manage users | `members:manage` |
| 7 (128) | Manage own qualifications | `qualifications:manage_own` |
| 8 (256) | Club admin | `club:admin` |
| 9 (512) | Manage aircraft | `aircraft:manage` |
| 10 (1024) | Manage own limitations | `limitations:manage_own` |
| 11 (2048) | Book for everybody | `booking:manage_all` |
| 23 (8388608) | Any duration booking | `booking:any_duration` |
| 24 (16777216) | No auto-logout | `session:no_auto_logout` |

## Post-Migration Checklist

- [ ] All users must reset their password (old MD5 hashes are not compatible)
- [ ] Upload club logo manually via admin panel
- [ ] Verify instructor trigrams are correct
- [ ] Check qualification expiry dates
- [ ] Verify booking data integrity (date ranges, aircraft assignments)
- [ ] Run `npx prisma migrate deploy` before importing data
- [ ] Test login flow with migrated users
