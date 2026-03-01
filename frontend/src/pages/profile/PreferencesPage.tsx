import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useMember } from '@/hooks/use-members';
import { updatePreferences } from '@/services/member-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// Privacy bitmask constants
const PRIVACY_PHONE = 1;
const PRIVACY_ADDRESS = 2;
const PRIVACY_EMAIL = 4;

const LANGUAGES = [
  { value: 'it', label: 'Italiano' },
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'es', label: 'Español' },
] as const;

const TIMEZONES = [
  'Europe/Rome',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'UTC',
] as const;

interface PreferencesForm {
  readonly language: string;
  readonly timezone: string;
  readonly notificationEnabled: boolean;
  readonly phoneVisible: boolean;
  readonly addressVisible: boolean;
  readonly emailVisible: boolean;
}

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

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  readonly label: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
      />
      <span className="text-sm">{label}</span>
    </label>
  );
}

function flagsFromBools(phone: boolean, address: boolean, email: boolean): number {
  let flags = 0;
  if (phone) flags |= PRIVACY_PHONE;
  if (address) flags |= PRIVACY_ADDRESS;
  if (email) flags |= PRIVACY_EMAIL;
  return flags;
}

export default function PreferencesPage() {
  const { user } = useAuthStore();
  const { data: member, isLoading, error, refetch } = useMember(user?.id);

  const [form, setForm] = useState<PreferencesForm>({
    language: 'it',
    timezone: 'Europe/Rome',
    notificationEnabled: true,
    phoneVisible: false,
    addressVisible: false,
    emailVisible: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (member) {
      const flags = member.privacyFlags ?? 0;
      setForm({
        language: member.language,
        timezone: member.timezone,
        notificationEnabled: member.notificationEnabled,
        phoneVisible: (flags & PRIVACY_PHONE) !== 0,
        addressVisible: (flags & PRIVACY_ADDRESS) !== 0,
        emailVisible: (flags & PRIVACY_EMAIL) !== 0,
      });
    }
  }, [member]);

  const updateField = <K extends keyof PreferencesForm>(
    field: K,
    value: PreferencesForm[K],
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) return;

    setSaveError(null);
    setSaveSuccess(false);
    setSubmitting(true);

    const privacyFlags = flagsFromBools(
      form.phoneVisible,
      form.addressVisible,
      form.emailVisible,
    );

    const result = await updatePreferences(user.id, {
      language: form.language,
      timezone: form.timezone,
      notificationEnabled: form.notificationEnabled,
      privacyFlags,
    });

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
      <h1 className="text-xl sm:text-2xl font-bold">Preferenze</h1>

      {saveError && (
        <div className="rounded-md bg-destructive/10 p-4 text-destructive text-sm">
          {saveError}
        </div>
      )}

      {saveSuccess && (
        <div className="rounded-md bg-emerald-500/10 p-4 text-emerald-700 text-sm">
          Preferenze aggiornate con successo
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Language & Timezone */}
        <Card>
          <CardHeader>
            <CardTitle>Lingua e Fuso Orario</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Lingua">
              <select
                value={form.language}
                onChange={(e) => updateField('language', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Fuso Orario">
              <select
                value={form.timezone}
                onChange={(e) => updateField('timezone', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </FormField>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Notifiche</CardTitle>
          </CardHeader>
          <CardContent>
            <CheckboxField
              label="Ricevi notifiche via email"
              checked={form.notificationEnabled}
              onChange={(val) => updateField('notificationEnabled', val)}
            />
          </CardContent>
        </Card>

        {/* Privacy */}
        <Card>
          <CardHeader>
            <CardTitle>Privacy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Scegli quali informazioni rendere visibili agli altri soci nell&apos;elenco.
              Gli amministratori possono sempre vedere tutti i dati.
            </p>
            <CheckboxField
              label="Mostra il mio numero di telefono"
              checked={form.phoneVisible}
              onChange={(val) => updateField('phoneVisible', val)}
            />
            <CheckboxField
              label="Mostra il mio indirizzo"
              checked={form.addressVisible}
              onChange={(val) => updateField('addressVisible', val)}
            />
            <CheckboxField
              label="Mostra la mia email"
              checked={form.emailVisible}
              onChange={(val) => updateField('emailVisible', val)}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Salvataggio...' : 'Salva Preferenze'}
          </Button>
        </div>
      </form>
    </div>
  );
}
