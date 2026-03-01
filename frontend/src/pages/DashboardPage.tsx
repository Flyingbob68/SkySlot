import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Plane,
  Users,
  Award,
  AlertTriangle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useConfigStore } from '@/stores/config-store';
import { useApi } from '@/hooks/use-api';
import { getStats } from '@/services/admin-service';
import { fetchMyBookings } from '@/services/booking-service';
import type { DashboardStats } from '@/services/admin-service';
import type { Booking } from '@/services/booking-service';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly value: string | number;
  readonly color: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl bg-card p-5 shadow-sm border border-border">
      <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}

function TodayBookings({ bookings }: { readonly bookings: readonly Booking[] }) {
  const today = new Date().toISOString().split('T')[0];
  const todayBookings = bookings.filter((b) => b.startDate.startsWith(today!));

  if (todayBookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Calendar className="mb-2 h-8 w-8" />
        <p>Nessuna prenotazione per oggi</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {todayBookings.map((booking) => {
        const start = new Date(booking.startDate);
        const end = new Date(booking.endDate);
        const timeStr = `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')} - ${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`;

        return (
          <li key={booking.id} className="flex items-center gap-3 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Plane className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {booking.aircraft.callsign} - {booking.aircraft.type}
              </p>
              <p className="text-xs text-muted-foreground">
                <Clock className="mr-1 inline h-3 w-3" />
                {timeStr}
                {booking.slotType === 'DUAL' && booking.instructor && (
                  <span className="ml-2">
                    con {booking.instructor.firstName} {booking.instructor.lastName}
                  </span>
                )}
              </p>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              booking.slotType === 'SOLO'
                ? 'bg-blue-100 text-blue-700'
                : booking.slotType === 'DUAL'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-orange-100 text-orange-700'
            }`}>
              {booking.slotType}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function AircraftUsageChart({ stats }: { readonly stats: DashboardStats }) {
  const maxCount = Math.max(...stats.mostUsedAircraft.map((a) => a.bookingCount), 1);

  if (stats.mostUsedAircraft.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">Nessun dato disponibile</p>;
  }

  return (
    <ul className="space-y-3">
      {stats.mostUsedAircraft.map((aircraft) => (
        <li key={aircraft.aircraftId}>
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{aircraft.callsign}</span>
            <span className="text-muted-foreground">{aircraft.bookingCount} voli</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary transition-all"
              style={{ width: `${(aircraft.bookingCount / maxCount) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { config, fetchConfig } = useConfigStore();

  const { data: stats, isLoading: statsLoading } = useApi<DashboardStats>(
    () => getStats(),
    [],
  );

  const { data: myBookings, isLoading: bookingsLoading } = useApi<Booking[]>(
    () => fetchMyBookings(),
    [],
  );

  useEffect(() => {
    if (!config) {
      fetchConfig();
    }
  }, [config, fetchConfig]);

  const isAdmin = user?.permissions.includes('club:configure') ?? false;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Welcome header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">
          Bentornato, {user?.firstName}
        </h1>
        <p className="text-muted-foreground">
          {config?.clubName ?? 'SkySlot'} &mdash;{' '}
          {new Date().toLocaleDateString('it-IT', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Info message */}
      {config?.infoMessage && (
        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <p className="text-sm">{config.infoMessage}</p>
        </div>
      )}

      {/* Stats cards */}
      {isAdmin && stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<Users className="h-6 w-6 text-blue-600" />}
            label="Soci Attivi"
            value={stats.activeMembers}
            color="bg-blue-100"
          />
          <StatCard
            icon={<Calendar className="h-6 w-6 text-green-600" />}
            label="Prenotazioni Mese"
            value={stats.monthlyBookings}
            color="bg-green-100"
          />
          <StatCard
            icon={<Clock className="h-6 w-6 text-purple-600" />}
            label="Ore Volo Mese"
            value={stats.monthlyFlightHours}
            color="bg-purple-100"
          />
          <StatCard
            icon={<Award className="h-6 w-6 text-orange-600" />}
            label="Qualifiche in Scadenza"
            value={stats.expiringQualifications}
            color={stats.expiringQualifications > 0 ? 'bg-orange-100' : 'bg-green-100'}
          />
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Today's bookings */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Le mie prenotazioni di oggi</h2>
            <Link
              to="/prenotazioni/mie"
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              Tutte <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {bookingsLoading ? (
            <LoadingSpinner centered />
          ) : (
            <TodayBookings bookings={myBookings ?? []} />
          )}
        </div>

        {/* Aircraft usage (admin only) */}
        {isAdmin && (
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Aeromobili pi&ugrave; utilizzati</h2>
              <Link
                to="/admin/statistiche"
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Statistiche <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {statsLoading ? (
              <LoadingSpinner centered />
            ) : stats ? (
              <AircraftUsageChart stats={stats} />
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Dati non disponibili
              </p>
            )}
          </div>
        )}

        {/* Quick actions */}
        <div className={`rounded-xl border border-border bg-card p-5 shadow-sm ${isAdmin ? '' : 'lg:col-span-1'}`}>
          <h2 className="mb-4 text-lg font-semibold">Azioni rapide</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/prenotazioni/calendario"
              className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 transition-colors hover:bg-accent"
            >
              <Calendar className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium">Prenota volo</span>
            </Link>
            <Link
              to="/prenotazioni/mie"
              className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 transition-colors hover:bg-accent"
            >
              <Clock className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium">I miei voli</span>
            </Link>
            <Link
              to="/profilo"
              className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 transition-colors hover:bg-accent"
            >
              <Users className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium">Profilo</span>
            </Link>
            <Link
              to="/istruttori"
              className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 transition-colors hover:bg-accent"
            >
              <Award className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium">Istruttori</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
