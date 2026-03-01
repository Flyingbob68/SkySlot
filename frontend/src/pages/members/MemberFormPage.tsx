import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMember } from '@/hooks/use-members';
import { createMember, updateMember } from '@/services/member-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface FormData {
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly password: string;
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
  readonly memberNumber: string;
  readonly subscriptionExpiry: string;
}

const EMPTY_FORM: FormData = {
  email: '',
  firstName: '',
  lastName: '',
  password: '',
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
  memberNumber: '',
  subscriptionExpiry: '',
};

function FormField({
  label,
  required,
  children,
}: {
  readonly label: string;
  readonly required?: boolean;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

export default function MemberFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = id !== undefined && id !== 'new';

  const { data: existing, isLoading: loadingExisting } = useMember(
    isEditing ? id : undefined,
  );

  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  useEffect(() => {
    if (existing && isEditing) {
      setForm({
        email: existing.email ?? '',
        firstName: existing.firstName,
        lastName: existing.lastName,
        password: '',
        fiscalCode: existing.fiscalCode ?? '',
        dateOfBirth: existing.dateOfBirth
          ? existing.dateOfBirth.slice(0, 10)
          : '',
        address: existing.address ?? '',
        zipCode: existing.zipCode ?? '',
        city: existing.city ?? '',
        state: existing.state ?? '',
        country: existing.country ?? 'IT',
        homePhone: existing.homePhone ?? '',
        workPhone: existing.workPhone ?? '',
        cellPhone: existing.cellPhone ?? '',
        memberNumber: existing.memberNumber ?? '',
        subscriptionExpiry: existing.subscriptionExpiry
          ? existing.subscriptionExpiry.slice(0, 10)
          : '',
      });
    }
  }, [existing, isEditing]);

  const updateField = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (isEditing) {
      const data: Record<string, unknown> = {};
      if (form.email) data.email = form.email;
      if (form.firstName) data.firstName = form.firstName;
      if (form.lastName) data.lastName = form.lastName;
      data.fiscalCode = form.fiscalCode || null;
      data.dateOfBirth = form.dateOfBirth || null;
      data.address = form.address || null;
      data.zipCode = form.zipCode || null;
      data.city = form.city || null;
      data.state = form.state || null;
      data.country = form.country || null;
      data.homePhone = form.homePhone || null;
      data.workPhone = form.workPhone || null;
      data.cellPhone = form.cellPhone || null;
      data.memberNumber = form.memberNumber || null;
      data.subscriptionExpiry = form.subscriptionExpiry || null;

      const result = await updateMember(id!, data);
      setSubmitting(false);

      if (result.success) {
        navigate(`/soci/${id}`);
      } else {
        setError(result.error ?? 'Errore durante il salvataggio');
      }
    } else {
      const result = await createMember({
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        password: form.password || undefined,
        fiscalCode: form.fiscalCode || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        address: form.address || undefined,
        zipCode: form.zipCode || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        country: form.country || undefined,
        homePhone: form.homePhone || undefined,
        workPhone: form.workPhone || undefined,
        cellPhone: form.cellPhone || undefined,
        memberNumber: form.memberNumber || undefined,
        subscriptionExpiry: form.subscriptionExpiry || undefined,
      });
      setSubmitting(false);

      if (result.success && result.data) {
        if (result.data.generatedPassword) {
          setGeneratedPassword(result.data.generatedPassword);
        } else {
          navigate(`/soci/${result.data.member?.id}`);
        }
      } else {
        setError(result.error ?? 'Errore durante la creazione');
      }
    }
  };

  if (isEditing && loadingExisting) return <LoadingSpinner centered />;

  if (generatedPassword) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Socio creato con successo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">
              Il socio <strong>{form.firstName} {form.lastName}</strong> è stato creato.
            </p>
            <div className="rounded-md bg-muted p-4">
              <p className="text-sm font-medium">Password generata:</p>
              <p className="font-mono text-lg mt-1">{generatedPassword}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Comunica questa password al socio. Non sarà più visibile dopo aver chiuso questa pagina.
            </p>
            <Button onClick={() => navigate('/soci/elenco')}>
              Torna alla lista soci
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold">
          {isEditing ? 'Modifica Socio' : 'Nuovo Socio'}
        </h1>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Annulla
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Required fields */}
        <Card>
          <CardHeader>
            <CardTitle>Dati Obbligatori</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Nome" required>
              <Input
                value={form.firstName}
                onChange={(e) => updateField('firstName', e.target.value)}
                required
              />
            </FormField>
            <FormField label="Cognome" required>
              <Input
                value={form.lastName}
                onChange={(e) => updateField('lastName', e.target.value)}
                required
              />
            </FormField>
            <FormField label="Email" required>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                required
              />
            </FormField>
            {!isEditing && (
              <FormField label="Password">
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  placeholder="Lascia vuoto per generare automaticamente"
                />
              </FormField>
            )}
          </CardContent>
        </Card>

        {/* Personal details */}
        <Card>
          <CardHeader>
            <CardTitle>Dati Personali</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
            <FormField label="Numero Tessera">
              <Input
                value={form.memberNumber}
                onChange={(e) => updateField('memberNumber', e.target.value)}
              />
            </FormField>
            <FormField label="Scadenza Quota">
              <Input
                type="date"
                value={form.subscriptionExpiry}
                onChange={(e) => updateField('subscriptionExpiry', e.target.value)}
              />
            </FormField>
          </CardContent>
        </Card>

        {/* Contact */}
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

        {/* Address */}
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

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            type="button"
            onClick={() => navigate(-1)}
          >
            Annulla
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Salvataggio...' : isEditing ? 'Salva Modifiche' : 'Crea Socio'}
          </Button>
        </div>
      </form>
    </div>
  );
}
