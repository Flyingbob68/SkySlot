import { readFileSync } from 'fs';

const dump = readFileSync('c:/sviluppo/SkySlot/.claude/old_db/pren_sql.sql', 'utf8');

// Find authentication INSERT
const match = dump.match(/INSERT INTO `authentication` \(([^)]+)\) VALUES([\s\S]*?);\s*\n/);
if (!match) { console.log('No authentication table found'); process.exit(); }

const cols = match[1].split(',').map(c => c.trim().replace(/`/g, ''));
const profIdx = cols.indexOf('PROFILE');
console.log('PROFILE column index:', profIdx);

// Parse rows
const valueBlocks = match[2];
let total = 0, blocCount = 0;
const profileCounts = {};
const rowRegex = /\(([^)]+)\)/g;
let m;
while ((m = rowRegex.exec(valueBlocks)) !== null) {
  total++;
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
  if ((profile & 512) !== 0) blocCount++;

  const key = profile.toString();
  profileCounts[key] = (profileCounts[key] || 0) + 1;
}

console.log('Total:', total);
console.log('With bit 512 (Socio bloc):', blocCount);
console.log('\nProfile distribution:');
for (const [p, c] of Object.entries(profileCounts).sort((a, b) => Number(b[1]) - Number(a[1]))) {
  console.log(`  Profile ${p}: ${c} members`);
}
