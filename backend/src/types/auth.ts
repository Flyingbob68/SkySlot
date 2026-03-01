/**
 * JWT payload, permission literals, and role-to-permission mappings.
 *
 * Permissions follow the pattern `domain:action` so they are easy to
 * filter and group at runtime.  The ROLE_PERMISSIONS map is the single
 * source of truth for what each role is allowed to do.
 */

// ---------------------------------------------------------------------------
// JWT
// ---------------------------------------------------------------------------

export interface JwtPayload {
  /** Member ID (subject). */
  readonly sub: string;
  readonly email: string;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
  /** Issued-at (epoch seconds). */
  readonly iat: number;
  /** Expiration (epoch seconds). */
  readonly exp: number;
}

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

export type Permission =
  // Booking
  | 'booking:create_solo'
  | 'booking:create_dual'
  | 'booking:create_any'
  | 'booking:create_maintenance'
  | 'booking:update_own'
  | 'booking:update_any'
  | 'booking:delete_own'
  | 'booking:delete_any'
  | 'booking:override_date_limit'
  | 'booking:override_duration'
  | 'booking:override_instructor'
  | 'booking:view_all'
  // Aircraft
  | 'aircraft:manage'
  | 'aircraft:freeze'
  | 'aircraft:view'
  // Member
  | 'member:manage'
  | 'member:edit_own'
  | 'member:view_directory'
  | 'member:import'
  | 'member:export'
  // Qualification
  | 'qualification:manage'
  | 'qualification:edit_own'
  // Instructor
  | 'instructor:manage_availability'
  | 'instructor:view'
  // Club
  | 'club:configure'
  | 'club:export'
  // Finance
  | 'finance:association'
  | 'finance:flights'
  // Audit
  | 'audit:view'
  // Role
  | 'role:manage';

// ---------------------------------------------------------------------------
// Role → Permission mapping
// ---------------------------------------------------------------------------

const ALL_PERMISSIONS: readonly Permission[] = [
  'booking:create_solo',
  'booking:create_dual',
  'booking:create_any',
  'booking:create_maintenance',
  'booking:update_own',
  'booking:update_any',
  'booking:delete_own',
  'booking:delete_any',
  'booking:override_date_limit',
  'booking:override_duration',
  'booking:override_instructor',
  'booking:view_all',
  'aircraft:manage',
  'aircraft:freeze',
  'aircraft:view',
  'member:manage',
  'member:edit_own',
  'member:view_directory',
  'member:import',
  'member:export',
  'qualification:manage',
  'qualification:edit_own',
  'instructor:manage_availability',
  'instructor:view',
  'club:configure',
  'club:export',
  'finance:association',
  'finance:flights',
  'audit:view',
  'role:manage',
] as const;

export const ROLE_PERMISSIONS: Readonly<Record<string, readonly Permission[]>> = {
  admin: ALL_PERMISSIONS,

  manager: [
    // Booking – everything except club/role administration
    'booking:create_solo',
    'booking:create_dual',
    'booking:create_any',
    'booking:create_maintenance',
    'booking:update_own',
    'booking:update_any',
    'booking:delete_own',
    'booking:delete_any',
    'booking:override_date_limit',
    'booking:override_duration',
    'booking:override_instructor',
    'booking:view_all',
    // Aircraft
    'aircraft:manage',
    'aircraft:freeze',
    'aircraft:view',
    // Member
    'member:manage',
    'member:edit_own',
    'member:view_directory',
    'member:import',
    'member:export',
    // Qualification
    'qualification:manage',
    'qualification:edit_own',
    // Instructor
    'instructor:manage_availability',
    'instructor:view',
    // Club – export only, no configure
    'club:export',
    // Finance
    'finance:association',
    'finance:flights',
    // Audit
    'audit:view',
  ],

  instructor: [
    'booking:create_dual',
    'booking:update_own',
    'booking:delete_own',
    'booking:view_all',
    'aircraft:view',
    'member:edit_own',
    'member:view_directory',
    'qualification:edit_own',
    'instructor:manage_availability',
    'instructor:view',
  ],

  pilot: [
    'booking:create_solo',
    'booking:update_own',
    'booking:delete_own',
    'booking:view_all',
    'aircraft:view',
    'member:edit_own',
    'member:view_directory',
  ],

  student: [
    'booking:create_dual',
    'booking:update_own',
    'booking:delete_own',
    'booking:view_all',
    'aircraft:view',
    'member:edit_own',
    'member:view_directory',
  ],

  visitor: [
    'aircraft:view',
    'instructor:view',
  ],
} as const;
