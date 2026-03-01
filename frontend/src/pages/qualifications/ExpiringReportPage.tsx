/**
 * Expiring qualifications report page.
 *
 * Displays a table of member qualifications that are expiring within
 * a configurable number of days.  Rows are color-coded:
 *   - Red:    < 7 days remaining (or already expired)
 *   - Orange: < 30 days remaining
 *   - Yellow: < 60 days remaining
 *
 * All text is in Italian.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExpiringQualifications } from '@/hooks/use-qualifications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { ExpiringQualification } from '@/types/qualification';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeDaysRemaining(expiryDate: string | null): number | null {
  if (!expiryDate) return null;

  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffMs = expiry.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function getRowClassName(daysRemaining: number | null): string {
  if (daysRemaining === null) return '';
  if (daysRemaining < 7) return 'bg-red-50 dark:bg-red-950/20';
  if (daysRemaining < 30) return 'bg-orange-50 dark:bg-orange-950/20';
  if (daysRemaining < 60) return 'bg-yellow-50 dark:bg-yellow-950/20';
  return '';
}

function getDaysBadge(daysRemaining: number | null) {
  if (daysRemaining === null) {
    return <Badge variant="outline">-</Badge>;
  }
  if (daysRemaining < 0) {
    return (
      <Badge className="bg-red-600 text-white">
        Scaduta ({Math.abs(daysRemaining)}g fa)
      </Badge>
    );
  }
  if (daysRemaining < 7) {
    return (
      <Badge className="bg-red-600 text-white">{daysRemaining}g</Badge>
    );
  }
  if (daysRemaining < 30) {
    return (
      <Badge className="bg-orange-500 text-white">{daysRemaining}g</Badge>
    );
  }
  if (daysRemaining < 60) {
    return (
      <Badge className="bg-yellow-500 text-white">{daysRemaining}g</Badge>
    );
  }
  return <Badge variant="outline">{daysRemaining}g</Badge>;
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
// Enrichment
// ---------------------------------------------------------------------------

interface EnrichedRow {
  readonly item: ExpiringQualification;
  readonly daysRemaining: number | null;
}

function enrichRows(
  items: readonly ExpiringQualification[],
): readonly EnrichedRow[] {
  return items.map((item) => ({
    item,
    daysRemaining: computeDaysRemaining(item.expiryDate),
  }));
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function ExpiringReportPage() {
  const [days, setDays] = useState(60);
  const { data, error, isLoading, refetch } =
    useExpiringQualifications(days);
  const navigate = useNavigate();

  const rows = useMemo(
    () => enrichRows(data ?? []),
    [data],
  );

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

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Report Scadenze Qualifiche</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Qualifiche in scadenza nei prossimi giorni
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/qualifiche')}>
          Torna alle Qualifiche
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label htmlFor="days" className="text-sm font-medium">
          Mostra scadenze entro
        </label>
        <Input
          id="days"
          type="number"
          min={1}
          max={365}
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value, 10) || 60)}
          className="w-20"
        />
        <span className="text-sm text-muted-foreground">giorni</span>
        <Button variant="outline" size="sm" onClick={refetch}>
          Aggiorna
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted-foreground">
          Nessuna qualifica in scadenza nel periodo selezionato.
        </p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              {rows.length} qualifica{rows.length !== 1 ? 'he' : ''} in
              scadenza
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-muted-foreground">
                      Socio
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Qualifica
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Data Scadenza
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Giorni
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.item.id}
                      className={`border-b last:border-0 ${getRowClassName(row.daysRemaining)}`}
                    >
                      <td className="py-3 font-medium">
                        {row.item.member.lastName} {row.item.member.firstName}
                      </td>
                      <td className="py-3">
                        {row.item.qualification.name}
                      </td>
                      <td className="py-3">
                        {formatDate(row.item.expiryDate)}
                      </td>
                      <td className="py-3">
                        {getDaysBadge(row.daysRemaining)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card view */}
            <div className="sm:hidden space-y-2">
              {rows.map((row) => (
                <div
                  key={row.item.id}
                  className={`border-b border-border/50 pb-2 last:border-0 ${getRowClassName(row.daysRemaining)} rounded p-2`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm">
                      {row.item.member.lastName} {row.item.member.firstName}
                    </span>
                    {getDaysBadge(row.daysRemaining)}
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {row.item.qualification.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(row.item.expiryDate)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
