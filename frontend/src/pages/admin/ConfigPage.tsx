/**
 * Club configuration page.
 *
 * Tabbed form with sections: Info Club, Orari, Prenotazioni, Validazione, Email.
 * All text in Italian.
 */

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useConfig } from '@/hooks/use-admin';
import { useConfigStore } from '@/stores/config-store';
import * as adminApi from '@/services/admin-service';
import type { ClubConfig } from '@/services/admin-service';

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

const TABS = [
  { id: 'info', label: 'Info Club' },
  { id: 'orari', label: 'Orari' },
  { id: 'prenotazioni', label: 'Prenotazioni' },
  { id: 'validazione', label: 'Validazione' },
  { id: 'email', label: 'Email' },
] as const;

type TabId = typeof TABS[number]['id'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ConfigPage() {
  const { data: config, isLoading, error, refetch } = useConfig();
  const { setConfig } = useConfigStore();
  const [activeTab, setActiveTab] = useState<TabId>('info');
  const [form, setForm] = useState<Partial<ClubConfig>>({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  useEffect(() => {
    if (config) {
      setForm(config);
    }
  }, [config]);

  const handleChange = useCallback((field: keyof ClubConfig, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaveMsg(null);
    setSaveErr(null);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveMsg(null);
    setSaveErr(null);

    const result = await adminApi.updateConfig(form);

    if (result.success && result.data) {
      setSaveMsg('Configurazione salvata con successo');
      setConfig(result.data);
      refetch();
    } else {
      setSaveErr(result.error ?? 'Errore durante il salvataggio');
    }

    setSaving(false);
  }, [form, refetch, setConfig]);

  const handleLogoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSaving(true);
    const result = await adminApi.uploadLogo(file);

    if (result.success) {
      setSaveMsg('Logo aggiornato con successo');
      refetch();
    } else {
      setSaveErr(result.error ?? 'Errore durante il caricamento del logo');
    }
    setSaving(false);
  }, [refetch]);

  if (isLoading) {
    return <LoadingSpinner centered />;
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Configurazione Club</h1>

      {/* Tab navigation */}
      <div className="flex gap-1 overflow-x-auto border-b border-border -mx-4 px-4 sm:mx-0 sm:px-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 sm:px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          {activeTab === 'info' && (
            <InfoTab form={form} onChange={handleChange} onLogoUpload={handleLogoUpload} />
          )}
          {activeTab === 'orari' && (
            <OrariTab form={form} onChange={handleChange} />
          )}
          {activeTab === 'prenotazioni' && (
            <PrenotazioniTab form={form} onChange={handleChange} />
          )}
          {activeTab === 'validazione' && (
            <ValidazioneTab form={form} onChange={handleChange} />
          )}
          {activeTab === 'email' && (
            <EmailTab form={form} onChange={handleChange} />
          )}

          {/* Save button and feedback */}
          <div className="flex items-center gap-4 pt-4 border-t border-border">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvataggio...' : 'Salva Configurazione'}
            </Button>
            {saveMsg && <p className="text-sm text-green-600">{saveMsg}</p>}
            {saveErr && <p className="text-sm text-destructive">{saveErr}</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared props
// ---------------------------------------------------------------------------

interface TabProps {
  readonly form: Partial<ClubConfig>;
  readonly onChange: (field: keyof ClubConfig, value: unknown) => void;
}

// ---------------------------------------------------------------------------
// Info tab
// ---------------------------------------------------------------------------

function InfoTab({ form, onChange, onLogoUpload }: TabProps & {
  readonly onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-4">
      <FormField label="Nome Club">
        <Input
          value={form.clubName ?? ''}
          onChange={(e) => onChange('clubName', e.target.value)}
          placeholder="Nome del club"
        />
      </FormField>
      <FormField label="Sito Web">
        <Input
          value={form.clubWebsite ?? ''}
          onChange={(e) => onChange('clubWebsite', e.target.value || null)}
          placeholder="https://..."
        />
      </FormField>
      <FormField label="Codice ICAO">
        <Input
          value={form.icaoCode ?? ''}
          onChange={(e) => onChange('icaoCode', e.target.value.toUpperCase() || null)}
          placeholder="LIRU"
          maxLength={4}
        />
      </FormField>
      <FormField label="Logo Club">
        <div className="flex items-center gap-4">
          {form.hasLogo && (
            <span className="text-sm text-muted-foreground">Logo presente</span>
          )}
          <Input
            type="file"
            accept="image/png,image/jpeg"
            onChange={onLogoUpload}
            className="max-w-xs"
          />
          <span className="text-xs text-muted-foreground">PNG o JPG, max 500KB</span>
        </div>
      </FormField>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Orari tab
// ---------------------------------------------------------------------------

function OrariTab({ form, onChange }: TabProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Prima Ora">
          <Input
            type="time"
            value={form.firstHour ?? '07:00'}
            onChange={(e) => onChange('firstHour', e.target.value)}
          />
        </FormField>
        <FormField label="Ultima Ora">
          <Input
            type="time"
            value={form.lastHour ?? '21:00'}
            onChange={(e) => onChange('lastHour', e.target.value)}
          />
        </FormField>
      </div>
      <FormField label="Timezone">
        <Input
          value={form.defaultTimezone ?? 'Europe/Rome'}
          onChange={(e) => onChange('defaultTimezone', e.target.value)}
          placeholder="Europe/Rome"
        />
      </FormField>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Durata Slot Predefinita (minuti)">
          <Input
            type="number"
            value={form.defaultSlotDuration ?? 60}
            onChange={(e) => onChange('defaultSlotDuration', Number(e.target.value))}
            min={15}
            max={480}
          />
        </FormField>
        <FormField label="Durata Minima Slot (minuti)">
          <Input
            type="number"
            value={form.minSlotDuration ?? 30}
            onChange={(e) => onChange('minSlotDuration', Number(e.target.value))}
            min={15}
            max={240}
          />
        </FormField>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Prenotazioni tab
// ---------------------------------------------------------------------------

function PrenotazioniTab({ form, onChange }: TabProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Limite Prenotazione Anticipata (settimane)">
          <Input
            type="number"
            value={form.bookDateLimitWeeks ?? 4}
            onChange={(e) => onChange('bookDateLimitWeeks', Number(e.target.value))}
            min={1}
            max={52}
          />
        </FormField>
        <FormField label="Durata Massima Prenotazione (ore, 0 = illimitata)">
          <Input
            type="number"
            value={form.bookDurationLimitHours ?? 0}
            onChange={(e) => onChange('bookDurationLimitHours', Number(e.target.value))}
            min={0}
            max={24}
          />
        </FormField>
      </div>
      <FormField label="Regola Allocazione">
        <select
          value={form.bookAllocatingRule ?? 'SPECIFIC'}
          onChange={(e) => onChange('bookAllocatingRule', e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
        >
          <option value="SPECIFIC">Specifico</option>
          <option value="BY_TYPE">Per Tipo</option>
        </select>
      </FormField>
      <FormField label="Commenti nelle Prenotazioni">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.bookCommentEnabled ?? false}
            onChange={(e) => onChange('bookCommentEnabled', e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          <span className="text-sm">Abilita campo commenti</span>
        </label>
      </FormField>
      <FormField label="Durata Minima Volo con Istruttore (minuti, 0 = nessun minimo)">
        <Input
          type="number"
          value={form.bookInstructionMinMinutes ?? 0}
          onChange={(e) => onChange('bookInstructionMinMinutes', Number(e.target.value))}
          min={0}
          max={480}
        />
      </FormField>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Validazione tab
// ---------------------------------------------------------------------------

function ValidazioneTab({ form, onChange }: TabProps) {
  return (
    <div className="space-y-4">
      <FormField label="Modalita Qualifiche">
        <select
          value={form.qualificationMode ?? 'OFF'}
          onChange={(e) => onChange('qualificationMode', e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
        >
          <option value="OFF">Disattivato</option>
          <option value="WARNING">Avviso</option>
          <option value="RESTRICTED">Restrittivo</option>
        </select>
      </FormField>
      <FormField label="Modalita Abbonamento">
        <select
          value={form.subscriptionMode ?? 'OFF'}
          onChange={(e) => onChange('subscriptionMode', e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
        >
          <option value="OFF">Disattivato</option>
          <option value="WARNING">Avviso</option>
          <option value="RESTRICTED">Restrittivo</option>
        </select>
      </FormField>
      <FormField label="Modalita Registrazione">
        <select
          value={form.registrationMode ?? 'INVITE'}
          onChange={(e) => onChange('registrationMode', e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
        >
          <option value="OPEN">Aperta</option>
          <option value="INVITE">Su Invito</option>
          <option value="DISABLED">Disabilitata</option>
        </select>
      </FormField>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Email tab
// ---------------------------------------------------------------------------

function EmailTab({ form, onChange }: TabProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Configura il server SMTP per l&apos;invio delle email (reset password, notifiche, ecc.)
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Server SMTP">
          <Input
            value={form.smtpHost ?? ''}
            onChange={(e) => onChange('smtpHost', e.target.value || null)}
            placeholder="smtp.gmail.com"
          />
        </FormField>
        <FormField label="Porta SMTP">
          <Input
            type="number"
            value={form.smtpPort ?? ''}
            onChange={(e) => onChange('smtpPort', e.target.value ? Number(e.target.value) : null)}
            placeholder="587"
          />
        </FormField>
        <FormField label="Utente SMTP">
          <Input
            value={form.smtpUser ?? ''}
            onChange={(e) => onChange('smtpUser', e.target.value || null)}
            placeholder="user@gmail.com"
          />
        </FormField>
        <FormField label="Password SMTP">
          <Input
            type="password"
            value={form.smtpPass ?? ''}
            onChange={(e) => onChange('smtpPass', e.target.value || null)}
            placeholder="••••••••"
          />
        </FormField>
      </div>
      <FormField label="Indirizzo Mittente Email">
        <Input
          type="email"
          value={form.mailFromAddress ?? ''}
          onChange={(e) => onChange('mailFromAddress', e.target.value || null)}
          placeholder="noreply@aeroclub.it"
        />
      </FormField>
      <FormField label="Messaggio Informativo">
        <textarea
          value={form.infoMessage ?? ''}
          onChange={(e) => onChange('infoMessage', e.target.value || null)}
          placeholder="Messaggio visualizzato nella homepage..."
          rows={4}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </FormField>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FormField wrapper
// ---------------------------------------------------------------------------

function FormField({ label, children }: {
  readonly label: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}
