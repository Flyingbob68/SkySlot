/**
 * Exception editor for instructor availability.
 *
 * Provides a form to add new exceptions and a list of existing
 * exceptions with edit/delete capabilities.
 *
 * All text is in Italian.
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type {
  AvailabilityException,
  CreateExceptionInput,
  UpdateExceptionInput,
} from '@/types/instructor';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExceptionEditorProps {
  readonly exceptions: readonly AvailabilityException[];
  readonly onCreate: (data: CreateExceptionInput) => Promise<boolean>;
  readonly onUpdate: (id: string, data: UpdateExceptionInput) => Promise<boolean>;
  readonly onDelete: (id: string) => Promise<boolean>;
  readonly mutating: boolean;
  readonly error: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toLocalDateTimeValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface ExceptionFormState {
  readonly startDate: string;
  readonly endDate: string;
  readonly isPresent: boolean;
}

const EMPTY_FORM: ExceptionFormState = {
  startDate: '',
  endDate: '',
  isPresent: false,
};

function ExceptionForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel,
  disabled,
}: {
  readonly initial: ExceptionFormState;
  readonly onSubmit: (data: ExceptionFormState) => void;
  readonly onCancel?: () => void;
  readonly submitLabel: string;
  readonly disabled: boolean;
}) {
  const [form, setForm] = useState<ExceptionFormState>(initial);

  const handleChange = useCallback(
    (field: keyof ExceptionFormState, value: string | boolean) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.startDate || !form.endDate) return;
      onSubmit(form);
    },
    [form, onSubmit],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Data/ora inizio
          </label>
          <Input
            type="datetime-local"
            value={form.startDate}
            onChange={(e) => handleChange('startDate', e.target.value)}
            required
            disabled={disabled}
            step="900"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Data/ora fine
          </label>
          <Input
            type="datetime-local"
            value={form.endDate}
            onChange={(e) => handleChange('endDate', e.target.value)}
            required
            disabled={disabled}
            step="900"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">Tipo:</label>
        <button
          type="button"
          className={[
            'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
            !form.isPresent
              ? 'bg-red-100 text-red-700 ring-2 ring-red-400'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
          ].join(' ')}
          onClick={() => handleChange('isPresent', false)}
          disabled={disabled}
        >
          Assente
        </button>
        <button
          type="button"
          className={[
            'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
            form.isPresent
              ? 'bg-green-100 text-green-700 ring-2 ring-green-400'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
          ].join(' ')}
          onClick={() => handleChange('isPresent', true)}
          disabled={disabled}
        >
          Presente
        </button>
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={disabled || !form.startDate || !form.endDate}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={disabled}>
            Annulla
          </Button>
        )}
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ExceptionEditor({
  exceptions,
  onCreate,
  onUpdate,
  onDelete,
  mutating,
  error,
}: ExceptionEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleCreate = useCallback(
    async (form: ExceptionFormState) => {
      const data: CreateExceptionInput = {
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        isPresent: form.isPresent,
      };
      await onCreate(data);
    },
    [onCreate],
  );

  const handleUpdate = useCallback(
    async (form: ExceptionFormState) => {
      if (!editingId) return;
      const data: UpdateExceptionInput = {
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        isPresent: form.isPresent,
      };
      const success = await onUpdate(editingId, data);
      if (success) {
        setEditingId(null);
      }
    },
    [editingId, onUpdate],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm('Sei sicuro di voler eliminare questa eccezione?')) {
        return;
      }
      await onDelete(id);
    },
    [onDelete],
  );

  return (
    <div className="space-y-4">
      {/* Create form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Nuova Eccezione</CardTitle>
        </CardHeader>
        <CardContent>
          <ExceptionForm
            initial={EMPTY_FORM}
            onSubmit={handleCreate}
            submitLabel="Aggiungi"
            disabled={mutating}
          />
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Existing exceptions */}
      {exceptions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nessuna eccezione configurata.
        </p>
      ) : (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Eccezioni Esistenti</h4>
          {exceptions.map((exc) => (
            <Card key={exc.id}>
              <CardContent className="py-3">
                {editingId === exc.id ? (
                  <ExceptionForm
                    initial={{
                      startDate: toLocalDateTimeValue(exc.startDate),
                      endDate: toLocalDateTimeValue(exc.endDate),
                      isPresent: exc.isPresent,
                    }}
                    onSubmit={handleUpdate}
                    onCancel={() => setEditingId(null)}
                    submitLabel="Aggiorna"
                    disabled={mutating}
                  />
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge
                        className={
                          exc.isPresent
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }
                      >
                        {exc.isPresent ? 'Presente' : 'Assente'}
                      </Badge>
                      <span className="text-sm">
                        {formatDateTime(exc.startDate)} - {formatDateTime(exc.endDate)}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingId(exc.id)}
                        disabled={mutating}
                      >
                        Modifica
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(exc.id)}
                        disabled={mutating}
                      >
                        Elimina
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
