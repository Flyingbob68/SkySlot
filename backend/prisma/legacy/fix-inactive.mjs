/**
 * Marks members with old profile 512 ("Socio bloc") as inactive.
 * Also parses ALL INSERT chunks from the dump (phpMyAdmin splits large tables).
 */
import { readFileSync } from 'fs';
import pg from 'pg';
import 'dotenv/config';

const dump = readFileSync('c:/sviluppo/SkySlot/.claude/old_db/pren_sql.sql', 'utf8');

// Parse ALL authentication INSERT statements (phpMyAdmin may split into chunks)
const insertRegex = /INSERT INTO `authentication` \(([^)]+)\) VALUES\s*([\s\S]*?);\s*\n/g;
const allRows = [];
let insertMatch;

while ((insertMatch = insertRegex.exec(dump)) !== null) {
  const cols = insertMatch[1].split(',').map(c => c.trim().replace(/`/g, ''));
  const profIdx = cols.indexOf('PROFILE');
  const emailIdx = cols.indexOf('EMAIL');
  const numIdx = cols.indexOf('NUM');

  const rowRegex = /\(([^)]+)\)/g;
  let m;
  while ((m = rowRegex.exec(insertMatch[2])) !== null) {
    const vals = [];
    let inStr = false, current = '', escaped = false;
    for (const ch of m[1]) {
      if (escaped) { current += ch; escaped = false; continue; }
      if (ch === '\\') { escaped = true; current += ch; continue; }
      if (ch === "'" && !inStr) { inStr = true; continue; }
      if (ch === "'" && inStr) { inStr = false; continue; }
      if (ch === ',' && !inStr) { vals.push(current.trim()); current = ''; continue; }
      current += ch;
    }
    vals.push(current.trim());

    const profile = parseInt(vals[profIdx]) || 0;
    const email = vals[emailIdx]?.toLowerCase().trim() || '';
    const num = parseInt(vals[numIdx]) || 0;

    allRows.push({ num, email, profile });
  }
}

console.log(`Total authentication rows parsed: ${allRows.length}`);

// Find users with profile containing bit 512
const blockedUsers = allRows.filter(r => (r.profile & 512) !== 0);
console.log(`Users with profile bit 512 (Socio bloc): ${blockedUsers.length}`);

if (blockedUsers.length === 0) {
  console.log('No blocked users to update.');
  process.exit(0);
}

// Connect to PostgreSQL and mark them inactive
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

for (const user of blockedUsers) {
  const email = user.email || `legacy_${user.num}@migration.local`;
  console.log(`  Marking inactive: NUM=${user.num}, email=${email}, profile=${user.profile}`);

  const result = await pool.query(
    `UPDATE members SET active = false WHERE email = $1 OR email LIKE $2`,
    [email, `legacy_${user.num}%`]
  );
  console.log(`    Updated ${result.rowCount} row(s)`);
}

// Verify
const { rows } = await pool.query(`SELECT active, count(*) FROM members GROUP BY active ORDER BY active`);
console.log('\nMember status after update:');
for (const r of rows) {
  console.log(`  ${r.active ? 'Active' : 'Inactive'}: ${r.count}`);
}

await pool.end();
