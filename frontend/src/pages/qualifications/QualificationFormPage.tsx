/**
 * Create / Edit qualification form page.
 *
 * Shows a form with name, hasExpiry toggle, and description fields.
 * In edit mode, fetches the existing qualification by ID from the URL.
 * All text is in Italian.
 */

import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as qualificationService from '@/services/qualification-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// ---------------------------------------------------------------------------
// Form state
// ---------------------------------------------------------------------------

interface FormValues {
  readonly name: string;
  readonly hasExpiry: boolean;
  readonly description: string;
}

const INITIAL_VALUES: FormValues = {
  name: '',
  hasExpiry: true,
  description: '',
};

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function QualificationFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing qualification in edit mode
  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    async function load() {
      const result = await qualificationService.getQualifications();

      if (cancelled) return;

      if (result.success && result.data) {
        const found = result.data.find((q) => q.id === id);
        if (found) {
          setValues({
            name: found.name,
            hasExpiry: found.hasExpiry,
            description: found.description ?? '',
          });
        } else {
          setError('Qualifica non trovata');
        }
      } else {
        setError(result.error ?? 'Errore nel caricamento');
      }

      setIsLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleChange = useCallback(
    (field: keyof FormValues, value: string | boolean) => {
      setValues((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setIsSaving(true);

      const payload = {
        name: values.name.trim(),
        hasExpiry: values.hasExpiry,
        description: values.description.trim() || undefined,
      };

      const result = isEdit && id
        ? await qualificationService.updateQualification(id, payload)
        : await qualificationService.createQualification(payload);

      setIsSaving(false);

      if (result.success) {
        navigate('/qualifiche');
      } else {
        setError(result.error ?? 'Errore durante il salvataggio');
      }
    },
    [values, isEdit, id, navigate],
  );

  if (isLoading) {
    return <LoadingSpinner centered size="lg" />;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">
          {isEdit ? 'Modifica Qualifica' : 'Nuova Qualifica'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isEdit
            ? 'Aggiorna i dati della qualifica'
            : 'Crea una nuova definizione di qualifica'}
        </p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>
            {isEdit ? 'Modifica Qualifica' : 'Nuova Qualifica'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="mb-1 block text-sm font-medium"
              >
                Nome *
              </label>
              <Input
                id="name"
                value={values.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="es. PPL, CPL, SEP, IR"
                required
                maxLength={100}
              />
            </div>

            <div className="flex items-center gap-3">
              <label
                htmlFor="hasExpiry"
                className="text-sm font-medium"
              >
                Ha Scadenza
              </label>
              <button
                id="hasExpiry"
                type="button"
                role="switch"
                aria-checked={values.hasExpiry}
                onClick={() => handleChange('hasExpiry', !values.hasExpiry)}
                className={`
                  relative inline-flex h-6 w-11 shrink-0 cursor-pointer
                  rounded-full border-2 border-transparent transition-colors
                  focus-visible:outline-none focus-visible:ring-2
                  focus-visible:ring-ring focus-visible:ring-offset-2
                  ${values.hasExpiry ? 'bg-primary' : 'bg-muted'}
                `}
              >
                <span
                  className={`
                    pointer-events-none inline-block h-5 w-5 rounded-full
                    bg-white shadow-lg transition-transform
                    ${values.hasExpiry ? 'translate-x-5' : 'translate-x-0'}
                  `}
                />
              </button>
              <span className="text-sm text-muted-foreground">
                {values.hasExpiry ? 'Si' : 'No'}
              </span>
            </div>

            <div>
              <label
                htmlFor="description"
                className="mb-1 block text-sm font-medium"
              >
                Descrizione
              </label>
              <textarea
                id="description"
                value={values.description}
                onChange={(e) =>
                  handleChange('description', e.target.value)
                }
                placeholder="Descrizione opzionale della qualifica"
                maxLength={500}
                rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={isSaving || !values.name.trim()}>
                {isSaving
                  ? 'Salvataggio...'
                  : isEdit
                    ? 'Salva Modifiche'
                    : 'Crea Qualifica'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/qualifiche')}
              >
                Annulla
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
