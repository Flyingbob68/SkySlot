/**
 * Embeddable component for displaying a member's qualifications.
 *
 * Intended to be placed inside the member detail page.
 * Shows qualifications with expiry dates and status badges:
 *   - Green:  valid
 *   - Yellow: expiring soon (< 60 days)
 *   - Red:    expired
 *
 * Managers can add/remove qualifications.
 * All text is in Italian.
 */

import { useState, useCallback } from 'react';
import { useMemberQualifications, useQualifications } from '@/hooks/use-qualifications';
import { useAuthStore } from '@/stores/auth-store';
import * as qualificationService from '@/services/qualification-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { MemberQualification } from '@/types/qualification';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MemberQualificationsProps {
  readonly memberId: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hasPermission(permission: string): boolean {
  const user = useAuthStore.getState().user;
  return user?.permissions.includes(permission) ?? false;
}

function getStatusBadge(mq: MemberQualification) {
  if (!mq.qualification.hasExpiry || !mq.expiryDate) {
    return <Badge className="bg-green-600 text-white">Valida</Badge>;
  }

  const now = new Date();
  const expiry = new Date(mq.expiryDate);
  const daysRemaining = Math.ceil(
    (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysRemaining < 0) {
    return <Badge className="bg-red-600 text-white">Scaduta</Badge>;
  }
  if (daysRemaining < 60) {
    return (
      <Badge className="bg-yellow-500 text-white">
        Scade tra {daysRemaining}g
      </Badge>
    );
  }
  return <Badge className="bg-green-600 text-white">Valida</Badge>;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MemberQualifications({
  memberId,
}: MemberQualificationsProps) {
  const {
    data: memberQuals,
    error,
    isLoading,
    refetch,
  } = useMemberQualifications(memberId);

  const { data: allQualifications } = useQualifications();
  const canManage = hasPermission('qualification:manage');

  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedQualId, setSelectedQualId] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Compute available qualifications (not yet assigned)
  const assignedIds = new Set(
    (memberQuals ?? []).map((mq) => mq.qualificationId),
  );
  const availableQualifications = (allQualifications ?? []).filter(
    (q) => !assignedIds.has(q.id),
  );

  const handleAssign = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedQualId) return;

      setFormError(null);
      setIsSaving(true);

      const payload: { qualificationId: string; expiryDate?: string } = {
        qualificationId: selectedQualId,
      };

      if (expiryDate) {
        payload.expiryDate = new Date(expiryDate).toISOString();
      }

      const result = await qualificationService.assignQualification(
        memberId,
        payload,
      );

      setIsSaving(false);

      if (result.success) {
        setShowAddForm(false);
        setSelectedQualId('');
        setExpiryDate('');
        refetch();
      } else {
        setFormError(result.error ?? 'Errore durante l\'assegnazione');
      }
    },
    [memberId, selectedQualId, expiryDate, refetch],
  );

  const handleRemove = useCallback(
    async (qualificationId: string) => {
      const result = await qualificationService.removeMemberQualification(
        memberId,
        qualificationId,
      );

      if (result.success) {
        refetch();
      }
    },
    [memberId, refetch],
  );

  if (isLoading) {
    return <LoadingSpinner size="sm" />;
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  const qualifications = memberQuals ?? [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Qualifiche</CardTitle>
          {canManage && !showAddForm && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(true)}
            >
              Aggiungi
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {showAddForm && canManage && (
          <form
            onSubmit={handleAssign}
            className="mb-4 rounded-md border p-3 space-y-3"
          >
            <div>
              <label
                htmlFor="qual-select"
                className="mb-1 block text-sm font-medium"
              >
                Qualifica
              </label>
              <select
                id="qual-select"
                value={selectedQualId}
                onChange={(e) => setSelectedQualId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              >
                <option value="">Seleziona qualifica...</option>
                {availableQualifications.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.name}
                    {q.hasExpiry ? ' (con scadenza)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {selectedQualId &&
              availableQualifications.find(
                (q) => q.id === selectedQualId,
              )?.hasExpiry && (
                <div>
                  <label
                    htmlFor="expiry-date"
                    className="mb-1 block text-sm font-medium"
                  >
                    Data di scadenza
                  </label>
                  <Input
                    id="expiry-date"
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    required
                  />
                </div>
              )}

            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}

            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={isSaving}>
                {isSaving ? 'Salvataggio...' : 'Assegna'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAddForm(false);
                  setFormError(null);
                }}
              >
                Annulla
              </Button>
            </div>
          </form>
        )}

        {qualifications.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nessuna qualifica assegnata.
          </p>
        ) : (
          <div className="space-y-2">
            {qualifications.map((mq) => (
              <div
                key={mq.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div>
                  <span className="font-medium">
                    {mq.qualification.name}
                  </span>
                  {mq.qualification.hasExpiry && (
                    <span className="ml-2 text-sm text-muted-foreground">
                      Scadenza: {formatDate(mq.expiryDate)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(mq)}
                  {canManage && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemove(mq.qualificationId)}
                    >
                      Rimuovi
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
