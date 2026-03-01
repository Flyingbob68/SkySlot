/**
 * Embeddable notification preferences component.
 *
 * Displays a toggle switch for enabling/disabling email notifications
 * along with an explanation of what notifications are covered.
 * Designed to be embedded in a profile or preferences page.
 */

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { cn } from '@/lib/utils';
import * as notificationService from '@/services/notification-service';

// ---------------------------------------------------------------------------
// Toggle switch (self-contained, no external dependency)
// ---------------------------------------------------------------------------

interface ToggleSwitchProps {
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly disabled?: boolean;
  readonly label: string;
}

function ToggleSwitch({ checked, onChange, disabled, label }: ToggleSwitchProps) {
  const handleClick = useCallback(() => {
    if (!disabled) {
      onChange(!checked);
    }
  }, [checked, disabled, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!disabled) {
          onChange(!checked);
        }
      }
    },
    [checked, disabled, onChange],
  );

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
        'transition-colors duration-200 ease-in-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-primary' : 'bg-muted',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0',
          'transition-transform duration-200 ease-in-out',
          checked ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Notification list items
// ---------------------------------------------------------------------------

const NOTIFICATION_TYPES = [
  'Conferma prenotazione creata',
  'Prenotazione modificata o cancellata',
  'Spostamento aeromobile (allocatore)',
  'Qualifica in scadenza',
  'Quota associativa in scadenza',
] as const;

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function NotificationPreferences() {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const result = await notificationService.getPreferences();

      if (cancelled) return;

      if (result.success && result.data) {
        setEnabled(result.data.notificationEnabled);
      } else {
        setError(result.error ?? 'Errore nel caricamento delle preferenze.');
      }

      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggle = useCallback(async (newValue: boolean) => {
    setSaving(true);
    setError(null);

    const result = await notificationService.updatePreferences({
      notificationEnabled: newValue,
    });

    if (result.success && result.data) {
      setEnabled(result.data.notificationEnabled);
    } else {
      setError(result.error ?? 'Errore nel salvataggio delle preferenze.');
    }

    setSaving(false);
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <LoadingSpinner size="sm" centered />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifiche email</CardTitle>
        <CardDescription>
          Gestisci le notifiche email relative alle tue prenotazioni e scadenze.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Ricevi notifiche email</p>
            <p className="text-sm text-muted-foreground">
              {enabled ? 'Le notifiche sono attive' : 'Le notifiche sono disattivate'}
            </p>
          </div>
          <ToggleSwitch
            checked={enabled}
            onChange={handleToggle}
            disabled={saving}
            label="Ricevi notifiche email"
          />
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {/* Notification types list */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">
            Quando attive, riceverai email per:
          </p>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {NOTIFICATION_TYPES.map((type) => (
              <li key={type} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
                {type}
              </li>
            ))}
          </ul>
        </div>

        {/* Security notice */}
        <div className="rounded-lg border border-border bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">
            Le notifiche di sicurezza (reset password, verifica email) vengono sempre
            inviate indipendentemente da questa impostazione.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
