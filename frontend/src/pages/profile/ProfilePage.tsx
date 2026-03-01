import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useMember } from '@/hooks/use-members';
import { updateMember } from '@/services/member-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface ProfileForm {
  readonly firstName: string;
  readonly lastName: string;
  readonly fiscalCode: string;
  readonly dateOfBirth: string;
  readonly address: string;
  readonly zipCode: string;
  readonly city: string;
  readonly state: string;
  readonly country: string;
  readonly homePhone: string;
  readonly workPhone: string;
  readonly cellPhone: string;
}

const EMPTY_FORM: ProfileForm = {
  firstName: '',
  lastName: '',
  fiscalCode: '',
  dateOfBirth: '',
  address: '',
  zipCode: '',
  city: '',
  state: '',
  country: 'IT',
  homePhone: '',
  workPhone: '',
  cellPhone: '',
};

function FormField({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuthStore();
  const { data: member, isLoading, error, refetch } = useMember(user?.id);

  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (member) {
      setForm({
        firstName: member.firstName,
        lastName: member.lastName,
        fiscalCode: member.fiscalCode ?? '',
        dateOfBirth: member.dateOfBirth
          ? member.dateOfBirth.slice(0, 10)
          : '',
        address: member.address ?? '',
        zipCode: member.zipCode ?? '',
        city: member.city ?? '',
        state: member.state ?? '',
        country: member.country ?? 'IT',
        homePhone: member.homePhone ?? '',
        workPhone: member.workPhone ?? '',
        cellPhone: member.cellPhone ?? '',
      });
    }
  }, [member]);

  const updateField = (field: keyof ProfileForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) return;

    setSaveError(null);
    setSaveSuccess(false);
    setSubmitting(true);

    const data: Record<string, unknown> = {
      firstName: form.firstName,
      lastName: form.lastName,
      fiscalCode: form.fiscalCode || null,
      dateOfBirth: form.dateOfBirth || null,
      address: form.address || null,
      zipCode: form.zipCode || null,
      city: form.city || null,
      state: form.state || null,
      country: form.country || null,
      homePhone: form.homePhone || null,
      workPhone: form.workPhone || null,
      cellPhone: form.cellPhone || null,
    };

    const result = await updateMember(user.id, data);
    setSubmitting(false);

    if (result.success) {
      setSaveSuccess(true);
      refetch();
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      setSaveError(result.error ?? 'Errore durante il salvataggio');
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

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Il Mio Profilo</h1>

      {saveError && (
        <div className="rounded-md bg-destructive/10 p-4 text-destructive text-sm">
          {saveError}
        </div>
      )}

      {saveSuccess && (
        <div className="rounded-md bg-emerald-500/10 p-4 text-emerald-700 text-sm">
          Profilo aggiornato con successo
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Dati Personali</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Nome">
                <Input
                  value={form.firstName}
                  onChange={(e) => updateField('firstName', e.target.value)}
                  required
                />
              </FormField>
              <FormField label="Cognome">
                <Input
                  value={form.lastName}
                  onChange={(e) => updateField('lastName', e.target.value)}
                  required
                />
              </FormField>
            </div>
            <FormField label="Codice Fiscale">
              <Input
                value={form.fiscalCode}
                onChange={(e) => updateField('fiscalCode', e.target.value)}
                maxLength={16}
              />
            </FormField>
            <FormField label="Data di Nascita">
              <Input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => updateField('dateOfBirth', e.target.value)}
              />
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contatti</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Cellulare">
              <Input
                type="tel"
                value={form.cellPhone}
                onChange={(e) => updateField('cellPhone', e.target.value)}
              />
            </FormField>
            <FormField label="Telefono Casa">
              <Input
                type="tel"
                value={form.homePhone}
                onChange={(e) => updateField('homePhone', e.target.value)}
              />
            </FormField>
            <FormField label="Telefono Lavoro">
              <Input
                type="tel"
                value={form.workPhone}
                onChange={(e) => updateField('workPhone', e.target.value)}
              />
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Indirizzo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Indirizzo">
              <Input
                value={form.address}
                onChange={(e) => updateField('address', e.target.value)}
              />
            </FormField>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="CAP">
                <Input
                  value={form.zipCode}
                  onChange={(e) => updateField('zipCode', e.target.value)}
                />
              </FormField>
              <FormField label="Città">
                <Input
                  value={form.city}
                  onChange={(e) => updateField('city', e.target.value)}
                />
              </FormField>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Provincia">
                <Input
                  value={form.state}
                  onChange={(e) => updateField('state', e.target.value)}
                />
              </FormField>
              <FormField label="Nazione">
                <Input
                  value={form.country}
                  onChange={(e) => updateField('country', e.target.value)}
                  maxLength={2}
                />
              </FormField>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Salvataggio...' : 'Salva Modifiche'}
          </Button>
        </div>
      </form>
    </div>
  );
}
