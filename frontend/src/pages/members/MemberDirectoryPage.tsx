import { useState, useCallback } from 'react';
import { useMemberDirectory } from '@/hooks/use-members';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function MemberDirectoryPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const { data: members, isLoading, error, meta } = useMemberDirectory({
    page,
    limit: 24,
    search: search || undefined,
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

  const totalPages = meta ? Math.ceil(meta.total / meta.limit) : 1;

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <p className="text-destructive">Errore: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Elenco Soci</h1>

      {/* Search */}
      <div className="flex gap-2 max-w-md">
        <Input
          placeholder="Cerca per nome o cognome..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button variant="secondary" onClick={handleSearch}>
          Cerca
        </Button>
      </div>

      {isLoading && <LoadingSpinner centered />}

      {/* Card grid */}
      {!isLoading && members && members.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {members.map((member) => (
            <Card key={member.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar
                    firstName={member.firstName}
                    lastName={member.lastName}
                  />
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {member.lastName} {member.firstName}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {member.memberRoles.map((mr) => (
                        <Badge key={mr.role.id} variant="outline" className="text-xs">
                          {mr.role.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Public contact info */}
                <div className="space-y-1 text-sm text-muted-foreground">
                  {member.email && (
                    <p className="truncate">{member.email}</p>
                  )}
                  {member.cellPhone && <p>{member.cellPhone}</p>}
                  {member.homePhone && <p>{member.homePhone}</p>}
                  {member.city && <p>{member.city}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && members && members.length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          Nessun socio trovato
        </p>
      )}

      {/* Pagination */}
      {meta && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {meta.total} soci
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Precedente
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
              Successivo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
