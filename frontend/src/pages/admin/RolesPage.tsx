/**
 * Roles management page.
 *
 * Lists all roles with permission counts.  Clicking a role opens
 * an edit panel with the permission matrix.  System roles have
 * restricted editing (name is not editable, cannot be deleted).
 * All text in Italian.
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { PermissionMatrix } from '@/components/admin/PermissionMatrix';
import { useRoles } from '@/hooks/use-admin';
import * as adminApi from '@/services/admin-service';
import type { Role } from '@/services/admin-service';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RolesPage() {
  const { data: roles, isLoading, error, refetch } = useRoles();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPermissions, setEditPermissions] = useState<readonly string[]>([]);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSelectRole = useCallback((role: Role) => {
    setSelectedRole(role);
    setIsCreating(false);
    setEditName(role.name);
    setEditPermissions(role.permissions);
    setFeedback(null);
  }, []);

  const handleNewRole = useCallback(() => {
    setSelectedRole(null);
    setIsCreating(true);
    setEditName('');
    setEditPermissions([]);
    setFeedback(null);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setFeedback(null);

    if (isCreating) {
      const result = await adminApi.createRole({
        name: editName,
        permissions: [...editPermissions],
      });

      if (result.success) {
        setFeedback({ type: 'success', message: 'Ruolo creato con successo' });
        setIsCreating(false);
        refetch();
      } else {
        setFeedback({ type: 'error', message: result.error ?? 'Errore durante la creazione' });
      }
    } else if (selectedRole) {
      const data: { name?: string; permissions?: string[] } = {
        permissions: [...editPermissions],
      };

      if (!selectedRole.isSystem && editName !== selectedRole.name) {
        data.name = editName;
      }

      const result = await adminApi.updateRole(selectedRole.id, data);

      if (result.success) {
        setFeedback({ type: 'success', message: 'Ruolo aggiornato con successo' });
        refetch();
      } else {
        setFeedback({ type: 'error', message: result.error ?? 'Errore durante l\'aggiornamento' });
      }
    }

    setSaving(false);
  }, [isCreating, editName, editPermissions, selectedRole, refetch]);

  const handleDelete = useCallback(async () => {
    if (!selectedRole) return;

    const confirmed = window.confirm(
      `Sei sicuro di voler eliminare il ruolo "${selectedRole.name}"?`,
    );
    if (!confirmed) return;

    setSaving(true);
    const result = await adminApi.deleteRole(selectedRole.id);

    if (result.success) {
      setFeedback({ type: 'success', message: 'Ruolo eliminato con successo' });
      setSelectedRole(null);
      refetch();
    } else {
      setFeedback({ type: 'error', message: result.error ?? 'Errore durante l\'eliminazione' });
    }

    setSaving(false);
  }, [selectedRole, refetch]);

  if (isLoading) {
    return <LoadingSpinner centered />;
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold">Gestione Ruoli</h1>
        <Button size="sm" onClick={handleNewRole}>Nuovo Ruolo</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Roles list */}
        <div className="space-y-2">
          {roles?.map((role) => (
            <RoleCard
              key={role.id}
              role={role}
              isSelected={selectedRole?.id === role.id}
              onSelect={handleSelectRole}
            />
          ))}
        </div>

        {/* Edit panel */}
        <div className="lg:col-span-2">
          {(selectedRole || isCreating) && (
            <RoleEditPanel
              isCreating={isCreating}
              isSystem={selectedRole?.isSystem ?? false}
              name={editName}
              permissions={editPermissions}
              memberCount={selectedRole?._count.memberRoles ?? 0}
              saving={saving}
              feedback={feedback}
              onNameChange={setEditName}
              onPermissionsChange={setEditPermissions}
              onSave={handleSave}
              onDelete={handleDelete}
            />
          )}

          {!selectedRole && !isCreating && (
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground text-sm">
                  Seleziona un ruolo dalla lista o crea un nuovo ruolo.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RoleCard
// ---------------------------------------------------------------------------

function RoleCard({ role, isSelected, onSelect }: {
  readonly role: Role;
  readonly isSelected: boolean;
  readonly onSelect: (role: Role) => void;
}) {
  return (
    <button
      onClick={() => onSelect(role)}
      className={`w-full text-left p-3 rounded-lg border transition-colors ${
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{role.name}</span>
          {role.isSystem && (
            <Badge variant="secondary">Sistema</Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {role.permissions.length} permessi
        </span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        {role._count.memberRoles} utenti assegnati
      </p>
    </button>
  );
}

// ---------------------------------------------------------------------------
// RoleEditPanel
// ---------------------------------------------------------------------------

function RoleEditPanel({
  isCreating,
  isSystem,
  name,
  permissions,
  memberCount,
  saving,
  feedback,
  onNameChange,
  onPermissionsChange,
  onSave,
  onDelete,
}: {
  readonly isCreating: boolean;
  readonly isSystem: boolean;
  readonly name: string;
  readonly permissions: readonly string[];
  readonly memberCount: number;
  readonly saving: boolean;
  readonly feedback: { type: 'success' | 'error'; message: string } | null;
  readonly onNameChange: (name: string) => void;
  readonly onPermissionsChange: (permissions: readonly string[]) => void;
  readonly onSave: () => void;
  readonly onDelete: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isCreating ? 'Nuovo Ruolo' : `Modifica Ruolo: ${name}`}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Nome Ruolo</label>
          <Input
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="nome-ruolo"
            disabled={isSystem && !isCreating}
          />
          {isSystem && !isCreating && (
            <p className="text-xs text-muted-foreground">
              Il nome dei ruoli di sistema non puo essere modificato
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Permessi</label>
          <PermissionMatrix
            selectedPermissions={permissions}
            onChange={onPermissionsChange}
          />
        </div>

        {feedback && (
          <p className={`text-sm ${feedback.type === 'success' ? 'text-green-600' : 'text-destructive'}`}>
            {feedback.message}
          </p>
        )}

        <div className="flex items-center gap-2 pt-4 border-t border-border">
          <Button onClick={onSave} disabled={saving}>
            {saving ? 'Salvataggio...' : isCreating ? 'Crea Ruolo' : 'Salva Modifiche'}
          </Button>
          {!isCreating && !isSystem && (
            <Button variant="destructive" onClick={onDelete} disabled={saving || memberCount > 0}>
              Elimina Ruolo
            </Button>
          )}
          {!isCreating && !isSystem && memberCount > 0 && (
            <span className="text-xs text-muted-foreground">
              Non eliminabile: {memberCount} utenti assegnati
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
