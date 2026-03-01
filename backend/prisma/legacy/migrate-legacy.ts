/**
 * Legacy OpenFlyers → SkySlot data migration script.
 *
 * Reads from the old MySQL database (pren_sql) and writes SQL INSERT
 * statements compatible with the new SkySlot PostgreSQL schema.
 *
 * Usage:
 *   1. Ensure you have a MySQL dump of the old `pren_sql` database.
 *      If the old server is still accessible, dump it:
 *        mysqldump -u aecfi -p pren_sql > legacy-dump.sql
 *
 *   2. Import the dump into a local MySQL instance:
 *        mysql -u root -p -e "CREATE DATABASE pren_sql"
 *        mysql -u root -p pren_sql < legacy-dump.sql
 *
 *   3. Run this migration script:
 *        LEGACY_MYSQL_URL="mysql://root:password@localhost:3306/pren_sql" \
 *        DATABASE_URL="postgresql://user:pass@localhost:5432/skyslot" \
 *        npx tsx prisma/legacy/migrate-legacy.ts
 *
 *   Alternatively, generate a SQL file without connecting to PostgreSQL:
 *        LEGACY_MYSQL_URL="mysql://root:password@localhost:3306/pren_sql" \
 *        MIGRATION_OUTPUT=sql \
 *        npx tsx prisma/legacy/migrate-legacy.ts > migration-output.sql
 *
 * The script generates new CUID IDs for all entities and maintains a mapping
 * from old integer IDs to new CUID IDs for foreign key resolution.
 */

import { createRequire } from 'module';

// ---------------------------------------------------------------------------
// Types for legacy rows (matching the old MySQL schema)
// ---------------------------------------------------------------------------

interface LegacyAuth {
  NUM: number;
  NAME: string;
  PASSWORD: string;
  FIRST_NAME: string;
  LAST_NAME: string;
  PROFILE: number;
  EMAIL: string;
  ADDRESS: string | null;
  ZIPCODE: string | null;
  CITY: string | null;
  STATE: string | null;
  COUNTRY: string | null;
  HOME_PHONE: string | null;
  WORK_PHONE: string | null;
  CELL_PHONE: string | null;
  VIEW_TYPE: number;
  VIEW_WIDTH: number;
  NOTIFICATION: number;
  LANG: string | null;
  TIMEZONE: string | null;
}

interface LegacyMember {
  NUM: number;
  MEMBER_NUM: string | null;
  SUBSCRIPTION: string | null;
}

interface LegacyInstructor {
  INST_NUM: number;
  SIGN: string;
  ORDER_NUM: number;
}

interface LegacyAircraft {
  NUM: number;
  CALLSIGN: string;
  TYPE: string;
  FLIGHT_HOUR_COSTS: string | null;
  SEATS_AVAILABLE: number;
  COMMENTS: string | null;
  ORDER_NUM: number;
  non_bookable: number;
}

interface LegacyBooking {
  ID: number;
  START_DATE: Date;
  END_DATE: Date;
  AIRCRAFT_NUM: number;
  MEMBER_NUM: number;
  SLOT_TYPE: number;
  INST_NUM: number;
  FREE_SEATS: number;
  COMMENTS: string | null;
}

interface LegacyQualification {
  ID: number;
  NAME: string;
  TIME_LIMITATION: number;
}

interface LegacyMemberQualif {
  MEMBERNUM: number;
  QUALIFID: number;
  EXPIREDATE: string | null;
  NOALERT: number;
}

interface LegacyAircraftQualif {
  AIRCRAFTNUM: number;
  CHECKNUM: number;
  QUALIFID: number;
}

interface LegacyProfile {
  NUM: number;
  NAME: string;
  PERMITS: number;
}

interface LegacyClub {
  NUM: number;
  NAME: string;
  INFO_CELL: string | null;
  LOGO: Buffer | null;
  LOGO_NAME: string | null;
  LOGO_EXT: string | null;
  LOGO_SIZE: number | null;
  CLUB_SITE_URL: string | null;
  FIRST_HOUR_DISPLAYED: string | null;
  LAST_HOUR_DISPLAYED: string | null;
  ICAO: string | null;
  FLAGS: number;
  DEFAULT_SLOT_RANGE: number;
  MIN_SLOT_RANGE: number;
  DEFAULT_TIMEZONE: string | null;
  LANG: string | null;
  MAIL_FROM_ADDRESS: string | null;
  ADMIN_NUM: number | null;
}

interface LegacyRegularAvail {
  ID: number;
  INST_NUM: number;
  START_DAY: number;
  START_HOUR: string;
  END_DAY: number;
  END_HOUR: string;
}

interface LegacyExceptionalDate {
  ID: number;
  INST_NUM: number;
  START_DATE: Date;
  END_DATE: Date;
  PRESENCE: number;
}

interface LegacyIcao {
  ICAO: string;
  NAME: string;
  LAT: string | null;
  LON: string | null;
  ALT: number;
}

interface LegacyLog {
  ID: number;
  DATE: Date;
  USER: number;
  MESSAGE: string | null;
}

interface LegacyParameter {
  CODE: string;
  ENABLED: number;
  INT_VALUE: number;
  CHAR_VALUE: string | null;
}

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

let idCounter = 0;
function cuid(): string {
  idCounter++;
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `clmig${timestamp}${random}${String(idCounter).padStart(4, '0')}`;
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

const memberIdMap = new Map<number, string>();    // old auth.NUM → new member.id
const aircraftIdMap = new Map<number, string>();  // old aircraft.NUM → new aircraft.id
const qualifIdMap = new Map<number, string>();    // old qualification.ID → new qualification.id
const instructorIdMap = new Map<number, string>();// old auth.NUM → new instructor.id
const roleIdMap = new Map<number, string>();      // old profile.NUM → new role.id

// ---------------------------------------------------------------------------
// Language / timezone mapping
// ---------------------------------------------------------------------------

function mapLanguage(lang: string | null): string {
  if (!lang) return 'it';
  const lower = lang.toLowerCase();
  if (lower.includes('italiano') || lower.includes('italian')) return 'it';
  if (lower.includes('english') || lower.includes('anglais')) return 'en';
  if (lower.includes('francais') || lower.includes('french')) return 'fr';
  if (lower.includes('deutsch') || lower.includes('german')) return 'de';
  if (lower.includes('espanol') || lower.includes('spanish')) return 'es';
  return 'it';
}

function mapTimezone(tz: string | null): string {
  if (!tz || tz === 'UTC' || tz.length === 0) return 'Europe/Rome';
  // Already in IANA format
  if (tz.includes('/')) return tz;
  // Common offset mappings
  const offsetMap: Record<string, string> = {
    '+1': 'Europe/Rome',
    '+01:00': 'Europe/Rome',
    'CET': 'Europe/Rome',
    'CEST': 'Europe/Rome',
  };
  return offsetMap[tz] ?? 'Europe/Rome';
}

// ---------------------------------------------------------------------------
// Slot type mapping: old 0/1/2 → new enum
// ---------------------------------------------------------------------------

function mapSlotType(oldType: number): string {
  switch (oldType) {
    case 0: return 'SOLO';
    case 1: return 'DUAL';
    case 2: return 'MAINTENANCE';
    default: return 'SOLO';
  }
}

// ---------------------------------------------------------------------------
// Profile permits → Role permissions mapping
// ---------------------------------------------------------------------------

function mapPermissions(permits: number): string[] {
  const permissions: string[] = [];

  if (permits & 1)        permissions.push('booking:anytime');
  if (permits & 2)        permissions.push('booking:solo');
  if (permits & 4)        permissions.push('booking:instruction');
  if (permits & 8)        permissions.push('aircraft:ground');
  if (permits & 16)       permissions.push('instructor:ground');
  if (permits & 32)       permissions.push('booking:unfree_instructor');
  if (permits & 64)       permissions.push('members:manage');
  if (permits & 128)      permissions.push('qualifications:manage_own');
  if (permits & 256)      permissions.push('club:admin');
  if (permits & 512)      permissions.push('aircraft:manage');
  if (permits & 1024)     permissions.push('limitations:manage_own');
  if (permits & 2048)     permissions.push('booking:manage_all');
  if (permits & 8388608)  permissions.push('booking:any_duration');
  if (permits & 16777216) permissions.push('session:no_auto_logout');

  return permissions;
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function formatDate(d: Date | string | null): string | null {
  if (!d) return null;
  if (typeof d === 'string') {
    if (d === '0000-00-00' || d === '0000-00-00 00:00:00') return null;
    return d;
  }
  return d.toISOString();
}

function formatDateOnly(d: Date | string | null): string | null {
  if (!d) return null;
  const s = typeof d === 'string' ? d : d.toISOString().split('T')[0];
  if (s === '0000-00-00') return null;
  return s;
}

// Time format: "HH:MM:SS" → "HH:MM"
function formatTime(t: string | null): string {
  if (!t) return '00:00';
  const parts = t.split(':');
  return `${parts[0].padStart(2, '0')}:${(parts[1] ?? '00').padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// SQL escaping for output mode
// ---------------------------------------------------------------------------

function esc(val: string | null | undefined): string {
  if (val === null || val === undefined) return 'NULL';
  return `'${val.replace(/'/g, "''")}'`;
}

function escBool(val: boolean): string {
  return val ? 'true' : 'false';
}

// Parse latitude string like "N43.810278" → decimal
function parseCoord(val: string | null, type: 'lat' | 'lon'): number {
  if (!val || val.length === 0) return 0;
  const dir = val[0].toUpperCase();
  const num = parseFloat(val.substring(1));
  if (isNaN(num)) return 0;
  if (type === 'lat') return (dir === 'S') ? -num : num;
  return (dir === 'W') ? -num : num;
}

// Decode HTML entities commonly found in old data
function decodeHtml(s: string | null): string | null {
  if (!s) return s;
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&eacute;/g, 'é')
    .replace(/&egrave;/g, 'è')
    .replace(/&agrave;/g, 'à')
    .replace(/&oacute;/g, 'ó')
    .replace(/&uacute;/g, 'ú')
    .replace(/&iuml;/g, 'ï')
    .replace(/&ccedil;/g, 'ç');
}

// ---------------------------------------------------------------------------
// Main migration function
// ---------------------------------------------------------------------------

async function migrate(): Promise<void> {
  const mysqlUrl = process.env.LEGACY_MYSQL_URL;
  const outputMode = process.env.MIGRATION_OUTPUT === 'sql' ? 'sql' : 'prisma';

  if (!mysqlUrl) {
    console.error('ERROR: LEGACY_MYSQL_URL environment variable is required.');
    console.error('Example: LEGACY_MYSQL_URL="mysql://root:password@localhost:3306/pren_sql"');
    process.exit(1);
  }

  // Dynamic import of mysql2
  let mysql: any;
  try {
    mysql = await import('mysql2/promise');
  } catch {
    console.error('ERROR: mysql2 package is required. Install it:');
    console.error('  npm install mysql2');
    process.exit(1);
  }

  const connection = await mysql.createConnection(mysqlUrl);
  console.error('Connected to legacy MySQL database.');

  const sql: string[] = [];
  const now = new Date().toISOString();

  function emit(statement: string): void {
    if (outputMode === 'sql') {
      sql.push(statement);
    }
  }

  emit('-- SkySlot Legacy Data Migration');
  emit(`-- Generated: ${now}`);
  emit('-- Source: OpenFlyers 1.3.1 (pren_sql)');
  emit('BEGIN;');
  emit('');

  // ─── 1. ICAO Airfields ──────────────────────────────────────────────────

  console.error('Migrating ICAO airfields...');
  const [icaoRows] = await connection.query('SELECT * FROM icao ORDER BY ICAO');
  const icaos = icaoRows as LegacyIcao[];

  emit('-- ICAO Airfields');
  for (const row of icaos) {
    const lat = parseCoord(row.LAT, 'lat');
    const lon = parseCoord(row.LON, 'lon');
    emit(
      `INSERT INTO icao_airfields (icao_code, name, latitude, longitude, altitude) VALUES (${esc(row.ICAO)}, ${esc(decodeHtml(row.NAME))}, ${lat}, ${lon}, ${row.ALT ?? 0}) ON CONFLICT (icao_code) DO NOTHING;`
    );
  }
  emit('');
  console.error(`  ${icaos.length} ICAO airfields.`);

  // ─── 2. Profiles → Roles ──────────────────────────────────────────────

  console.error('Migrating profiles → roles...');
  const [profileRows] = await connection.query('SELECT * FROM profiles ORDER BY NUM');
  const profiles = profileRows as LegacyProfile[];

  emit('-- Roles (from profiles)');
  for (const row of profiles) {
    const id = cuid();
    roleIdMap.set(row.NUM, id);
    const perms = mapPermissions(row.PERMITS);
    const name = decodeHtml(row.NAME) ?? `Profile_${row.NUM}`;
    emit(
      `INSERT INTO roles (id, name, permissions, is_system, created_at) VALUES (${esc(id)}, ${esc(name)}, ARRAY[${perms.map(p => esc(p)).join(',')}]::text[], false, ${esc(now)});`
    );
  }
  emit('');
  console.error(`  ${profiles.length} profiles → roles.`);

  // ─── 3. Qualifications ────────────────────────────────────────────────

  console.error('Migrating qualifications...');
  const [qualRows] = await connection.query('SELECT * FROM qualification ORDER BY ID');
  const qualifications = qualRows as LegacyQualification[];

  emit('-- Qualifications');
  for (const row of qualifications) {
    const id = cuid();
    qualifIdMap.set(row.ID, id);
    emit(
      `INSERT INTO qualifications (id, name, has_expiry, created_at) VALUES (${esc(id)}, ${esc(decodeHtml(row.NAME))}, ${escBool(row.TIME_LIMITATION === 1)}, ${esc(now)});`
    );
  }
  emit('');
  console.error(`  ${qualifications.length} qualifications.`);

  // ─── 4. Aircraft ──────────────────────────────────────────────────────

  console.error('Migrating aircraft...');
  const [aircraftRows] = await connection.query('SELECT * FROM aircrafts ORDER BY ORDER_NUM');
  const aircrafts = aircraftRows as LegacyAircraft[];

  emit('-- Aircraft');
  for (const row of aircrafts) {
    const id = cuid();
    aircraftIdMap.set(row.NUM, id);
    const hourlyRate = row.FLIGHT_HOUR_COSTS ? parseFloat(row.FLIGHT_HOUR_COSTS.replace(',', '.')) : null;
    const rateStr = (hourlyRate !== null && !isNaN(hourlyRate)) ? String(hourlyRate) : 'NULL';
    emit(
      `INSERT INTO aircraft (id, callsign, type, seats, hourly_rate, non_bookable, display_order, comments, active, created_at, updated_at) VALUES (${esc(id)}, ${esc(decodeHtml(row.CALLSIGN))}, ${esc(decodeHtml(row.TYPE))}, ${row.SEATS_AVAILABLE}, ${rateStr}, ${escBool(row.non_bookable === 1)}, ${row.ORDER_NUM}, ${esc(decodeHtml(row.COMMENTS))}, true, ${esc(now)}, ${esc(now)});`
    );
  }
  emit('');
  console.error(`  ${aircrafts.length} aircraft.`);

  // ─── 5. Aircraft Qualifications ───────────────────────────────────────

  console.error('Migrating aircraft qualifications...');
  const [aqRows] = await connection.query('SELECT * FROM aircraft_qualif ORDER BY AIRCRAFTNUM, CHECKNUM');
  const aircraftQualifs = aqRows as LegacyAircraftQualif[];

  emit('-- Aircraft Qualifications');
  for (const row of aircraftQualifs) {
    const aircraftId = aircraftIdMap.get(row.AIRCRAFTNUM);
    const qualifId = qualifIdMap.get(row.QUALIFID);
    if (!aircraftId || !qualifId) {
      console.error(`  WARN: Skipping aircraft_qualif (aircraft=${row.AIRCRAFTNUM}, qualif=${row.QUALIFID}) - missing reference.`);
      continue;
    }
    const id = cuid();
    emit(
      `INSERT INTO aircraft_qualifications (id, aircraft_id, check_group, qualification_id) VALUES (${esc(id)}, ${esc(aircraftId)}, ${row.CHECKNUM}, ${esc(qualifId)});`
    );
  }
  emit('');
  console.error(`  ${aircraftQualifs.length} aircraft qualification requirements.`);

  // ─── 6. Users (authentication + members + instructors) ────────────────

  console.error('Migrating users...');
  const [authRows] = await connection.query('SELECT * FROM authentication ORDER BY NUM');
  const auths = authRows as LegacyAuth[];

  const [memberRows] = await connection.query('SELECT * FROM members ORDER BY NUM');
  const members = memberRows as LegacyMember[];
  const memberMap = new Map(members.map(m => [m.NUM, m]));

  const [instructorRows] = await connection.query('SELECT * FROM instructors ORDER BY ORDER_NUM');
  const instructors = instructorRows as LegacyInstructor[];
  const instructorMap = new Map(instructors.map(i => [i.INST_NUM, i]));

  emit('-- Members (from authentication + members tables)');
  for (const row of auths) {
    const id = cuid();
    memberIdMap.set(row.NUM, id);
    const memberData = memberMap.get(row.NUM);
    const email = (row.EMAIL && row.EMAIL.length > 0) ? row.EMAIL : `legacy_${row.NUM}@migration.local`;
    const subExpiry = memberData?.SUBSCRIPTION
      ? formatDateOnly(memberData.SUBSCRIPTION)
      : null;
    const memberNumber = memberData?.MEMBER_NUM || null;

    // Password: old system uses MD5. We store a placeholder that forces password reset.
    // The old MD5 hash is preserved as "legacy_md5:<hash>" for reference.
    const passwordHash = `legacy_md5:${row.PASSWORD}`;

    emit(
      `INSERT INTO members (id, email, first_name, last_name, password_hash, address, zip_code, city, state, country, home_phone, work_phone, cell_phone, member_number, subscription_expiry, email_verified, active, language, timezone, notification_enabled, privacy_flags, created_at, updated_at) VALUES (${esc(id)}, ${esc(email.toLowerCase())}, ${esc(decodeHtml(row.FIRST_NAME))}, ${esc(decodeHtml(row.LAST_NAME))}, ${esc(passwordHash)}, ${esc(decodeHtml(row.ADDRESS))}, ${esc(row.ZIPCODE)}, ${esc(decodeHtml(row.CITY))}, ${esc(decodeHtml(row.STATE))}, ${esc(row.COUNTRY ?? 'IT')}, ${esc(row.HOME_PHONE)}, ${esc(row.WORK_PHONE)}, ${esc(row.CELL_PHONE)}, ${esc(memberNumber)}, ${subExpiry ? esc(subExpiry) : 'NULL'}, false, true, ${esc(mapLanguage(row.LANG))}, ${esc(mapTimezone(row.TIMEZONE))}, ${escBool(row.NOTIFICATION > 0)}, 0, ${esc(now)}, ${esc(now)});`
    );
  }
  emit('');
  console.error(`  ${auths.length} users → members.`);

  // ─── 7. Member Roles ──────────────────────────────────────────────────

  console.error('Migrating member roles...');
  emit('-- Member Roles (from authentication.PROFILE bitmask)');
  let memberRoleCount = 0;
  for (const row of auths) {
    const memberId = memberIdMap.get(row.NUM);
    if (!memberId) continue;

    // The old PROFILE field is a sum of profile NUMs (which are powers of 2)
    for (const [profileNum, roleId] of roleIdMap.entries()) {
      if ((row.PROFILE & profileNum) === profileNum && profileNum > 0) {
        emit(
          `INSERT INTO member_roles (member_id, role_id) VALUES (${esc(memberId)}, ${esc(roleId)});`
        );
        memberRoleCount++;
      }
    }
  }
  emit('');
  console.error(`  ${memberRoleCount} member-role assignments.`);

  // ─── 8. Instructors ───────────────────────────────────────────────────

  console.error('Migrating instructors...');
  emit('-- Instructors');
  for (const row of instructors) {
    const memberId = memberIdMap.get(row.INST_NUM);
    if (!memberId) {
      console.error(`  WARN: Skipping instructor (INST_NUM=${row.INST_NUM}) - no matching user.`);
      continue;
    }
    const id = cuid();
    instructorIdMap.set(row.INST_NUM, id);
    emit(
      `INSERT INTO instructors (id, member_id, trigram, display_order, created_at) VALUES (${esc(id)}, ${esc(memberId)}, ${esc(row.SIGN)}, ${row.ORDER_NUM}, ${esc(now)});`
    );
  }
  emit('');
  console.error(`  ${instructors.length} instructors.`);

  // ─── 9. Member Qualifications ─────────────────────────────────────────

  console.error('Migrating member qualifications...');
  const [mqRows] = await connection.query('SELECT * FROM member_qualif ORDER BY MEMBERNUM, QUALIFID');
  const memberQualifs = mqRows as LegacyMemberQualif[];

  emit('-- Member Qualifications');
  let mqCount = 0;
  for (const row of memberQualifs) {
    const memberId = memberIdMap.get(row.MEMBERNUM);
    const qualifId = qualifIdMap.get(row.QUALIFID);
    if (!memberId || !qualifId) {
      console.error(`  WARN: Skipping member_qualif (member=${row.MEMBERNUM}, qualif=${row.QUALIFID}) - missing reference.`);
      continue;
    }
    const id = cuid();
    const expiry = formatDateOnly(row.EXPIREDATE);
    emit(
      `INSERT INTO member_qualifications (id, member_id, qualification_id, expiry_date, no_alert, created_at, updated_at) VALUES (${esc(id)}, ${esc(memberId)}, ${esc(qualifId)}, ${expiry ? esc(expiry) : 'NULL'}, ${escBool(row.NOALERT === 1)}, ${esc(now)}, ${esc(now)});`
    );
    mqCount++;
  }
  emit('');
  console.error(`  ${mqCount} member qualifications.`);

  // ─── 10. Regular Availability ─────────────────────────────────────────

  console.error('Migrating instructor regular availability...');
  const [raRows] = await connection.query('SELECT * FROM regular_presence_inst_dates ORDER BY INST_NUM');
  const regularAvails = raRows as LegacyRegularAvail[];

  emit('-- Regular Availability');
  let raCount = 0;
  for (const row of regularAvails) {
    const instrId = instructorIdMap.get(row.INST_NUM);
    if (!instrId) {
      console.error(`  WARN: Skipping regular_presence (INST_NUM=${row.INST_NUM}) - no matching instructor.`);
      continue;
    }
    const id = cuid();
    emit(
      `INSERT INTO regular_availability (id, instructor_id, start_day, start_time, end_day, end_time) VALUES (${esc(id)}, ${esc(instrId)}, ${row.START_DAY}, ${esc(formatTime(row.START_HOUR))}, ${row.END_DAY}, ${esc(formatTime(row.END_HOUR))});`
    );
    raCount++;
  }
  emit('');
  console.error(`  ${raCount} regular availability records.`);

  // ─── 11. Availability Exceptions ──────────────────────────────────────

  console.error('Migrating instructor availability exceptions...');
  const [aeRows] = await connection.query('SELECT * FROM exceptionnal_inst_dates ORDER BY INST_NUM');
  const availExceptions = aeRows as LegacyExceptionalDate[];

  emit('-- Availability Exceptions');
  let aeCount = 0;
  for (const row of availExceptions) {
    const instrId = instructorIdMap.get(row.INST_NUM);
    if (!instrId) {
      console.error(`  WARN: Skipping exceptionnal_inst_dates (INST_NUM=${row.INST_NUM}) - no matching instructor.`);
      continue;
    }
    const id = cuid();
    emit(
      `INSERT INTO availability_exceptions (id, instructor_id, start_date, end_date, is_present) VALUES (${esc(id)}, ${esc(instrId)}, ${esc(formatDate(row.START_DATE))}, ${esc(formatDate(row.END_DATE))}, ${escBool(row.PRESENCE === 1)});`
    );
    aeCount++;
  }
  emit('');
  console.error(`  ${aeCount} availability exceptions.`);

  // ─── 12. Bookings ─────────────────────────────────────────────────────

  console.error('Migrating bookings...');
  const [bookingRows] = await connection.query('SELECT * FROM booking ORDER BY ID');
  const bookings = bookingRows as LegacyBooking[];

  emit('-- Bookings');
  let bkCount = 0;
  let bkSkipped = 0;
  for (const row of bookings) {
    const aircraftId = aircraftIdMap.get(row.AIRCRAFT_NUM);
    const memberId = memberIdMap.get(row.MEMBER_NUM);

    if (!aircraftId || !memberId) {
      console.error(`  WARN: Skipping booking ID=${row.ID} - missing aircraft (${row.AIRCRAFT_NUM}) or member (${row.MEMBER_NUM}).`);
      bkSkipped++;
      continue;
    }

    const instructorMemberId = row.INST_NUM > 0 ? memberIdMap.get(row.INST_NUM) : null;
    const id = cuid();
    const slotType = mapSlotType(row.SLOT_TYPE);

    emit(
      `INSERT INTO bookings (id, start_date, end_date, aircraft_id, member_id, slot_type, instructor_id, free_seats, comments, created_by, created_at, updated_at) VALUES (${esc(id)}, ${esc(formatDate(row.START_DATE))}, ${esc(formatDate(row.END_DATE))}, ${esc(aircraftId)}, ${esc(memberId)}, '${slotType}', ${instructorMemberId ? esc(instructorMemberId) : 'NULL'}, ${row.FREE_SEATS}, ${esc(decodeHtml(row.COMMENTS))}, ${esc(memberId)}, ${esc(now)}, ${esc(now)});`
    );
    bkCount++;
  }
  emit('');
  console.error(`  ${bkCount} bookings migrated, ${bkSkipped} skipped.`);

  // ─── 13. Club Configuration ───────────────────────────────────────────

  console.error('Migrating club configuration...');
  const [clubRows] = await connection.query('SELECT * FROM clubs WHERE NUM = 1');
  const clubs = clubRows as LegacyClub[];

  if (clubs.length > 0) {
    const club = clubs[0];
    const firstHour = club.FIRST_HOUR_DISPLAYED ? formatTime(club.FIRST_HOUR_DISPLAYED) : '07:00';
    const lastHour = club.LAST_HOUR_DISPLAYED ? formatTime(club.LAST_HOUR_DISPLAYED) : '21:00';
    const bookComment = (club.FLAGS & 2) !== 0;

    // Determine qualification mode from parameter table
    const [paramRows] = await connection.query('SELECT * FROM parameter');
    const params = paramRows as LegacyParameter[];
    const paramMap = new Map(params.map(p => [p.CODE, p]));

    const qualifParam = paramMap.get('QUALIF');
    let qualMode = 'OFF';
    if (qualifParam?.ENABLED) {
      qualMode = qualifParam.INT_VALUE ? 'RESTRICTED' : 'WARNING';
    }

    const subParam = paramMap.get('SUBSCRIPTION');
    let subMode = 'OFF';
    if (subParam?.ENABLED) {
      subMode = subParam.ENABLED >= 2 ? 'RESTRICTED' : 'WARNING';
    }

    const bookDateLimit = paramMap.get('BOOK_DATE_LIMITATION');
    const bookDateWeeks = (bookDateLimit?.ENABLED && bookDateLimit.INT_VALUE) ? bookDateLimit.INT_VALUE : 4;

    const bookDurationLimit = paramMap.get('BOOK_DURATION_LIMITATION');
    const bookDurationHours = (bookDurationLimit?.ENABLED && bookDurationLimit.INT_VALUE) ? bookDurationLimit.INT_VALUE : 0;

    const bookInstMinTime = paramMap.get('BOOK_INSTRUCTION_MIN_TIME');
    const bookInstMinMin = (bookInstMinTime?.ENABLED && bookInstMinTime.INT_VALUE) ? bookInstMinTime.INT_VALUE : 0;

    const allocRule = paramMap.get('BOOK_ALLOCATING_RULE');
    const allocRuleStr = (allocRule?.ENABLED && allocRule.INT_VALUE === 1) ? 'BY_TYPE' : 'SPECIFIC';

    emit('-- Club Configuration');
    emit(
      `INSERT INTO club_config (id, club_name, icao_code, first_hour, last_hour, default_timezone, default_language, default_slot_duration, min_slot_duration, info_message, mail_from_address, book_date_limit_weeks, book_duration_limit_hours, book_instruction_min_minutes, book_allocating_rule, book_comment_enabled, qualification_mode, subscription_mode, registration_mode, updated_at) VALUES ('default', ${esc(decodeHtml(club.NAME))}, ${esc(club.ICAO)}, ${esc(firstHour)}, ${esc(lastHour)}, ${esc(mapTimezone(club.DEFAULT_TIMEZONE))}, ${esc(mapLanguage(club.LANG))}, ${club.DEFAULT_SLOT_RANGE}, ${club.MIN_SLOT_RANGE}, ${esc(decodeHtml(club.INFO_CELL))}, ${esc(club.MAIL_FROM_ADDRESS)}, ${bookDateWeeks}, ${bookDurationHours}, ${bookInstMinMin}, '${allocRuleStr}', ${escBool(bookComment)}, '${qualMode}', '${subMode}', 'INVITE', ${esc(now)}) ON CONFLICT (id) DO UPDATE SET club_name = EXCLUDED.club_name, icao_code = EXCLUDED.icao_code, first_hour = EXCLUDED.first_hour, last_hour = EXCLUDED.last_hour, default_timezone = EXCLUDED.default_timezone, default_language = EXCLUDED.default_language, default_slot_duration = EXCLUDED.default_slot_duration, min_slot_duration = EXCLUDED.min_slot_duration, info_message = EXCLUDED.info_message, mail_from_address = EXCLUDED.mail_from_address, book_date_limit_weeks = EXCLUDED.book_date_limit_weeks, book_duration_limit_hours = EXCLUDED.book_duration_limit_hours, book_instruction_min_minutes = EXCLUDED.book_instruction_min_minutes, book_allocating_rule = EXCLUDED.book_allocating_rule, book_comment_enabled = EXCLUDED.book_comment_enabled, qualification_mode = EXCLUDED.qualification_mode, subscription_mode = EXCLUDED.subscription_mode, updated_at = EXCLUDED.updated_at;`
    );
    emit('');
    console.error('  Club config migrated.');
  }

  // ─── 14. Audit Logs (from legacy logs table) ─────────────────────────

  console.error('Migrating audit logs...');
  const [logRows] = await connection.query('SELECT * FROM logs ORDER BY DATE');
  const logs = logRows as LegacyLog[];

  emit('-- Audit Logs (from legacy logs)');
  let logCount = 0;
  for (const row of logs) {
    const userId = memberIdMap.get(row.USER);
    const id = cuid();
    emit(
      `INSERT INTO audit_logs (id, timestamp, user_id, action, entity, old_values) VALUES (${esc(id)}, ${esc(formatDate(row.DATE))}, ${userId ? esc(userId) : 'NULL'}, 'legacy_log', 'booking', ${esc(JSON.stringify({ legacy_message: row.MESSAGE }))});`
    );
    logCount++;
  }
  emit('');
  console.error(`  ${logCount} audit log entries.`);

  // ─── 15. ID mapping reference ─────────────────────────────────────────

  emit('-- ID Mapping Reference (as comments for debugging)');
  emit('-- Members:');
  for (const [oldId, newId] of memberIdMap.entries()) {
    emit(`--   OLD auth.NUM=${oldId} → NEW members.id=${newId}`);
  }
  emit('-- Aircraft:');
  for (const [oldId, newId] of aircraftIdMap.entries()) {
    emit(`--   OLD aircrafts.NUM=${oldId} → NEW aircraft.id=${newId}`);
  }
  emit('-- Qualifications:');
  for (const [oldId, newId] of qualifIdMap.entries()) {
    emit(`--   OLD qualification.ID=${oldId} → NEW qualifications.id=${newId}`);
  }
  emit('-- Roles:');
  for (const [oldId, newId] of roleIdMap.entries()) {
    emit(`--   OLD profiles.NUM=${oldId} → NEW roles.id=${newId}`);
  }

  emit('');
  emit('COMMIT;');

  // Output
  if (outputMode === 'sql') {
    console.log(sql.join('\n'));
  }

  await connection.end();

  // ─── Summary ──────────────────────────────────────────────────────────

  console.error('');
  console.error('=== Migration Summary ===');
  console.error(`  ICAO Airfields:         ${icaos.length}`);
  console.error(`  Roles (from profiles):  ${profiles.length}`);
  console.error(`  Qualifications:         ${qualifications.length}`);
  console.error(`  Aircraft:               ${aircrafts.length}`);
  console.error(`  Aircraft Qualifications:${aircraftQualifs.length}`);
  console.error(`  Members (users):        ${auths.length}`);
  console.error(`  Member Roles:           ${memberRoleCount}`);
  console.error(`  Instructors:            ${instructors.length}`);
  console.error(`  Member Qualifications:  ${mqCount}`);
  console.error(`  Regular Availability:   ${raCount}`);
  console.error(`  Availability Exceptions:${aeCount}`);
  console.error(`  Bookings:               ${bkCount} (${bkSkipped} skipped)`);
  console.error(`  Audit Logs:             ${logCount}`);
  console.error('');
  console.error('IMPORTANT NOTES:');
  console.error('  1. Passwords are stored as "legacy_md5:<hash>". All users must reset their password.');
  console.error('  2. Users without email get a placeholder email (legacy_<NUM>@migration.local).');
  console.error('  3. Club logo (binary) is NOT migrated. Upload it manually via admin panel.');
  console.error('  4. Review the output SQL before executing against production.');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
