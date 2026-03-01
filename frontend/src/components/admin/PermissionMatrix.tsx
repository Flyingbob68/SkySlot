/**
 * Permission matrix component.
 *
 * Displays permissions grouped by domain as a grid of checkboxes.
 * Used in the roles management page for assigning permissions to roles.
 */

import { useCallback } from 'react';

// ---------------------------------------------------------------------------
// Permission domains (Italian labels)
// ---------------------------------------------------------------------------

interface PermissionGroup {
  readonly domain: string;
  readonly label: string;
  readonly permissions: readonly PermissionItem[];
}

interface PermissionItem {
  readonly key: string;
  readonly label: string;
}

const PERMISSION_GROUPS: readonly PermissionGroup[] = [
  {
    domain: 'booking',
    label: 'Prenotazioni',
    permissions: [
      { key: 'booking:create_solo', label: 'Crea solo' },
      { key: 'booking:create_dual', label: 'Crea doppio' },
      { key: 'booking:create_any', label: 'Crea qualsiasi' },
      { key: 'booking:create_maintenance', label: 'Crea manutenzione' },
      { key: 'booking:update_own', label: 'Modifica proprie' },
      { key: 'booking:update_any', label: 'Modifica tutte' },
      { key: 'booking:delete_own', label: 'Elimina proprie' },
      { key: 'booking:delete_any', label: 'Elimina tutte' },
      { key: 'booking:override_date_limit', label: 'Ignora limite data' },
      { key: 'booking:override_duration', label: 'Ignora limite durata' },
      { key: 'booking:override_instructor', label: 'Ignora istruttore' },
      { key: 'booking:view_all', label: 'Visualizza tutte' },
    ],
  },
  {
    domain: 'aircraft',
    label: 'Aeromobili',
    permissions: [
      { key: 'aircraft:manage', label: 'Gestisci' },
      { key: 'aircraft:freeze', label: 'Blocca/Sblocca' },
      { key: 'aircraft:view', label: 'Visualizza' },
    ],
  },
  {
    domain: 'member',
    label: 'Soci',
    permissions: [
      { key: 'member:manage', label: 'Gestisci' },
      { key: 'member:edit_own', label: 'Modifica proprio profilo' },
      { key: 'member:view_directory', label: 'Visualizza elenco' },
      { key: 'member:import', label: 'Importa' },
      { key: 'member:export', label: 'Esporta' },
    ],
  },
  {
    domain: 'qualification',
    label: 'Qualifiche',
    permissions: [
      { key: 'qualification:manage', label: 'Gestisci' },
      { key: 'qualification:edit_own', label: 'Modifica proprie' },
    ],
  },
  {
    domain: 'instructor',
    label: 'Istruttori',
    permissions: [
      { key: 'instructor:manage_availability', label: 'Gestisci disponibilita' },
      { key: 'instructor:view', label: 'Visualizza' },
    ],
  },
  {
    domain: 'finance',
    label: 'Finanziario',
    permissions: [
      { key: 'finance:association', label: 'Associazione' },
      { key: 'finance:flights', label: 'Voli' },
    ],
  },
  {
    domain: 'club',
    label: 'Club',
    permissions: [
      { key: 'club:configure', label: 'Configura' },
      { key: 'club:export', label: 'Esporta dati' },
    ],
  },
  {
    domain: 'audit',
    label: 'Audit',
    permissions: [
      { key: 'audit:view', label: 'Visualizza log' },
    ],
  },
  {
    domain: 'role',
    label: 'Ruoli',
    permissions: [
      { key: 'role:manage', label: 'Gestisci ruoli' },
    ],
  },
] as const;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PermissionMatrixProps {
  readonly selectedPermissions: readonly string[];
  readonly onChange: (permissions: readonly string[]) => void;
  readonly disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PermissionMatrix({
  selectedPermissions,
  onChange,
  disabled = false,
}: PermissionMatrixProps) {
  const permissionSet = new Set(selectedPermissions);

  const handleToggle = useCallback(
    (permission: string) => {
      if (disabled) return;

      const updated = permissionSet.has(permission)
        ? selectedPermissions.filter((p) => p !== permission)
        : [...selectedPermissions, permission];

      onChange(updated);
    },
    [selectedPermissions, onChange, disabled, permissionSet],
  );

  const handleToggleDomain = useCallback(
    (group: PermissionGroup) => {
      if (disabled) return;

      const domainKeys = group.permissions.map((p) => p.key);
      const allSelected = domainKeys.every((k) => permissionSet.has(k));

      const updated = allSelected
        ? selectedPermissions.filter((p) => !domainKeys.includes(p))
        : [
            ...selectedPermissions.filter((p) => !domainKeys.includes(p)),
            ...domainKeys,
          ];

      onChange(updated);
    },
    [selectedPermissions, onChange, disabled, permissionSet],
  );

  return (
    <div className="space-y-4">
      {PERMISSION_GROUPS.map((group) => {
        const domainKeys = group.permissions.map((p) => p.key);
        const allSelected = domainKeys.every((k) => permissionSet.has(k));
        const someSelected = !allSelected && domainKeys.some((k) => permissionSet.has(k));

        return (
          <div key={group.domain} className="border border-border rounded-lg p-3">
            <label className="flex items-center gap-2 mb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected;
                }}
                onChange={() => handleToggleDomain(group)}
                disabled={disabled}
                className="h-4 w-4 rounded border-input"
              />
              <span className="text-sm font-semibold text-foreground">
                {group.label}
              </span>
              <span className="text-xs text-muted-foreground">
                ({domainKeys.filter((k) => permissionSet.has(k)).length}/{domainKeys.length})
              </span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1 pl-6">
              {group.permissions.map((perm) => (
                <label
                  key={perm.key}
                  className="flex items-center gap-2 cursor-pointer py-0.5"
                >
                  <input
                    type="checkbox"
                    checked={permissionSet.has(perm.key)}
                    onChange={() => handleToggle(perm.key)}
                    disabled={disabled}
                    className="h-3.5 w-3.5 rounded border-input"
                  />
                  <span className="text-xs text-foreground">{perm.label}</span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
