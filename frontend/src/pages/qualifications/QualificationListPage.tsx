/**
 * Qualification definitions list page.
 *
 * Renders a table of all qualification definitions with name, expiry
 * flag, and description.  Managers see create/delete controls.
 * All text is in Italian.
 */

import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQualifications } from '@/hooks/use-qualifications';
import { useAuthStore } from '@/stores/auth-store';
import * as qualificationService from '@/services/qualification-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hasPermission(permission: string): boolean {
  const user = useAuthStore.getState().user;
  return user?.permissions.includes(permission) ?? false;
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function QualificationListPage() {
  const { data: qualifications, error, isLoading, refetch } =
    useQualifications();
  const canManage = hasPermission('qualification:manage');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = useCallback(
    async (id: string) => {
      setDeleteError(null);
      const result = await qualificationService.deleteQualification(id);

      if (result.success) {
        setDeleteId(null);
        refetch();
      } else {
        setDeleteError(result.error ?? 'Errore durante l\'eliminazione');
      }
    },
    [refetch],
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

  const items = qualifications ?? [];

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Qualifiche</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Definizioni delle qualifiche e licenze
          </p>
        </div>
        <div className="flex gap-2">
          {canManage && (
            <>
              <Link to="/qualifiche/scadenze">
                <Button variant="outline">Report Scadenze</Button>
              </Link>
              <Link to="/qualifiche/nuova">
                <Button>Nuova Qualifica</Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground">
          Nessuna qualifica definita.
        </p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Elenco Qualifiche</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-muted-foreground">
                      Nome
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground">
                      Scadenza
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground hidden md:table-cell">
                      Descrizione
                    </th>
                    {canManage && (
                      <th className="pb-3 font-medium text-muted-foreground text-right">
                        Azioni
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {items.map((q) => (
                    <tr key={q.id} className="border-b last:border-0">
                      <td className="py-3 font-medium">{q.name}</td>
                      <td className="py-3">
                        {q.hasExpiry ? (
                          <Badge className="bg-blue-600 text-white">
                            Si
                          </Badge>
                        ) : (
                          <Badge variant="outline">No</Badge>
                        )}
                      </td>
                      <td className="py-3 text-muted-foreground hidden md:table-cell">
                        {q.description ?? '-'}
                      </td>
                      {canManage && (
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link to={`/qualifiche/${q.id}/modifica`}>
                              <Button variant="outline" size="sm">
                                Modifica
                              </Button>
                            </Link>
                            {deleteId === q.id ? (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDelete(q.id)}
                                >
                                  Conferma
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setDeleteId(null);
                                    setDeleteError(null);
                                  }}
                                >
                                  Annulla
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setDeleteId(q.id)}
                              >
                                Elimina
                              </Button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card view */}
            <div className="sm:hidden space-y-3">
              {items.map((q) => (
                <div key={q.id} className="border-b border-border/50 pb-3 last:border-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{q.name}</span>
                    {q.hasExpiry ? (
                      <Badge className="bg-blue-600 text-white text-xs">Si</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">No</Badge>
                    )}
                  </div>
                  {q.description && (
                    <p className="text-xs text-muted-foreground mt-1">{q.description}</p>
                  )}
                  {canManage && (
                    <div className="flex gap-2 mt-2">
                      <Link to={`/qualifiche/${q.id}/modifica`}>
                        <Button variant="outline" size="sm">Modifica</Button>
                      </Link>
                      {deleteId === q.id ? (
                        <div className="flex gap-1">
                          <Button variant="destructive" size="sm" onClick={() => handleDelete(q.id)}>
                            Conferma
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => { setDeleteId(null); setDeleteError(null); }}>
                            Annulla
                          </Button>
                        </div>
                      ) : (
                        <Button variant="destructive" size="sm" onClick={() => setDeleteId(q.id)}>
                          Elimina
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {deleteError && (
              <p className="mt-3 text-sm text-destructive">{deleteError}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
