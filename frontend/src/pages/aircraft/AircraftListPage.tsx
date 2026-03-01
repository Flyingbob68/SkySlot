/**
 * Fleet overview page.
 *
 * Renders a responsive card grid of all aircraft showing callsign, type,
 * seats, and status.  Managers see a "Nuovo Aeromobile" button.
 * All text is in Italian.
 */

import { Link } from 'react-router-dom';
import { useAircraft } from '@/hooks/use-aircraft';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { Aircraft } from '@/types/aircraft';

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

function getStatusBadge(aircraft: Aircraft) {
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
    return '-';
  }
  return `${Number(rate).toFixed(2)} \u20AC/h`;
}

// ---------------------------------------------------------------------------
// Permission check
// ---------------------------------------------------------------------------

function hasPermission(permission: string): boolean {
  const user = useAuthStore.getState().user;
  return user?.permissions.includes(permission) ?? false;
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function AircraftListPage() {
  const { data: aircraft, error, isLoading } = useAircraft();
  const canManage = hasPermission('aircraft:manage');

  if (isLoading) {
    return <LoadingSpinner centered size="lg" />;
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  const fleet = aircraft ?? [];

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Flotta</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestione degli aeromobili del club
          </p>
        </div>
        {canManage && (
          <Link to="/aeromobili/nuovo">
            <Button>Nuovo Aeromobile</Button>
          </Link>
        )}
      </div>

      {fleet.length === 0 ? (
        <p className="text-muted-foreground">
          Nessun aeromobile registrato.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {fleet.map((ac) => (
            <Link key={ac.id} to={`/aeromobili/${ac.id}`} className="block">
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{ac.callsign}</CardTitle>
                    {getStatusBadge(ac)}
                  </div>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Tipo</dt>
                      <dd className="font-medium">{ac.type}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Posti</dt>
                      <dd className="font-medium">{ac.seats}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Costo orario</dt>
                      <dd className="font-medium">
                        {formatHourlyRate(ac.hourlyRate)}
                      </dd>
                    </div>
                  </dl>
                  {ac.comments && (
                    <p
                      className="mt-3 text-xs text-muted-foreground line-clamp-2"
                      title={ac.comments}
                    >
                      {ac.comments}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
