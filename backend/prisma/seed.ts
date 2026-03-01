import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcrypt';
import 'dotenv/config';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const BCRYPT_ROUNDS = 12;

const SYSTEM_ROLES = [
  {
    name: 'admin',
    isSystem: true,
    permissions: [
      'booking:create_solo', 'booking:create_dual', 'booking:create_any',
      'booking:create_maintenance', 'booking:update_own', 'booking:update_any',
      'booking:delete_own', 'booking:delete_any', 'booking:override_date_limit',
      'booking:override_duration', 'booking:override_instructor', 'booking:view_all',
      'aircraft:manage', 'aircraft:freeze', 'aircraft:view',
      'member:manage', 'member:edit_own', 'member:view_directory',
      'member:import', 'member:export',
      'qualification:manage', 'qualification:edit_own',
      'instructor:manage_availability', 'instructor:view',
      'club:configure', 'club:export',
      'audit:view', 'role:manage',
    ],
  },
  {
    name: 'manager',
    isSystem: true,
    permissions: [
      'booking:create_solo', 'booking:create_dual', 'booking:create_any',
      'booking:create_maintenance', 'booking:update_own', 'booking:update_any',
      'booking:delete_own', 'booking:delete_any', 'booking:override_date_limit',
      'booking:override_duration', 'booking:override_instructor', 'booking:view_all',
      'aircraft:manage', 'aircraft:freeze', 'aircraft:view',
      'member:manage', 'member:edit_own', 'member:view_directory',
      'member:import', 'member:export',
      'qualification:manage', 'qualification:edit_own',
      'instructor:manage_availability', 'instructor:view',
      'club:export', 'audit:view',
    ],
  },
  {
    name: 'instructor',
    isSystem: true,
    permissions: [
      'booking:create_dual', 'booking:update_own', 'booking:delete_own',
      'booking:view_all',
      'aircraft:view',
      'member:edit_own', 'member:view_directory',
      'qualification:edit_own',
      'instructor:manage_availability', 'instructor:view',
    ],
  },
  {
    name: 'pilot',
    isSystem: true,
    permissions: [
      'booking:create_solo', 'booking:update_own', 'booking:delete_own',
      'booking:view_all',
      'aircraft:view',
      'member:edit_own', 'member:view_directory',
      'qualification:edit_own',
      'instructor:view',
    ],
  },
  {
    name: 'student',
    isSystem: true,
    permissions: [
      'booking:create_dual', 'booking:update_own', 'booking:delete_own',
      'booking:view_all',
      'aircraft:view',
      'member:edit_own', 'member:view_directory',
      'qualification:edit_own',
      'instructor:view',
    ],
  },
  {
    name: 'visitor',
    isSystem: true,
    permissions: [
      'aircraft:view',
      'instructor:view',
    ],
  },
] as const;

const ICAO_AIRFIELDS = [
  { icaoCode: 'LIRN', name: 'Napoli Capodichino', latitude: 40.886032, longitude: 14.290781, altitude: 88 },
  { icaoCode: 'LIRF', name: 'Roma Fiumicino', latitude: 41.804475, longitude: 12.250797, altitude: 5 },
  { icaoCode: 'LIRZ', name: 'Perugia San Francesco', latitude: 43.095906, longitude: 12.513222, altitude: 211 },
  { icaoCode: 'LIPE', name: 'Bologna Guglielmo Marconi', latitude: 44.535444, longitude: 11.288667, altitude: 37 },
  { icaoCode: 'LIML', name: 'Milano Linate', latitude: 45.449528, longitude: 9.278167, altitude: 107 },
  { icaoCode: 'LIPZ', name: 'Venezia Marco Polo', latitude: 45.505278, longitude: 12.351944, altitude: 2 },
  { icaoCode: 'LIRA', name: 'Roma Ciampino', latitude: 41.799361, longitude: 12.594936, altitude: 130 },
  { icaoCode: 'LIRQ', name: 'Firenze Peretola', latitude: 43.810028, longitude: 11.205100, altitude: 43 },
  { icaoCode: 'LICD', name: 'Lampedusa', latitude: 35.497914, longitude: 12.618117, altitude: 21 },
  { icaoCode: 'LICJ', name: 'Palermo Punta Raisi', latitude: 38.175958, longitude: 13.091019, altitude: 20 },
];

async function main() {
  console.log('Seeding database...');

  // 1. Create system roles
  console.log('Creating system roles...');
  for (const role of SYSTEM_ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { permissions: [...role.permissions], isSystem: role.isSystem },
      create: { name: role.name, permissions: [...role.permissions], isSystem: role.isSystem },
    });
  }
  console.log(`  Created ${SYSTEM_ROLES.length} roles`);

  // 2. Create default club config
  console.log('Creating default club config...');
  await prisma.clubConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      clubName: 'Aeroclub SkySlot',
      icaoCode: 'LIRN',
      firstHour: '07:00',
      lastHour: '21:00',
      defaultTimezone: 'Europe/Rome',
      defaultLanguage: 'it',
      defaultSlotDuration: 60,
      minSlotDuration: 30,
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
  console.log('  Club config created');

  // 3. Create admin user
  console.log('Creating admin user...');
  const adminPasswordHash = await hash('admin123!', BCRYPT_ROUNDS);
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'admin' } });

  const admin = await prisma.member.upsert({
    where: { email: 'admin@skyslot.local' },
    update: {},
    create: {
      email: 'admin@skyslot.local',
      firstName: 'Admin',
      lastName: 'SkySlot',
      passwordHash: adminPasswordHash,
      emailVerified: true,
      active: true,
      language: 'it',
      timezone: 'Europe/Rome',
      memberNumber: 'ADM001',
    },
  });

  await prisma.memberRole.upsert({
    where: { memberId_roleId: { memberId: admin.id, roleId: adminRole.id } },
    update: {},
    create: { memberId: admin.id, roleId: adminRole.id },
  });
  console.log('  Admin user: admin@skyslot.local / admin123!');

  // 4. Create ICAO airfields
  console.log('Creating ICAO airfields...');
  for (const airfield of ICAO_AIRFIELDS) {
    await prisma.icaoAirfield.upsert({
      where: { icaoCode: airfield.icaoCode },
      update: {},
      create: airfield,
    });
  }
  console.log(`  Created ${ICAO_AIRFIELDS.length} airfields`);

  console.log('\nSeeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
