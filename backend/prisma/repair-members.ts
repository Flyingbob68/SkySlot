/**
 * Repair script: reads the old MySQL dump (pren_sql.sql), joins
 * `authentication` (email, name, address...) with `members` (MEMBER_NUM, SUBSCRIPTION),
 * and updates existing SkySlot members with the missing fields.
 *
 * Usage:
 *   cd backend && npx tsx prisma/repair-members.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Path to the old SQL dump
const SQL_PATH = resolve('C:/sviluppo/SkySlot/.claude/old_db/pren_sql.sql');

// ---------------------------------------------------------------------------
// SQL INSERT parser
// ---------------------------------------------------------------------------

function parseInsertRows(sql: string, tableName: string): string[][] {
  // Find all INSERT INTO `tableName` blocks
  const pattern = new RegExp(
    `INSERT INTO \`${tableName}\`[^(]*\\(([^)]+)\\)\\s+VALUES\\s*\\n?([\\s\\S]*?)(?:;|$)`,
    'gi',
  );

  const allRows: string[][] = [];

  for (const match of sql.matchAll(pattern)) {
    const valuesBlock = match[2]!;

    // Split by top-level "),\n(" — each row is wrapped in parens
    // We need to handle values with commas inside quotes
    let depth = 0;
    let current = '';
    const rawRows: string[] = [];

    for (let i = 0; i < valuesBlock.length; i++) {
      const ch = valuesBlock[i]!;
      const prev = i > 0 ? valuesBlock[i - 1] : '';

      if (ch === '(' && depth === 0) {
        depth = 1;
        current = '';
        continue;
      }

      if (ch === "'" && prev !== '\\') {
        // Toggle quote state — simplified, track depth only
        current += ch;
        continue;
      }

      if (depth === 1 && ch === ')') {
        rawRows.push(current);
        depth = 0;
        current = '';
        continue;
      }

      if (depth === 1) {
        current += ch;
      }
    }

    // Parse each row's comma-separated values (respecting quotes)
    for (const raw of rawRows) {
      const fields: string[] = [];
      let field = '';
      let inQuote = false;

      for (let i = 0; i < raw.length; i++) {
        const ch = raw[i]!;

        if (ch === "'" && !inQuote) {
          inQuote = true;
          continue;
        }

        if (ch === "'" && inQuote) {
          // Check for escaped quote \'
          if (i > 0 && raw[i - 1] === '\\') {
            field = field.slice(0, -1) + "'";
            continue;
          }
          // Check for doubled quote ''
          if (i + 1 < raw.length && raw[i + 1] === "'") {
            field += "'";
            i++;
            continue;
          }
          inQuote = false;
          continue;
        }

        if (ch === ',' && !inQuote) {
          fields.push(field.trim());
          field = '';
          continue;
        }

        field += ch;
      }

      fields.push(field.trim());
      allRows.push(fields);
    }
  }

  return allRows;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&ograve;/g, 'ò')
    .replace(/&agrave;/g, 'à')
    .replace(/&egrave;/g, 'è')
    .replace(/&ugrave;/g, 'ù')
    .replace(/&igrave;/g, 'ì')
    .replace(/&#039;/g, "'")
    .replace(/&eacute;/g, 'é');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`Reading SQL dump: ${SQL_PATH}`);
  const sql = readFileSync(SQL_PATH, 'utf-8');

  // Parse authentication table
  // Columns: NAME, PASSWORD, NUM, FIRST_NAME, LAST_NAME, PROFILE, VIEW_TYPE,
  //          VIEW_WIDTH, VIEW_HEIGHT, AIRCRAFTS_VIEWED, INST_VIEWED, EMAIL,
  //          TIMEZONE, ADDRESS, ZIPCODE, CITY, STATE, COUNTRY, HOME_PHONE,
  //          WORK_PHONE, CELL_PHONE, LANG, NOTIFICATION
  const authRows = parseInsertRows(sql, 'authentication');
  console.log(`  authentication rows parsed: ${authRows.length}`);

  // Parse members table
  // Columns: NUM, MEMBER_NUM, SUBSCRIPTION, QUALIF_ALERT_DELAY
  const memberRows = parseInsertRows(sql, 'members');
  console.log(`  members rows parsed: ${memberRows.length}`);

  // Build members lookup by NUM
  const membersMap = new Map<string, { memberNum: string; subscription: string }>();
  for (const row of memberRows) {
    const num = row[0]!;
    const memberNum = row[1] ?? '';
    const subscription = row[2] ?? '';
    membersMap.set(num, { memberNum, subscription });
  }

  // Join auth + members and build update records
  interface OldMember {
    num: string;
    email: string;
    firstName: string;
    lastName: string;
    address: string;
    zipCode: string;
    city: string;
    state: string;
    country: string;
    homePhone: string;
    workPhone: string;
    cellPhone: string;
    memberNumber: string;
    subscriptionExpiry: string;
  }

  const oldMembers: OldMember[] = [];

  for (const row of authRows) {
    const num = row[2] ?? '';
    const email = (row[11] ?? '').trim();
    const firstName = decodeHtmlEntities((row[3] ?? '').trim());
    const lastName = decodeHtmlEntities((row[4] ?? '').trim());
    const address = decodeHtmlEntities((row[13] ?? '').trim());
    const zipCode = (row[14] ?? '').trim();
    const city = decodeHtmlEntities((row[15] ?? '').trim());
    const state = decodeHtmlEntities((row[16] ?? '').trim());
    const country = decodeHtmlEntities((row[17] ?? '').trim());
    const homePhone = (row[18] ?? '').trim();
    const workPhone = (row[19] ?? '').trim();
    const cellPhone = (row[20] ?? '').trim();

    const memberInfo = membersMap.get(num);
    const memberNumber = memberInfo?.memberNum ?? '';
    const subscriptionExpiry = memberInfo?.subscription ?? '';

    if (!email) {
      continue;
    }

    oldMembers.push({
      num,
      email: email.toLowerCase(),
      firstName,
      lastName,
      address,
      zipCode,
      city,
      state,
      country,
      homePhone,
      workPhone,
      cellPhone,
      memberNumber,
      subscriptionExpiry,
    });
  }

  console.log(`\nOld members with email: ${oldMembers.length}`);
  console.log('Starting update...\n');

  let updated = 0;
  let notFound = 0;
  let alreadyComplete = 0;
  let errors = 0;

  for (const old of oldMembers) {
    try {
      const existing = await prisma.member.findUnique({
        where: { email: old.email },
      });

      if (!existing) {
        console.log(`  Non trovato nel DB: ${old.email} (${old.firstName} ${old.lastName})`);
        notFound++;
        continue;
      }

      // Build update data: only fill in fields that are missing in the current DB
      const updateData: Record<string, unknown> = {};

      if (old.memberNumber && !existing.memberNumber) {
        updateData.memberNumber = old.memberNumber;
      }
      if (old.subscriptionExpiry && old.subscriptionExpiry !== '0000-00-00' && !existing.subscriptionExpiry) {
        const parsed = new Date(old.subscriptionExpiry);
        if (!isNaN(parsed.getTime())) {
          updateData.subscriptionExpiry = parsed;
        }
      }
      if (old.address && !existing.address) {
        updateData.address = old.address;
      }
      if (old.zipCode && !existing.zipCode) {
        updateData.zipCode = old.zipCode;
      }
      if (old.city && !existing.city) {
        updateData.city = old.city;
      }
      if (old.state && !existing.state) {
        updateData.state = old.state;
      }
      if (old.country && !existing.country) {
        updateData.country = old.country;
      }
      if (old.homePhone && !existing.homePhone) {
        updateData.homePhone = old.homePhone;
      }
      if (old.workPhone && !existing.workPhone) {
        updateData.workPhone = old.workPhone;
      }
      if (old.cellPhone && !existing.cellPhone) {
        updateData.cellPhone = old.cellPhone;
      }

      if (Object.keys(updateData).length === 0) {
        alreadyComplete++;
        continue;
      }

      await prisma.member.update({
        where: { email: old.email },
        data: updateData,
      });

      const fields = Object.keys(updateData).join(', ');
      console.log(`  Aggiornato: ${old.email} (${old.firstName} ${old.lastName}) → ${fields}`);
      updated++;
    } catch (err) {
      console.error(`  Errore per ${old.email}:`, err);
      errors++;
    }
  }

  console.log('\n--- Risultato ---');
  console.log(`  Totali nel dump:     ${oldMembers.length}`);
  console.log(`  Aggiornati:          ${updated}`);
  console.log(`  Già completi:        ${alreadyComplete}`);
  console.log(`  Non trovati nel DB:  ${notFound}`);
  console.log(`  Errori:              ${errors}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
