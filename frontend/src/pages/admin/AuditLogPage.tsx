/**
 * Audit log page.
 *
 * Paginated table of audit entries with filters for user, entity,
 * action, and date range.  Clicking a row expands to show old/new
 * values as a JSON diff.  All text in Italian.
 */

import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuditLogs } from '@/hooks/use-admin';
import type { AuditLogEntry, AuditQueryParams } from '@/services/admin-service';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AuditLogPage() {
  const [filters, setFilters] = useState<AuditQueryParams>({
    page: 1,
    limit: 20,
  });
  const { data: logs, isLoading, error, meta } = useAuditLogs(filters);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleFilterChange = useCallback((field: keyof AuditQueryParams, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value || undefined,
      page: 1, // Reset to first page on filter change
    }));
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const totalPages = meta ? Math.ceil(meta.total / meta.limit) : 0;
  const currentPage = filters.page ?? 1;

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Log di Audit</h1>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <FilterField label="Utente (ID)">
              <Input
                value={filters.userId ?? ''}
                onChange={(e) => handleFilterChange('userId', e.target.value)}
                placeholder="ID utente"
              />
            </FilterField>
            <FilterField label="Entita">
              <Input
                value={filters.entity ?? ''}
                onChange={(e) => handleFilterChange('entity', e.target.value)}
                placeholder="es. Booking, Member"
              />
            </FilterField>
            <FilterField label="Azione">
              <Input
                value={filters.action ?? ''}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                placeholder="es. create, update"
              />
            </FilterField>
            <FilterField label="Da">
              <Input
                type="datetime-local"
                value={filters.from ?? ''}
                onChange={(e) =>
                  handleFilterChange('from', e.target.value ? new Date(e.target.value).toISOString() : '')
                }
              />
            </FilterField>
            <FilterField label="A">
              <Input
                type="datetime-local"
                value={filters.to ?? ''}
                onChange={(e) =>
                  handleFilterChange('to', e.target.value ? new Date(e.target.value).toISOString() : '')
                }
              />
            </FilterField>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {isLoading && <LoadingSpinner centered />}

      {error && <p className="text-destructive">{error}</p>}

      {!isLoading && !error && (
        <>
          {/* Desktop table */}
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-3 font-medium">Data/Ora</th>
                      <th className="text-left p-3 font-medium">Utente</th>
                      <th className="text-left p-3 font-medium">Azione</th>
                      <th className="text-left p-3 font-medium">Entita</th>
                      <th className="text-left p-3 font-medium">ID Entita</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs?.map((entry) => (
                      <AuditRow
                        key={entry.id}
                        entry={entry}
                        isExpanded={expandedId === entry.id}
                        onToggle={toggleExpand}
                      />
                    ))}
                    {(!logs || logs.length === 0) && (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-muted-foreground">
                          Nessun risultato trovato
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Mobile card view */}
          <div className="md:hidden space-y-2">
            {logs?.map((entry) => (
              <AuditCard
                key={entry.id}
                entry={entry}
                isExpanded={expandedId === entry.id}
                onToggle={toggleExpand}
              />
            ))}
            {(!logs || logs.length === 0) && (
              <p className="text-center text-muted-foreground py-6">
                Nessun risultato trovato
              </p>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-muted-foreground text-center sm:text-left">
                Pagina {currentPage} di {totalPages} ({meta?.total ?? 0} risultati)
              </span>
              <div className="flex gap-1 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  Prec.
                </Button>
                <span className="flex items-center px-3 text-sm text-muted-foreground">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  Succ.
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AuditCard (mobile view)
// ---------------------------------------------------------------------------

function AuditCard({ entry, isExpanded, onToggle }: {
  readonly entry: AuditLogEntry;
  readonly isExpanded: boolean;
  readonly onToggle: (id: string) => void;
}) {
  const userName = entry.user
    ? `${entry.user.firstName} ${entry.user.lastName}`
    : 'Sistema';

  const formattedDate = new Date(entry.timestamp).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Card
      className="cursor-pointer hover:bg-muted/20 transition-colors"
      onClick={() => onToggle(entry.id)}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-muted">
                {entry.action}
              </span>
              <span className="text-sm font-medium">{entry.entity}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{userName}</p>
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">{formattedDate}</span>
        </div>
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <JsonDiff
              oldValues={entry.oldValues}
              newValues={entry.newValues}
              ipAddress={entry.ipAddress}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// AuditRow (desktop view)
// ---------------------------------------------------------------------------

function AuditRow({ entry, isExpanded, onToggle }: {
  readonly entry: AuditLogEntry;
  readonly isExpanded: boolean;
  readonly onToggle: (id: string) => void;
}) {
  const userName = entry.user
    ? `${entry.user.firstName} ${entry.user.lastName}`
    : 'Sistema';

  const formattedDate = new Date(entry.timestamp).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <>
      <tr
        className="border-b border-border hover:bg-muted/20 cursor-pointer transition-colors"
        onClick={() => onToggle(entry.id)}
      >
        <td className="p-3 text-xs font-mono">{formattedDate}</td>
        <td className="p-3">{userName}</td>
        <td className="p-3">
          <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-muted">
            {entry.action}
          </span>
        </td>
        <td className="p-3">{entry.entity}</td>
        <td className="p-3 text-xs font-mono text-muted-foreground">
          {entry.entityId ?? '-'}
        </td>
      </tr>
      {isExpanded && (
        <tr className="border-b border-border">
          <td colSpan={5} className="p-4 bg-muted/10">
            <JsonDiff
              oldValues={entry.oldValues}
              newValues={entry.newValues}
              ipAddress={entry.ipAddress}
            />
          </td>
        </tr>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// JsonDiff
// ---------------------------------------------------------------------------

function JsonDiff({ oldValues, newValues, ipAddress }: {
  readonly oldValues: unknown;
  readonly newValues: unknown;
  readonly ipAddress: string | null;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-1">
            Valori precedenti
          </h4>
          <pre className="text-xs bg-muted/30 p-2 rounded overflow-auto max-h-48">
            {oldValues ? JSON.stringify(oldValues, null, 2) : 'Nessuno'}
          </pre>
        </div>
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-1">
            Nuovi valori
          </h4>
          <pre className="text-xs bg-muted/30 p-2 rounded overflow-auto max-h-48">
            {newValues ? JSON.stringify(newValues, null, 2) : 'Nessuno'}
          </pre>
        </div>
      </div>
      {ipAddress && (
        <p className="text-xs text-muted-foreground">
          Indirizzo IP: <span className="font-mono">{ipAddress}</span>
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FilterField
// ---------------------------------------------------------------------------

function FilterField({ label, children }: {
  readonly label: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
