import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpDown, ArrowUp, ArrowDown, CheckCircle, AlertTriangle, XCircle, Ban } from 'lucide-react';
import { useMembers } from '@/hooks/use-members';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { MemberListItem } from '@/services/member-service';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZES = [15, 50, 100, 500] as const;
const DEFAULT_PAGE_SIZE = 500;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hasPermission(permissions: readonly string[], perm: string): boolean {
  return permissions.includes(perm);
}

type ExpiryStatus = 'ok' | 'warning' | 'expired' | 'none';

function getExpiryStatus(
  qualifications: MemberListItem['qualifications'],
): ExpiryStatus {
  if (!qualifications || qualifications.length === 0) return 'none';

  const now = new Date();
  const oneMonthFromNow = new Date();
  oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

  let hasExpiring = false;
  let hasExpired = false;
  let hasAnyWithExpiry = false;

  for (const q of qualifications) {
    if (!q.qualification.hasExpiry) continue;
    hasAnyWithExpiry = true;

    if (!q.expiryDate) {
      hasExpired = true;
      continue;
    }

    const expiry = new Date(q.expiryDate);
    if (expiry < now) {
      hasExpired = true;
    } else if (expiry <= oneMonthFromNow) {
      hasExpiring = true;
    }
  }

  if (!hasAnyWithExpiry) return 'none';
  if (hasExpired) return 'expired';
  if (hasExpiring) return 'warning';
  return 'ok';
}

function ExpiryIcon({ status }: { readonly status: ExpiryStatus }) {
  switch (status) {
    case 'ok':
      return <CheckCircle className="h-5 w-5 text-green-500 inline-block" aria-label="Qualifiche valide" />;
    case 'warning':
      return <AlertTriangle className="h-5 w-5 text-amber-500 inline-block" aria-label="Qualifiche in scadenza" />;
    case 'expired':
      return <XCircle className="h-5 w-5 text-red-500 inline-block" aria-label="Qualifiche scadute" />;
    case 'none':
      return <span className="h-5 w-5 text-muted-foreground inline-block text-center">-</span>;
  }
}

function SubscriptionIcon({ expiry }: { readonly expiry: string | null }) {
  if (!expiry) {
    return <span className="h-4 w-4 text-muted-foreground inline-block text-center">-</span>;
  }
  const isExpired = new Date(expiry) < new Date();
  if (isExpired) {
    return <Ban className="h-4 w-4 text-red-500 inline-block" aria-label="Quota scaduta" />;
  }
  return <CheckCircle className="h-4 w-4 text-green-500 inline-block" aria-label="Quota in regola" />;
}

function FlightsIcon({ ok }: { readonly ok: boolean }) {
  if (ok) {
    return <CheckCircle className="h-4 w-4 text-green-500 inline-block" aria-label="In regola" />;
  }
  return <Ban className="h-4 w-4 text-red-500 inline-block" aria-label="Non in regola" />;
}

function StatusBadge({ active }: { readonly active: boolean }) {
  return active ? (
    <Badge variant="default">Attivo</Badge>
  ) : (
    <Badge variant="destructive">Inattivo</Badge>
  );
}

function RoleBadges({
  memberRoles,
}: {
  readonly memberRoles: readonly { readonly role: { readonly id: string; readonly name: string } }[];
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {memberRoles.map((mr) => (
        <Badge key={mr.role.id} variant="secondary" className="text-xs">
          {mr.role.name}
        </Badge>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sort types
// ---------------------------------------------------------------------------

type SortField = 'memberNumber' | 'lastName' | 'firstName' | 'email' | 'active';
type SortOrder = 'asc' | 'desc';

function SortIcon({ field, currentSort, currentOrder }: {
  readonly field: SortField;
  readonly currentSort?: string;
  readonly currentOrder?: SortOrder;
}) {
  if (currentSort !== field) {
    return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />;
  }
  return currentOrder === 'asc'
    ? <ArrowUp className="h-3.5 w-3.5" />
    : <ArrowDown className="h-3.5 w-3.5" />;
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function MemberListPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const permissions = user?.permissions ?? [];
  const canManage = hasPermission(permissions, 'member:manage');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined);
  const [searchInput, setSearchInput] = useState('');
  const [sortBy, setSortBy] = useState<SortField | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const { data: members, isLoading, error, meta } = useMembers({
    page,
    limit: pageSize,
    search: search || undefined,
    active: activeFilter,
    sortBy,
    sortOrder,
  });

  const handleSearch = useCallback(() => {
    setSearch(searchInput);
    setPage(1);
  }, [searchInput]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSearch();
      }
    },
    [handleSearch],
  );

  const handleSort = useCallback((field: SortField) => {
    setSortBy((prev) => {
      if (prev === field) {
        setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
        return field;
      }
      setSortOrder('asc');
      return field;
    });
    setPage(1);
  }, []);

  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  }, []);

  const totalPages = meta ? Math.ceil(meta.total / meta.limit) : 1;

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <p className="text-destructive">Errore: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl sm:text-2xl font-bold">Soci</h1>
        {canManage && (
          <Button size="sm" onClick={() => navigate('/soci/nuovo')}>
            Nuovo Socio
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 gap-2">
          <Input
            placeholder="Cerca per nome, cognome o email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-w-0"
          />
          <Button variant="secondary" size="sm" onClick={handleSearch}>
            Cerca
          </Button>
        </div>
        <div className="flex gap-1.5 flex-wrap items-center">
          <Button
            variant={activeFilter === true ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setActiveFilter(true); setPage(1); }}
          >
            Attivi
          </Button>
          <Button
            variant={activeFilter === false ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setActiveFilter(false); setPage(1); }}
          >
            Inattivi
          </Button>
          <Button
            variant={activeFilter === undefined ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setActiveFilter(undefined); setPage(1); }}
          >
            Tutti
          </Button>
          <span className="text-muted-foreground text-xs mx-1 hidden sm:inline">|</span>
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>{size} per pagina</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && <LoadingSpinner centered />}

      {/* Desktop table */}
      {!isLoading && members && members.length > 0 && (
        <>
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th
                    className="pb-3 pr-2 font-medium text-muted-foreground cursor-pointer select-none whitespace-nowrap"
                    onClick={() => handleSort('memberNumber')}
                  >
                    <span className="inline-flex items-center gap-1">
                      N. Tessera
                      <SortIcon field="memberNumber" currentSort={sortBy} currentOrder={sortOrder} />
                    </span>
                  </th>
                  <th
                    className="pb-3 pr-2 font-medium text-muted-foreground cursor-pointer select-none"
                    onClick={() => handleSort('lastName')}
                  >
                    <span className="inline-flex items-center gap-1">
                      Cognome
                      <SortIcon field="lastName" currentSort={sortBy} currentOrder={sortOrder} />
                    </span>
                  </th>
                  <th
                    className="pb-3 pr-2 font-medium text-muted-foreground cursor-pointer select-none"
                    onClick={() => handleSort('firstName')}
                  >
                    <span className="inline-flex items-center gap-1">
                      Nome
                      <SortIcon field="firstName" currentSort={sortBy} currentOrder={sortOrder} />
                    </span>
                  </th>
                  <th
                    className="pb-3 pr-2 font-medium text-muted-foreground cursor-pointer select-none"
                    onClick={() => handleSort('email')}
                  >
                    <span className="inline-flex items-center gap-1">
                      Email
                      <SortIcon field="email" currentSort={sortBy} currentOrder={sortOrder} />
                    </span>
                  </th>
                  <th className="pb-3 pr-2 font-medium text-muted-foreground">Ruoli</th>
                  <th className="pb-3 pr-2 font-medium text-muted-foreground whitespace-nowrap text-center w-[80px]">Scadenze</th>
                  <th className="pb-3 pr-2 font-medium text-muted-foreground whitespace-nowrap text-center w-[60px]" title="Quota associativa">Quota</th>
                  <th className="pb-3 pr-2 font-medium text-muted-foreground whitespace-nowrap text-center w-[60px]" title="Pagamento voli">Voli</th>
                  <th
                    className="pb-3 font-medium text-muted-foreground cursor-pointer select-none"
                    onClick={() => handleSort('active')}
                  >
                    <span className="inline-flex items-center gap-1">
                      Stato
                      <SortIcon field="active" currentSort={sortBy} currentOrder={sortOrder} />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const expiryStatus = getExpiryStatus(member.qualifications);
                  return (
                    <tr
                      key={member.id}
                      className="border-b border-border/50 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => navigate(`/soci/${member.id}`)}
                    >
                      <td className="py-3 pr-2 text-muted-foreground font-mono text-xs">
                        {member.memberNumber ?? '-'}
                      </td>
                      <td className="py-3 pr-2">{member.lastName}</td>
                      <td className="py-3 pr-2">{member.firstName}</td>
                      <td className="py-3 pr-2 text-muted-foreground">{member.email}</td>
                      <td className="py-3 pr-2">
                        <RoleBadges memberRoles={member.memberRoles} />
                      </td>
                      <td className="py-3 pr-2 text-center w-[80px]">
                        <ExpiryIcon status={expiryStatus} />
                      </td>
                      <td className="py-3 pr-2 text-center w-[60px]">
                        <SubscriptionIcon expiry={member.subscriptionExpiry} />
                      </td>
                      <td className="py-3 pr-2 text-center w-[60px]">
                        <FlightsIcon ok={member.flightsPaid} />
                      </td>
                      <td className="py-3">
                        <StatusBadge active={member.active} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Tablet view (medium screens) */}
          <div className="hidden md:block lg:hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-3 pr-2 font-medium text-muted-foreground whitespace-nowrap">N.</th>
                  <th className="pb-3 pr-2 font-medium text-muted-foreground">Cognome Nome</th>
                  <th className="pb-3 pr-2 font-medium text-muted-foreground text-center w-[50px]">Scad.</th>
                  <th className="pb-3 pr-2 font-medium text-muted-foreground text-center w-[50px]" title="Finanziario">Fin.</th>
                  <th className="pb-3 font-medium text-muted-foreground">Stato</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const expiryStatus = getExpiryStatus(member.qualifications);
                  const subscriptionOk = !member.subscriptionExpiry || new Date(member.subscriptionExpiry) >= new Date();
                  const financeOk = subscriptionOk && member.flightsPaid;
                  return (
                    <tr
                      key={member.id}
                      className="border-b border-border/50 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => navigate(`/soci/${member.id}`)}
                    >
                      <td className="py-3 pr-2 text-muted-foreground font-mono text-xs">
                        {member.memberNumber ?? '-'}
                      </td>
                      <td className="py-3 pr-2">
                        <div>{member.lastName} {member.firstName}</div>
                        <div className="text-xs text-muted-foreground">{member.email}</div>
                      </td>
                      <td className="py-3 pr-2 text-center">
                        <ExpiryIcon status={expiryStatus} />
                      </td>
                      <td className="py-3 pr-2 text-center">
                        <FlightsIcon ok={financeOk} />
                      </td>
                      <td className="py-3">
                        <StatusBadge active={member.active} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card view */}
          <div className="md:hidden space-y-2">
            {members.map((member) => {
              const expiryStatus = getExpiryStatus(member.qualifications);
              const subscriptionOk = !member.subscriptionExpiry || new Date(member.subscriptionExpiry) >= new Date();
              const financeOk = subscriptionOk && member.flightsPaid;
              return (
                <Card
                  key={member.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/soci/${member.id}`)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <Avatar firstName={member.firstName} lastName={member.lastName} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">
                            {member.lastName} {member.firstName}
                          </p>
                          <ExpiryIcon status={expiryStatus} />
                          {!financeOk && <Ban className="h-4 w-4 text-red-500 shrink-0" aria-label="Non in regola" />}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {member.memberNumber ? `#${member.memberNumber} · ` : ''}
                          {member.email}
                        </p>
                      </div>
                      <StatusBadge active={member.active} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {!isLoading && members && members.length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          Nessun socio trovato
        </p>
      )}

      {/* Pagination */}
      {meta && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground text-center sm:text-left">
            {meta.total} soci totali
          </p>
          {totalPages > 1 && (
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Prec.
              </Button>
              <span className="flex items-center px-3 text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Succ.
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
