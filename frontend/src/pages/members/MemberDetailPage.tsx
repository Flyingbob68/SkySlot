import { useParams, useNavigate } from 'react-router-dom';
import { useState, useCallback } from 'react';
import { CheckCircle, Ban, CalendarDays } from 'lucide-react';
import { useMember } from '@/hooks/use-members';
import { deactivateMember, updateMember } from '@/services/member-service';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

function hasPermission(permissions: readonly string[], perm: string): boolean {
  return permissions.includes(perm);
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('it-IT');
}

function InfoRow({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string | null | undefined;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center py-2 border-b border-border/30 last:border-0">
      <span className="text-sm font-medium text-muted-foreground sm:w-40 shrink-0">
        {label}
      </span>
      <span className="text-sm">{value ?? '-'}</span>
    </div>
  );
}

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const permissions = user?.permissions ?? [];
  const canManage = hasPermission(permissions, 'member:manage');
  const isOwn = user?.id === id;

  const canEditSubscription = hasPermission(permissions, 'finance:association') || canManage;
  const canEditFlights = hasPermission(permissions, 'finance:flights');

  const { data: member, isLoading, error, refetch } = useMember(id);
  const [deactivating, setDeactivating] = useState(false);
  const [savingFinance, setSavingFinance] = useState(false);
  const [editingExpiry, setEditingExpiry] = useState(false);
  const [expiryValue, setExpiryValue] = useState('');

  const handleToggleFlights = useCallback(async (value: boolean) => {
    if (!id) return;
    setSavingFinance(true);
    const result = await updateMember(id, { flightsPaid: value });
    setSavingFinance(false);
    if (result.success) {
      refetch();
    }
  }, [id, refetch]);

  const handleSaveExpiry = useCallback(async () => {
    if (!id) return;
    setSavingFinance(true);
    const result = await updateMember(id, {
      subscriptionExpiry: expiryValue || null,
    });
    setSavingFinance(false);
    if (result.success) {
      setEditingExpiry(false);
      refetch();
    }
  }, [id, expiryValue, refetch]);

  const handleDeactivate = async () => {
    if (!id || !confirm('Sei sicuro di voler disattivare questo socio?')) return;

    setDeactivating(true);
    const result = await deactivateMember(id);
    setDeactivating(false);

    if (result.success) {
      refetch();
    }
  };

  if (isLoading) return <LoadingSpinner centered />;

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <p className="text-destructive">Errore: {error}</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="p-4 sm:p-6">
        <p className="text-muted-foreground">Socio non trovato</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar firstName={member.firstName} lastName={member.lastName} size="lg" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">
              {member.firstName} {member.lastName}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {member.memberRoles.map((mr) => (
                <Badge key={mr.role.id} variant="secondary">
                  {mr.role.name}
                </Badge>
              ))}
              {member.active ? (
                <Badge variant="default">Attivo</Badge>
              ) : (
                <Badge variant="destructive">Inattivo</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/soci/elenco')}>
            Indietro
          </Button>
          {(canManage || isOwn) && (
            <Button size="sm" onClick={() => navigate(`/soci/${id}/modifica`)}>
              Modifica
            </Button>
          )}
          {canManage && member.active && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeactivate}
              disabled={deactivating}
            >
              {deactivating ? 'Disattivazione...' : 'Disattiva'}
            </Button>
          )}
        </div>
      </div>

      {/* Personal Info */}
      <Card>
        <CardHeader>
          <CardTitle>Informazioni Personali</CardTitle>
        </CardHeader>
        <CardContent>
          <InfoRow label="Email" value={member.email} />
          <InfoRow label="Codice Fiscale" value={member.fiscalCode} />
          <InfoRow label="Data di Nascita" value={formatDate(member.dateOfBirth)} />
          <InfoRow label="Numero Tessera" value={member.memberNumber} />
          <InfoRow
            label="Scadenza Quota"
            value={formatDate(member.subscriptionExpiry)}
          />
        </CardContent>
      </Card>

      {/* Financial Status */}
      <Card>
        <CardHeader>
          <CardTitle>Stato Finanziario</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center py-2 border-b border-border/30">
            <span className="text-sm font-medium text-muted-foreground sm:w-40 shrink-0">
              Quota Associativa
            </span>
            <div className="flex items-center gap-2">
              {member.subscriptionExpiry ? (
                new Date(member.subscriptionExpiry) >= new Date() ? (
                  <span className="inline-flex items-center gap-1 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" /> Valida fino al {formatDate(member.subscriptionExpiry)}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-sm text-red-600">
                    <Ban className="h-4 w-4" /> Scaduta il {formatDate(member.subscriptionExpiry)}
                  </span>
                )
              ) : (
                <span className="text-sm text-muted-foreground">Non impostata</span>
              )}
              {canEditSubscription && !editingExpiry && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={savingFinance}
                  onClick={() => {
                    setExpiryValue(
                      member.subscriptionExpiry
                        ? new Date(member.subscriptionExpiry).toISOString().slice(0, 10)
                        : '',
                    );
                    setEditingExpiry(true);
                  }}
                  className="ml-2 text-xs h-7"
                >
                  <CalendarDays className="h-3.5 w-3.5 mr-1" />
                  Modifica
                </Button>
              )}
            </div>
          </div>
          {editingExpiry && (
            <div className="flex items-center gap-2 py-2 border-b border-border/30">
              <Input
                type="date"
                value={expiryValue}
                onChange={(e) => setExpiryValue(e.target.value)}
                className="w-44 h-8 text-sm"
              />
              <Button
                size="sm"
                disabled={savingFinance}
                onClick={handleSaveExpiry}
                className="text-xs h-7"
              >
                Salva
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingExpiry(false)}
                className="text-xs h-7"
              >
                Annulla
              </Button>
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center py-2">
            <span className="text-sm font-medium text-muted-foreground sm:w-40 shrink-0">
              Pagamento Voli
            </span>
            <div className="flex items-center gap-2">
              {member.flightsPaid ? (
                <span className="inline-flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" /> In regola
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-sm text-red-600">
                  <Ban className="h-4 w-4" /> Non in regola
                </span>
              )}
              {canEditFlights && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={savingFinance}
                  onClick={() => handleToggleFlights(!member.flightsPaid)}
                  className="ml-2 text-xs h-7"
                >
                  {member.flightsPaid ? 'Segna non in regola' : 'Segna in regola'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader>
          <CardTitle>Contatti</CardTitle>
        </CardHeader>
        <CardContent>
          <InfoRow label="Cellulare" value={member.cellPhone} />
          <InfoRow label="Telefono Casa" value={member.homePhone} />
          <InfoRow label="Telefono Lavoro" value={member.workPhone} />
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader>
          <CardTitle>Indirizzo</CardTitle>
        </CardHeader>
        <CardContent>
          <InfoRow label="Indirizzo" value={member.address} />
          <InfoRow label="CAP" value={member.zipCode} />
          <InfoRow label="Città" value={member.city} />
          <InfoRow label="Provincia" value={member.state} />
          <InfoRow label="Nazione" value={member.country} />
        </CardContent>
      </Card>

      {/* Qualifications */}
      {member.qualifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Qualifiche</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {member.qualifications.map((q) => (
                <div
                  key={q.id}
                  className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
                >
                  <span className="text-sm font-medium">
                    {q.qualification.name}
                  </span>
                  {q.qualification.hasExpiry && (
                    <span className="text-sm text-muted-foreground">
                      Scadenza: {formatDate(q.expiryDate)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Club Info */}
      <Card>
        <CardHeader>
          <CardTitle>Informazioni Club</CardTitle>
        </CardHeader>
        <CardContent>
          <InfoRow label="Iscritto dal" value={formatDate(member.createdAt)} />
          <InfoRow label="Ultimo aggiornamento" value={formatDate(member.updatedAt)} />
          <InfoRow label="Email verificata" value={member.emailVerified ? 'Sì' : 'No'} />
          <InfoRow label="Lingua" value={member.language.toUpperCase()} />
          <InfoRow label="Fuso orario" value={member.timezone} />
        </CardContent>
      </Card>
    </div>
  );
}
