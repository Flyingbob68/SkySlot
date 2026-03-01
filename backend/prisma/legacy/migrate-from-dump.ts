/**
 * Legacy OpenFlyers → SkySlot migration script.
 *
 * Reads the MySQL dump file directly and imports data into PostgreSQL via Prisma.
 * No MySQL installation required.
 *
 * Usage:
 *   cd backend
 *   npx tsx prisma/legacy/migrate-from-dump.ts [--dry-run]
 *
 * Prerequisites:
 *   - PostgreSQL running with SkySlot schema migrated (npx prisma migrate deploy)
 *   - Seed data applied (npx tsx prisma/seed.ts)
 *   - .env with DATABASE_URL configured
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient, Prisma } from '../../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DUMP_FILE = join(import.meta.dirname ?? __dirname, '../../../.claude/old_db/pren_sql.sql');
const DRY_RUN = process.argv.includes('--dry-run');
const LEGACY_PASSWORD_PREFIX = 'legacy_md5:';

// ---------------------------------------------------------------------------
// SQL dump parser
// ---------------------------------------------------------------------------

interface ParsedTable {
  columns: string[];
  rows: Record<string, string | null>[];
}

function parseDump(sql: string): Map<string, ParsedTable> {
  const tables = new Map<string, ParsedTable>();
  const insertRegex = /INSERT INTO `(\w+)` \(([^)]+)\) VALUES\s*/g;

  let match: RegExpExecArray | null;
  while ((match = insertRegex.exec(sql)) !== null) {
    const tableName = match[1];
    const columns = match[2]
      .split(',')
      .map(c => c.trim().replace(/`/g, ''));

    // Find the VALUES data that follows
    const startIdx = match.index + match[0].length;
    const rows = parseValues(sql, startIdx, columns);

    const existing = tables.get(tableName);
    if (existing) {
      existing.rows.push(...rows);
    } else {
      tables.set(tableName, { columns, rows });
    }
  }

  return tables;
}

function parseValues(sql: string, startIdx: number, columns: string[]): Record<string, string | null>[] {
  const rows: Record<string, string | null>[] = [];
  let i = startIdx;

  while (i < sql.length) {
    // Skip whitespace
    while (i < sql.length && /\s/.test(sql[i])) i++;

    if (sql[i] !== '(') break;
    i++; // skip '('

    const values: (string | null)[] = [];
    while (i < sql.length && sql[i] !== ')') {
      // Skip whitespace
      while (i < sql.length && /\s/.test(sql[i])) i++;

      if (sql[i] === "'") {
        // String value
        i++; // skip opening quote
        let val = '';
        while (i < sql.length) {
          if (sql[i] === '\\') {
            i++;
            if (sql[i] === "'") val += "'";
            else if (sql[i] === '\\') val += '\\';
            else if (sql[i] === 'n') val += '\n';
            else if (sql[i] === 'r') val += '\r';
            else if (sql[i] === 't') val += '\t';
            else if (sql[i] === '0') val += '\0';
            else val += sql[i];
            i++;
          } else if (sql[i] === "'" && sql[i + 1] === "'") {
            val += "'";
            i += 2;
          } else if (sql[i] === "'") {
            i++; // skip closing quote
            break;
          } else {
            val += sql[i];
            i++;
          }
        }
        values.push(val);
      } else if (sql.substring(i, i + 4) === 'NULL') {
        values.push(null);
        i += 4;
      } else {
        // Numeric or other value
        let val = '';
        while (i < sql.length && sql[i] !== ',' && sql[i] !== ')') {
          val += sql[i];
          i++;
        }
        values.push(val.trim());
      }

      // Skip comma between values
      if (sql[i] === ',') i++;
    }

    if (sql[i] === ')') i++; // skip ')'

    // Build row object
    const row: Record<string, string | null> = {};
    for (let j = 0; j < columns.length && j < values.length; j++) {
      row[columns[j]] = values[j];
    }
    rows.push(row);

    // Check what follows: comma (more rows), semicolon (end), or newline
    while (i < sql.length && /\s/.test(sql[i])) i++;
    if (sql[i] === ',') {
      i++; // more rows follow
    } else {
      break; // end of INSERT statement
    }
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toInt(val: string | null | undefined, fallback = 0): number {
  if (val === null || val === undefined || val === '') return fallback;
  const n = parseInt(val, 10);
  return isNaN(n) ? fallback : n;
}

function toDecimal(val: string | null | undefined): Prisma.Decimal | null {
  if (val === null || val === undefined || val === '') return null;
  const cleaned = val.replace(',', '.').replace(/[^\d.]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : new Prisma.Decimal(n);
}

function toBool(val: string | null | undefined): boolean {
  return val === '1' || val === 'true';
}

function mapLanguage(lang: string | null): string {
  if (!lang) return 'it';
  const lower = lang.toLowerCase();
  if (lower.includes('italiano') || lower.includes('italian')) return 'it';
  if (lower.includes('english') || lower.includes('anglais')) return 'en';
  if (lower.includes('francais') || lower.includes('french')) return 'fr';
  return 'it';
}

function mapTimezone(tz: string | null): string {
  if (!tz || tz.length === 0) return 'Europe/Rome';
  if (tz.includes('/')) return tz;
  return 'Europe/Rome';
}

function decodeHtml(s: string | null): string {
  if (!s) return '';
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
    .replace(/&ccedil;/g, 'ç')
    .replace(/&iuml;/g, 'ï');
}

function parseDate(val: string | null): Date | null {
  if (!val || val === '0000-00-00' || val === '0000-00-00 00:00:00') return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function parseDateOnly(val: string | null): Date | null {
  if (!val || val === '0000-00-00') return null;
  const d = new Date(val + 'T00:00:00Z');
  return isNaN(d.getTime()) ? null : d;
}

function formatTime(t: string | null): string {
  if (!t) return '00:00';
  const parts = t.split(':');
  return `${parts[0].padStart(2, '0')}:${(parts[1] ?? '00').padStart(2, '0')}`;
}

function parseCoord(val: string | null, type: 'lat' | 'lon'): number {
  if (!val || val.length === 0) return 0;
  const dir = val[0].toUpperCase();
  const num = parseFloat(val.substring(1));
  if (isNaN(num)) return 0;
  if (type === 'lat') return (dir === 'S') ? -num : num;
  return (dir === 'W') ? -num : num;
}

type SlotType = 'SOLO' | 'DUAL' | 'MAINTENANCE';
function mapSlotType(oldType: string | null): SlotType {
  switch (oldType) {
    case '0': return 'SOLO';
    case '1': return 'DUAL';
    case '2': return 'MAINTENANCE';
    default: return 'SOLO';
  }
}

// Map old profile names to new system role names
const PROFILE_TO_ROLE: Record<string, string> = {
  'Administrator': 'admin',
  'Tecnico': 'manager',
  'Pilota': 'pilot',
  'Istruttore': 'instructor',
  'Allievo': 'student',
  'Staff': 'manager',
  'Allievo Pilota': 'student',
  'Scorte': 'pilot',        // "Escorts" → pilot-level access
  'Segreteria': 'manager',
  'Socio (bloc)': 'visitor', // Blocked member
  'Istruttore APR': 'instructor',
};

// ---------------------------------------------------------------------------
// Main migration
// ---------------------------------------------------------------------------

async function migrate(): Promise<void> {
  console.log('=== SkySlot Legacy Migration ===');
  console.log(`Dump file: ${DUMP_FILE}`);
  console.log(`Dry run: ${DRY_RUN}`);
  console.log('');

  // Read and parse the dump
  console.log('Reading SQL dump...');
  const rawSql = readFileSync(DUMP_FILE, 'latin1');
  console.log(`  File size: ${(rawSql.length / 1024 / 1024).toFixed(1)} MB`);

  console.log('Parsing INSERT statements...');
  const tables = parseDump(rawSql);
  console.log('  Tables found:');
  for (const [name, data] of tables) {
    console.log(`    ${name}: ${data.rows.length} rows`);
  }
  console.log('');

  if (DRY_RUN) {
    console.log('DRY RUN - no database changes will be made.');
    return;
  }

  // Connect to PostgreSQL
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  try {
    // Check if seed data exists
    const roleCount = await prisma.role.count();
    if (roleCount === 0) {
      console.error('ERROR: Seed data not found. Run "npx tsx prisma/seed.ts" first.');
      process.exit(1);
    }

    // Load system roles for mapping
    const systemRoles = await prisma.role.findMany();
    const roleByName = new Map(systemRoles.map(r => [r.name, r]));
    console.log(`Loaded ${systemRoles.length} system roles.`);

    // ID mappings: old integer → new CUID
    const memberIdMap = new Map<number, string>();
    const aircraftIdMap = new Map<number, string>();
    const qualifIdMap = new Map<number, string>();
    const instructorIdMap = new Map<number, string>(); // old INST_NUM → new instructor.id
    const instructorMemberMap = new Map<number, string>(); // old INST_NUM → new member.id

    // Build old profile NUM → system role name mapping
    const profileData = tables.get('profiles');
    const profileToRoleName = new Map<number, string>();
    if (profileData) {
      for (const row of profileData.rows) {
        const num = toInt(row.NUM);
        const name = decodeHtml(row.NAME);
        const roleName = PROFILE_TO_ROLE[name] ?? 'visitor';
        profileToRoleName.set(num, roleName);
      }
    }

    // Build member data lookup
    const memberDataMap = new Map<number, { memberNum: string | null; subscription: Date | null }>();
    const membersData = tables.get('members');
    if (membersData) {
      for (const row of membersData.rows) {
        memberDataMap.set(toInt(row.NUM), {
          memberNum: row.MEMBER_NUM || null,
          subscription: parseDateOnly(row.SUBSCRIPTION),
        });
      }
    }

    // ─── 1. ICAO Airfields ──────────────────────────────────────────────

    console.log('\n--- ICAO Airfields ---');
    const icaoData = tables.get('icao');
    let icaoCount = 0;
    if (icaoData) {
      for (const row of icaoData.rows) {
        const icaoCode = row.ICAO?.trim();
        if (!icaoCode) continue;
        try {
          await prisma.icaoAirfield.upsert({
            where: { icaoCode },
            update: {},
            create: {
              icaoCode,
              name: decodeHtml(row.NAME),
              latitude: parseCoord(row.LAT, 'lat'),
              longitude: parseCoord(row.LON, 'lon'),
              altitude: toInt(row.ALT),
            },
          });
          icaoCount++;
        } catch (e: any) {
          console.error(`  WARN: ICAO ${icaoCode}: ${e.message?.slice(0, 80)}`);
        }
      }
    }
    console.log(`  Imported: ${icaoCount}`);

    // ─── 2. Qualifications ──────────────────────────────────────────────

    console.log('\n--- Qualifications ---');
    const qualData = tables.get('qualification');
    let qualCount = 0;
    if (qualData) {
      for (const row of qualData.rows) {
        const oldId = toInt(row.ID);
        const name = decodeHtml(row.NAME);
        try {
          const created = await prisma.qualification.create({
            data: {
              name,
              hasExpiry: toBool(row.TIME_LIMITATION),
            },
          });
          qualifIdMap.set(oldId, created.id);
          qualCount++;
        } catch (e: any) {
          // Might already exist by name
          const existing = await prisma.qualification.findUnique({ where: { name } });
          if (existing) {
            qualifIdMap.set(oldId, existing.id);
            qualCount++;
          } else {
            console.error(`  WARN: Qualification "${name}": ${e.message?.slice(0, 80)}`);
          }
        }
      }
    }
    console.log(`  Imported: ${qualCount}`);

    // ─── 3. Aircraft ────────────────────────────────────────────────────

    console.log('\n--- Aircraft ---');
    const acftData = tables.get('aircrafts');
    let acftCount = 0;
    if (acftData) {
      for (const row of acftData.rows) {
        const oldId = toInt(row.NUM);
        const callsign = decodeHtml(row.CALLSIGN).trim();
        try {
          const created = await prisma.aircraft.create({
            data: {
              callsign,
              type: decodeHtml(row.TYPE).trim(),
              seats: toInt(row.SEATS_AVAILABLE, 1),
              hourlyRate: toDecimal(row.FLIGHT_HOUR_COSTS),
              nonBookable: toBool(row.non_bookable),
              displayOrder: toInt(row.ORDER_NUM),
              comments: decodeHtml(row.COMMENTS) || null,
              active: true,
            },
          });
          aircraftIdMap.set(oldId, created.id);
          acftCount++;
        } catch (e: any) {
          console.error(`  WARN: Aircraft "${callsign}" (${oldId}): ${e.message?.slice(0, 80)}`);
        }
      }
    }
    console.log(`  Imported: ${acftCount}`);

    // ─── 4. Aircraft Qualifications ─────────────────────────────────────

    console.log('\n--- Aircraft Qualifications ---');
    const aqData = tables.get('aircraft_qualif');
    let aqCount = 0;
    if (aqData) {
      for (const row of aqData.rows) {
        const aircraftId = aircraftIdMap.get(toInt(row.AIRCRAFTNUM));
        const qualifId = qualifIdMap.get(toInt(row.QUALIFID));
        if (!aircraftId || !qualifId) continue;
        try {
          await prisma.aircraftQualification.create({
            data: {
              aircraftId,
              checkGroup: toInt(row.CHECKNUM),
              qualificationId: qualifId,
            },
          });
          aqCount++;
        } catch (e: any) {
          // Unique constraint violation - skip duplicate
          if (!e.message?.includes('Unique')) {
            console.error(`  WARN: AQ: ${e.message?.slice(0, 80)}`);
          }
        }
      }
    }
    console.log(`  Imported: ${aqCount}`);

    // ─── 5. Members (users) ─────────────────────────────────────────────

    console.log('\n--- Members ---');
    const authData = tables.get('authentication');
    let memberCount = 0;
    const emailsSeen = new Set<string>();

    if (authData) {
      for (const row of authData.rows) {
        const oldId = toInt(row.NUM);
        let email = (row.EMAIL && row.EMAIL.trim().length > 0)
          ? row.EMAIL.trim().toLowerCase()
          : `legacy_${oldId}@migration.local`;

        // Handle duplicate emails
        if (emailsSeen.has(email)) {
          email = `legacy_${oldId}_${email}`;
        }
        emailsSeen.add(email);

        const memberExtra = memberDataMap.get(oldId);
        const passwordHash = `${LEGACY_PASSWORD_PREFIX}${row.PASSWORD ?? ''}`;

        try {
          const created = await prisma.member.create({
            data: {
              email,
              firstName: decodeHtml(row.FIRST_NAME) || '(sconosciuto)',
              lastName: decodeHtml(row.LAST_NAME) || '(sconosciuto)',
              passwordHash,
              address: decodeHtml(row.ADDRESS) || null,
              zipCode: row.ZIPCODE?.trim() || null,
              city: decodeHtml(row.CITY) || null,
              state: decodeHtml(row.STATE) || null,
              country: (row.COUNTRY?.trim() || 'IT') || 'IT',
              homePhone: row.HOME_PHONE?.trim() || null,
              workPhone: row.WORK_PHONE?.trim() || null,
              cellPhone: row.CELL_PHONE?.trim() || null,
              memberNumber: memberExtra?.memberNum || null,
              subscriptionExpiry: memberExtra?.subscription ?? null,
              emailVerified: false,
              active: true,
              language: mapLanguage(row.LANG),
              timezone: mapTimezone(row.TIMEZONE),
              notificationEnabled: toInt(row.NOTIFICATION) > 0,
              privacyFlags: 0,
            },
          });
          memberIdMap.set(oldId, created.id);
          memberCount++;
        } catch (e: any) {
          console.error(`  WARN: User ${oldId} "${email}": ${e.message?.slice(0, 100)}`);
        }
      }
    }
    console.log(`  Imported: ${memberCount}`);

    // ─── 6. Member Roles ────────────────────────────────────────────────

    console.log('\n--- Member Roles ---');
    let mrCount = 0;
    if (authData) {
      for (const row of authData.rows) {
        const oldId = toInt(row.NUM);
        const memberId = memberIdMap.get(oldId);
        if (!memberId) continue;

        const profileBitmask = toInt(row.PROFILE);
        const assignedRoles = new Set<string>();

        // Decode bitmask: each bit corresponds to a profile NUM (which is a power of 2)
        for (const [profileNum, roleName] of profileToRoleName) {
          if (profileNum > 0 && (profileBitmask & profileNum) === profileNum) {
            assignedRoles.add(roleName);
          }
        }

        // Default: if no roles assigned, give visitor
        if (assignedRoles.size === 0) {
          assignedRoles.add('visitor');
        }

        for (const roleName of assignedRoles) {
          const role = roleByName.get(roleName);
          if (!role) continue;
          try {
            await prisma.memberRole.create({
              data: { memberId, roleId: role.id },
            });
            mrCount++;
          } catch {
            // Duplicate - skip
          }
        }
      }
    }
    console.log(`  Imported: ${mrCount}`);

    // ─── 7. Instructors ─────────────────────────────────────────────────

    console.log('\n--- Instructors ---');
    const instData = tables.get('instructors');
    let instCount = 0;
    if (instData) {
      for (const row of instData.rows) {
        const oldInstNum = toInt(row.INST_NUM);
        const memberId = memberIdMap.get(oldInstNum);
        if (!memberId) {
          console.error(`  WARN: Instructor INST_NUM=${oldInstNum} - no matching user.`);
          continue;
        }

        // SIGN in old DB is used as name/trigram; truncate to 3 chars
        let trigram = (row.SIGN ?? '???').trim().substring(0, 3).toUpperCase();
        if (trigram.length === 0) trigram = '???';

        try {
          const created = await prisma.instructor.create({
            data: {
              memberId,
              trigram,
              displayOrder: toInt(row.ORDER_NUM),
            },
          });
          instructorIdMap.set(oldInstNum, created.id);
          instructorMemberMap.set(oldInstNum, memberId);
          instCount++;
        } catch (e: any) {
          console.error(`  WARN: Instructor ${oldInstNum}: ${e.message?.slice(0, 100)}`);
        }
      }
    }
    console.log(`  Imported: ${instCount}`);

    // ─── 8. Member Qualifications ───────────────────────────────────────

    console.log('\n--- Member Qualifications ---');
    const mqData = tables.get('member_qualif');
    let mqCount = 0;
    if (mqData) {
      for (const row of mqData.rows) {
        const memberId = memberIdMap.get(toInt(row.MEMBERNUM));
        const qualifId = qualifIdMap.get(toInt(row.QUALIFID));
        if (!memberId || !qualifId) continue;

        try {
          await prisma.memberQualification.create({
            data: {
              memberId,
              qualificationId: qualifId,
              expiryDate: parseDateOnly(row.EXPIREDATE),
              noAlert: toBool(row.NOALERT),
            },
          });
          mqCount++;
        } catch (e: any) {
          if (!e.message?.includes('Unique')) {
            console.error(`  WARN: MQ: ${e.message?.slice(0, 80)}`);
          }
        }
      }
    }
    console.log(`  Imported: ${mqCount}`);

    // ─── 9. Regular Availability ────────────────────────────────────────

    console.log('\n--- Regular Availability ---');
    const raData = tables.get('regular_presence_inst_dates');
    let raCount = 0;
    if (raData) {
      for (const row of raData.rows) {
        const instrId = instructorIdMap.get(toInt(row.INST_NUM));
        if (!instrId) continue;

        try {
          await prisma.regularAvailability.create({
            data: {
              instructorId: instrId,
              startDay: toInt(row.START_DAY),
              startTime: formatTime(row.START_HOUR),
              endDay: toInt(row.END_DAY),
              endTime: formatTime(row.END_HOUR),
            },
          });
          raCount++;
        } catch (e: any) {
          console.error(`  WARN: RA: ${e.message?.slice(0, 80)}`);
        }
      }
    }
    console.log(`  Imported: ${raCount}`);

    // ─── 10. Availability Exceptions ────────────────────────────────────

    console.log('\n--- Availability Exceptions ---');
    const aeData = tables.get('exceptionnal_inst_dates');
    let aeCount = 0;
    let aeSkipped = 0;
    if (aeData) {
      for (const row of aeData.rows) {
        const instrId = instructorIdMap.get(toInt(row.INST_NUM));
        if (!instrId) {
          aeSkipped++;
          continue;
        }

        const startDate = parseDate(row.START_DATE);
        const endDate = parseDate(row.END_DATE);
        if (!startDate || !endDate) {
          aeSkipped++;
          continue;
        }

        try {
          await prisma.availabilityException.create({
            data: {
              instructorId: instrId,
              startDate,
              endDate,
              isPresent: toBool(row.PRESENCE),
            },
          });
          aeCount++;
        } catch (e: any) {
          console.error(`  WARN: AE: ${e.message?.slice(0, 80)}`);
          aeSkipped++;
        }
      }
    }
    console.log(`  Imported: ${aeCount}, skipped: ${aeSkipped}`);

    // ─── 11. Bookings ───────────────────────────────────────────────────

    console.log('\n--- Bookings ---');
    const bookData = tables.get('booking');
    let bkCount = 0;
    let bkSkipped = 0;
    if (bookData) {
      // Process in batches for performance
      const BATCH_SIZE = 500;
      const batch: Prisma.BookingCreateManyInput[] = [];

      for (const row of bookData.rows) {
        const aircraftId = aircraftIdMap.get(toInt(row.AIRCRAFT_NUM));
        const memberId = memberIdMap.get(toInt(row.MEMBER_NUM));

        if (!aircraftId || !memberId) {
          bkSkipped++;
          continue;
        }

        const startDate = parseDate(row.START_DATE);
        const endDate = parseDate(row.END_DATE);
        if (!startDate || !endDate) {
          bkSkipped++;
          continue;
        }

        const instNum = toInt(row.INST_NUM);
        const instructorId = instNum > 0 ? memberIdMap.get(instNum) : null;

        batch.push({
          startDate,
          endDate,
          aircraftId,
          memberId,
          slotType: mapSlotType(row.SLOT_TYPE),
          instructorId: instructorId ?? null,
          freeSeats: toInt(row.FREE_SEATS),
          comments: decodeHtml(row.COMMENTS) || null,
          createdBy: memberId,
        });

        if (batch.length >= BATCH_SIZE) {
          const result = await prisma.booking.createMany({ data: batch });
          bkCount += result.count;
          batch.length = 0;
          process.stdout.write(`\r  Progress: ${bkCount} bookings...`);
        }
      }

      // Flush remaining
      if (batch.length > 0) {
        const result = await prisma.booking.createMany({ data: batch });
        bkCount += result.count;
      }
      console.log(`\r  Imported: ${bkCount}, skipped: ${bkSkipped}          `);
    }

    // ─── 12. Club Configuration ─────────────────────────────────────────

    console.log('\n--- Club Configuration ---');
    const clubData = tables.get('clubs');
    const paramData = tables.get('parameter');

    if (clubData && clubData.rows.length > 0) {
      const club = clubData.rows[0];

      // Parse parameters
      const paramMap = new Map<string, { enabled: number; intValue: number; charValue: string | null }>();
      if (paramData) {
        for (const row of paramData.rows) {
          paramMap.set(row.CODE ?? '', {
            enabled: toInt(row.ENABLED),
            intValue: toInt(row.INT_VALUE),
            charValue: row.CHAR_VALUE,
          });
        }
      }

      const qualifParam = paramMap.get('QUALIF');
      let qualMode: 'OFF' | 'WARNING' | 'RESTRICTED' = 'OFF';
      if (qualifParam?.enabled) {
        qualMode = qualifParam.intValue ? 'RESTRICTED' : 'WARNING';
      }

      const subParam = paramMap.get('SUBSCRIPTION');
      let subMode: 'OFF' | 'WARNING' | 'RESTRICTED' = 'OFF';
      if (subParam?.enabled) {
        subMode = subParam.enabled >= 2 ? 'RESTRICTED' : 'WARNING';
      }

      const bookDateLimit = paramMap.get('BOOK_DATE_LIMITATION');
      const bookInstMin = paramMap.get('BOOK_INSTRUCTION_MIN_TIME');

      try {
        await prisma.clubConfig.upsert({
          where: { id: 'default' },
          update: {
            clubName: decodeHtml(club.NAME) || 'Aeroclub',
            icaoCode: club.ICAO?.trim() || null,
            firstHour: formatTime(club.FIRST_HOUR_DISPLAYED),
            lastHour: formatTime(club.LAST_HOUR_DISPLAYED),
            defaultTimezone: mapTimezone(club.DEFAULT_TIMEZONE),
            defaultLanguage: mapLanguage(club.LANG),
            defaultSlotDuration: toInt(club.DEFAULT_SLOT_RANGE, 60),
            minSlotDuration: toInt(club.MIN_SLOT_RANGE, 30),
            infoMessage: decodeHtml(club.INFO_CELL) || null,
            mailFromAddress: club.MAIL_FROM_ADDRESS?.trim() || null,
            bookDateLimitWeeks: bookDateLimit?.enabled ? bookDateLimit.intValue : 4,
            bookDurationLimitHours: 0,
            bookInstructionMinMinutes: bookInstMin?.enabled ? bookInstMin.intValue : 0,
            bookAllocatingRule: 'SPECIFIC',
            bookCommentEnabled: (toInt(club.FLAGS) & 2) !== 0,
            qualificationMode: qualMode,
            subscriptionMode: subMode,
          },
          create: {
            id: 'default',
            clubName: decodeHtml(club.NAME) || 'Aeroclub',
            icaoCode: club.ICAO?.trim() || null,
            firstHour: formatTime(club.FIRST_HOUR_DISPLAYED),
            lastHour: formatTime(club.LAST_HOUR_DISPLAYED),
            defaultTimezone: mapTimezone(club.DEFAULT_TIMEZONE),
            defaultLanguage: mapLanguage(club.LANG),
            defaultSlotDuration: toInt(club.DEFAULT_SLOT_RANGE, 60),
            minSlotDuration: toInt(club.MIN_SLOT_RANGE, 30),
            bookDateLimitWeeks: 4,
            bookDurationLimitHours: 0,
            bookInstructionMinMinutes: 0,
            bookAllocatingRule: 'SPECIFIC',
            bookCommentEnabled: false,
            qualificationMode: 'OFF',
            subscriptionMode: 'OFF',
            registrationMode: 'INVITE',
          },
        });
        console.log('  Club config updated.');
      } catch (e: any) {
        console.error(`  WARN: Club config: ${e.message?.slice(0, 100)}`);
      }
    }

    // ─── 13. Audit Logs (sample) ────────────────────────────────────────

    console.log('\n--- Audit Logs ---');
    const logsData = tables.get('logs');
    let logCount = 0;
    if (logsData) {
      // Import in batches
      const BATCH_SIZE = 500;
      const batch: Prisma.AuditLogCreateManyInput[] = [];

      for (const row of logsData.rows) {
        const timestamp = parseDate(row.DATE);
        if (!timestamp) continue;

        const userId = memberIdMap.get(toInt(row.USER));

        batch.push({
          timestamp,
          userId: userId ?? null,
          action: 'legacy_log',
          entity: 'booking',
          oldValues: { legacy_message: row.MESSAGE },
        });

        if (batch.length >= BATCH_SIZE) {
          const result = await prisma.auditLog.createMany({ data: batch });
          logCount += result.count;
          batch.length = 0;
          process.stdout.write(`\r  Progress: ${logCount} logs...`);
        }
      }

      if (batch.length > 0) {
        const result = await prisma.auditLog.createMany({ data: batch });
        logCount += result.count;
      }
      console.log(`\r  Imported: ${logCount}                    `);
    }

    // ─── Summary ────────────────────────────────────────────────────────

    console.log('\n========================================');
    console.log('=== MIGRATION COMPLETE ===');
    console.log('========================================');
    console.log(`  ICAO Airfields:           ${icaoCount}`);
    console.log(`  Qualifications:           ${qualCount}`);
    console.log(`  Aircraft:                 ${acftCount}`);
    console.log(`  Aircraft Qualifications:  ${aqCount}`);
    console.log(`  Members:                  ${memberCount}`);
    console.log(`  Member Roles:             ${mrCount}`);
    console.log(`  Instructors:              ${instCount}`);
    console.log(`  Member Qualifications:    ${mqCount}`);
    console.log(`  Regular Availability:     ${raCount}`);
    console.log(`  Availability Exceptions:  ${aeCount}`);
    console.log(`  Bookings:                 ${bkCount}`);
    console.log(`  Audit Logs:               ${logCount}`);
    console.log('');
    console.log('IMPORTANT:');
    console.log('  1. All users must reset passwords (old MD5 hashes are NOT compatible)');
    console.log('  2. Users without email have legacy_<NUM>@migration.local');
    console.log('  3. Instructor "SIGN" was truncated to 3 chars for trigram field');
    console.log('  4. Club logo NOT migrated (binary blob) - upload manually');
    console.log('');

    // Print ID mapping for reference
    console.log('--- ID Mapping Reference ---');
    console.log('Aircraft:');
    for (const [oldId, newId] of aircraftIdMap) {
      const name = acftData?.rows.find(r => toInt(r.NUM) === oldId)?.CALLSIGN ?? '?';
      console.log(`  OLD ${oldId} (${name.trim()}) → ${newId}`);
    }
    console.log('Instructors:');
    for (const [oldId, newId] of instructorIdMap) {
      const name = instData?.rows.find(r => toInt(r.INST_NUM) === oldId)?.SIGN ?? '?';
      console.log(`  OLD ${oldId} (${name}) → ${newId}`);
    }

  } finally {
    await prisma.$disconnect();
  }
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
