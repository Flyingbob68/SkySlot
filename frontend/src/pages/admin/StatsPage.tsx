/**
 * Administration statistics page.
 *
 * Displays summary cards for active members, monthly bookings,
 * monthly flight hours, top 5 aircraft usage, and expiring
 * qualifications.  All text in Italian.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useStats } from '@/hooks/use-admin';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StatsPage() {
  const { data: stats, isLoading, error } = useStats();

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

  if (!stats) {
    return null;
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Statistiche</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Soci Attivi"
          value={String(stats.activeMembers)}
        />
        <StatCard
          title="Prenotazioni Mese"
          value={String(stats.monthlyBookings)}
        />
        <StatCard
          title="Ore Volo Mese"
          value={`${stats.monthlyFlightHours}h`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Most used aircraft */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Aeromobili Utilizzati</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.mostUsedAircraft.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nessuna prenotazione questo mese
              </p>
            ) : (
              <div className="space-y-3">
                {stats.mostUsedAircraft.map((aircraft, index) => (
                  <AircraftBar
                    key={aircraft.aircraftId}
                    rank={index + 1}
                    callsign={aircraft.callsign}
                    type={aircraft.type}
                    count={aircraft.bookingCount}
                    maxCount={stats.mostUsedAircraft[0].bookingCount}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expiring qualifications */}
        <Card>
          <CardHeader>
            <CardTitle>Qualifiche in Scadenza</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <span
                className={`text-4xl font-bold ${
                  stats.expiringQualifications > 0 ? 'text-orange-500' : 'text-green-600'
                }`}
              >
                {stats.expiringQualifications}
              </span>
              <p className="text-sm text-muted-foreground">
                {stats.expiringQualifications === 0
                  ? 'Nessuna qualifica in scadenza nei prossimi 30 giorni'
                  : stats.expiringQualifications === 1
                    ? 'qualifica in scadenza nei prossimi 30 giorni'
                    : 'qualifiche in scadenza nei prossimi 30 giorni'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------

function StatCard({ title, value }: {
  readonly title: string;
  readonly value: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-3xl font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// AircraftBar
// ---------------------------------------------------------------------------

function AircraftBar({ rank, callsign, type, count, maxCount }: {
  readonly rank: number;
  readonly callsign: string;
  readonly type: string;
  readonly count: number;
  readonly maxCount: number;
}) {
  const widthPercent = maxCount > 0 ? (count / maxCount) * 100 : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span>
          <span className="text-muted-foreground mr-2">{rank}.</span>
          <span className="font-medium">{callsign}</span>
          <span className="text-muted-foreground ml-2">({type})</span>
        </span>
        <span className="font-mono text-xs">
          {count} {count === 1 ? 'prenotazione' : 'prenotazioni'}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${widthPercent}%` }}
        />
      </div>
    </div>
  );
}
