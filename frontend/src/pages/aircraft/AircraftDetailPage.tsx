/**
 * Aircraft detail page.
 *
 * Shows all fields for a single aircraft, qualification requirements
 * grouped by check level, and action buttons for freeze/unfreeze,
 * edit, and deactivate based on user permissions.
 * All text is in Italian.
 */

import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAircraftDetail } from '@/hooks/use-aircraft';
import { useAuthStore } from '@/stores/auth-store';
import {
  freezeAircraft,
  unfreezeAircraft,
  deactivateAircraft,
} from '@/services/aircraft-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { AircraftWithQualifications } from '@/types/aircraft';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStatusBadge(aircraft: AircraftWithQualifications) {
  if (!aircraft.active) {
    return <Badge className="bg-red-600 text-white">Disattivato</Badge>;
  }
  if (aircraft.nonBookable) {
    return <Badge className="bg-orange-500 text-white">In Manutenzione</Badge>;
  }
  return <Badge className="bg-green-600 text-white">Attivo</Badge>;
}

function formatHourlyRate(rate: string | null): string {
  if (!rate) {
    return 'Non specificato';
  }
  return `${Number(rate).toFixed(2)} \u20AC/h`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function hasPermission(permission: string): boolean {
  const user = useAuthStore.getState().user;
  return user?.permissions.includes(permission) ?? false;
}

function groupQualifications(aircraft: AircraftWithQualifications) {
  const groups: Record<number, Array<{ id: string; name: string }>> = {};

  for (const req of aircraft.qualificationRequirements) {
    const group = req.checkGroup;
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push({
      id: req.qualification.id,
      name: req.qualification.name,
    });
  }

  return groups;
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function AircraftDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: aircraft, error, isLoading, refetch } = useAircraftDetail(id!);

  const [actionError, setActionError] = useState<string | null>(null);
  const [isActioning, setIsActioning] = useState(false);

  const canManage = hasPermission('aircraft:manage');
  const canFreeze = hasPermission('aircraft:freeze');

  if (isLoading) {
    return <LoadingSpinner centered size="lg" />;
  }

  if (error || !aircraft) {
    return (
      <div className="p-4 sm:p-6">
        <p className="text-destructive">{error ?? 'Aeromobile non trovato'}</p>
        <Link to="/aeromobili" className="mt-4 inline-block text-sm text-primary underline">
          Torna alla flotta
        </Link>
      </div>
    );
  }

  const qualificationGroups = groupQualifications(aircraft);
  const groupKeys = Object.keys(qualificationGroups)
    .map(Number)
    .sort((a, b) => a - b);

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const handleFreeze = async () => {
    setIsActioning(true);
    setActionError(null);
    const result = await freezeAircraft(aircraft.id);
    setIsActioning(false);

    if (result.success) {
      refetch();
    } else {
      setActionError(result.error ?? 'Errore durante la messa in manutenzione');
    }
  };

  const handleUnfreeze = async () => {
    setIsActioning(true);
    setActionError(null);
    const result = await unfreezeAircraft(aircraft.id);
    setIsActioning(false);

    if (result.success) {
      refetch();
    } else {
      setActionError(result.error ?? 'Errore durante la riattivazione');
    }
  };

  const handleDeactivate = async () => {
    if (!window.confirm('Sei sicuro di voler disattivare questo aeromobile?')) {
      return;
    }

    setIsActioning(true);
    setActionError(null);
    const result = await deactivateAircraft(aircraft.id);
    setIsActioning(false);

    if (result.success) {
      navigate('/aeromobili');
    } else {
      setActionError(result.error ?? 'Errore durante la disattivazione');
    }
  };

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/aeromobili" className="text-sm text-muted-foreground hover:underline">
            Flotta
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-xl sm:text-2xl font-bold">{aircraft.callsign}</h1>
          {getStatusBadge(aircraft)}
        </div>

        <div className="flex gap-2">
          {canFreeze && aircraft.active && (
            <>
              {aircraft.nonBookable ? (
                <Button
                  variant="outline"
                  onClick={handleUnfreeze}
                  disabled={isActioning}
                >
                  Rimuovi Manutenzione
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={handleFreeze}
                  disabled={isActioning}
                >
                  Metti in Manutenzione
                </Button>
              )}
            </>
          )}
          {canManage && (
            <>
              <Link to={`/aeromobili/${aircraft.id}/modifica`}>
                <Button variant="secondary">Modifica</Button>
              </Link>
              {aircraft.active && (
                <Button
                  variant="destructive"
                  onClick={handleDeactivate}
                  disabled={isActioning}
                >
                  Disattiva
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {actionError && (
        <p className="mb-4 text-sm text-destructive">{actionError}</p>
      )}

      {/* Details grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informazioni Generali</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Immatricolazione</dt>
                <dd className="font-medium">{aircraft.callsign}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Tipo</dt>
                <dd className="font-medium">{aircraft.type}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Posti</dt>
                <dd className="font-medium">{aircraft.seats}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Costo Orario</dt>
                <dd className="font-medium">{formatHourlyRate(aircraft.hourlyRate)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Ordine Visualizzazione</dt>
                <dd className="font-medium">{aircraft.displayOrder}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Creato il</dt>
                <dd className="font-medium">{formatDate(aircraft.createdAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Aggiornato il</dt>
                <dd className="font-medium">{formatDate(aircraft.updatedAt)}</dd>
              </div>
            </dl>
            {aircraft.comments && (
              <div className="mt-4 border-t pt-3">
                <dt className="text-sm text-muted-foreground">Note</dt>
                <dd className="mt-1 text-sm">{aircraft.comments}</dd>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Requisiti Qualifiche</CardTitle>
          </CardHeader>
          <CardContent>
            {groupKeys.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nessun requisito di qualifica configurato.
              </p>
            ) : (
              <div className="space-y-4">
                {groupKeys.map((groupNum) => (
                  <div key={groupNum}>
                    <h4 className="text-sm font-semibold text-muted-foreground">
                      Livello {groupNum + 1}
                      <span className="ml-2 font-normal">
                        (almeno una richiesta)
                      </span>
                    </h4>
                    <ul className="mt-1 space-y-1">
                      {qualificationGroups[groupNum].map((qual) => (
                        <li
                          key={qual.id}
                          className="text-sm flex items-center gap-2"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                          {qual.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  Il pilota deve soddisfare tutti i livelli (AND) avendo almeno
                  una qualifica per livello (OR).
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
