/**
 * Embeddable component for aircraft qualification requirements.
 *
 * Displays requirement groups using AND/OR logic:
 *   "Gruppo 1 (AND): PPL OR GPL"
 *   "Gruppo 2 (AND): SEP"
 *
 * In edit mode, managers can add/remove requirements.
 * All text is in Italian.
 */

import { useState, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useQualifications } from '@/hooks/use-qualifications';
import { useApi } from '@/hooks/use-api';
import * as qualificationService from '@/services/qualification-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { QualificationRequirementGroup } from '@/types/qualification';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AircraftRequirementsProps {
  readonly aircraftId: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hasPermission(permission: string): boolean {
  const user = useAuthStore.getState().user;
  return user?.permissions.includes(permission) ?? false;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AircraftRequirements({
  aircraftId,
}: AircraftRequirementsProps) {
  const {
    data: groups,
    error,
    isLoading,
    refetch,
  } = useApi<QualificationRequirementGroup[]>(
    () => qualificationService.getAircraftRequirements(aircraftId),
    [aircraftId],
  );

  const { data: allQualifications } = useQualifications();
  const canManage = hasPermission('qualification:manage');

  const [isEditing, setIsEditing] = useState(false);
  const [newGroup, setNewGroup] = useState('');
  const [newQualId, setNewQualId] = useState('');

  // Build a set of all qualification IDs already used as requirements
  const usedQualIds = useMemo(() => {
    const ids = new Set<string>();
    for (const group of groups ?? []) {
      for (const q of group.qualifications) {
        ids.add(q.id);
      }
    }
    return ids;
  }, [groups]);

  const availableQualifications = useMemo(
    () => (allQualifications ?? []).filter((q) => !usedQualIds.has(q.id)),
    [allQualifications, usedQualIds],
  );

  const handleAddRequirement = useCallback(async () => {
    if (!newQualId || !newGroup) return;

    const checkGroup = parseInt(newGroup, 10);
    if (isNaN(checkGroup) || checkGroup < 1) return;

    // Build new requirements array from current + new
    const currentRequirements = (groups ?? []).flatMap((g) =>
      g.qualifications.map((q) => ({
        checkGroup: g.checkGroup,
        qualificationId: q.id,
      })),
    );

    const updatedRequirements = [
      ...currentRequirements,
      { checkGroup, qualificationId: newQualId },
    ];

    const result =
      await qualificationService.getAircraftRequirements(aircraftId);

    // For now, just refetch - the actual update would go through aircraft API
    if (result.success) {
      // We need to PUT to the aircraft qualifications endpoint
      const { updateQualificationRequirements } = await import(
        '@/services/aircraft-service'
      );
      await updateQualificationRequirements(aircraftId, updatedRequirements);
      setNewGroup('');
      setNewQualId('');
      refetch();
    }
  }, [aircraftId, groups, newGroup, newQualId, refetch]);

  const handleRemoveRequirement = useCallback(
    async (
      targetCheckGroup: number,
      targetQualId: string,
    ) => {
      const currentRequirements = (groups ?? []).flatMap((g) =>
        g.qualifications.map((q) => ({
          checkGroup: g.checkGroup,
          qualificationId: q.id,
        })),
      );

      const updatedRequirements = currentRequirements.filter(
        (r) =>
          !(
            r.checkGroup === targetCheckGroup &&
            r.qualificationId === targetQualId
          ),
      );

      const { updateQualificationRequirements } = await import(
        '@/services/aircraft-service'
      );
      await updateQualificationRequirements(aircraftId, updatedRequirements);
      refetch();
    },
    [aircraftId, groups, refetch],
  );

  if (isLoading) {
    return <LoadingSpinner size="sm" />;
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  const requirementGroups = groups ?? [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Requisiti Qualifiche</CardTitle>
          {canManage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? 'Fine' : 'Modifica'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {requirementGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nessun requisito di qualifica configurato.
          </p>
        ) : (
          <div className="space-y-3">
            {requirementGroups.map((group) => (
              <div
                key={group.checkGroup}
                className="rounded-md border p-3"
              >
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant="outline">
                    Gruppo {group.checkGroup}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    (AND)
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {group.qualifications.map((q, idx) => (
                    <span key={q.id} className="flex items-center gap-1">
                      {idx > 0 && (
                        <span className="text-xs text-muted-foreground">
                          OR
                        </span>
                      )}
                      <Badge className="bg-blue-600 text-white">
                        {q.name}
                      </Badge>
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() =>
                            handleRemoveRequirement(
                              group.checkGroup,
                              q.id,
                            )
                          }
                          className="ml-1 text-xs text-destructive hover:text-destructive/80"
                          aria-label={`Rimuovi ${q.name}`}
                        >
                          x
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {isEditing && (
          <div className="mt-4 rounded-md border p-3 space-y-3">
            <p className="text-sm font-medium">
              Aggiungi requisito
            </p>
            <div className="flex items-end gap-2">
              <div>
                <label
                  htmlFor="check-group"
                  className="mb-1 block text-xs text-muted-foreground"
                >
                  Gruppo
                </label>
                <Input
                  id="check-group"
                  type="number"
                  min={1}
                  value={newGroup}
                  onChange={(e) => setNewGroup(e.target.value)}
                  className="w-20"
                  placeholder="1"
                />
              </div>
              <div className="flex-1">
                <label
                  htmlFor="qual-select"
                  className="mb-1 block text-xs text-muted-foreground"
                >
                  Qualifica
                </label>
                <select
                  id="qual-select"
                  value={newQualId}
                  onChange={(e) => setNewQualId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Seleziona...</option>
                  {availableQualifications.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                size="sm"
                onClick={handleAddRequirement}
                disabled={!newGroup || !newQualId}
              >
                Aggiungi
              </Button>
            </div>
          </div>
        )}

        {requirementGroups.length > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            Tutti i gruppi devono essere soddisfatti (AND). All'interno
            di ogni gruppo basta una qualifica (OR).
          </p>
        )}
      </CardContent>
    </Card>
  );
}
