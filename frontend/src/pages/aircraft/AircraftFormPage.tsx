/**
 * Aircraft create / edit form page.
 *
 * When an `id` param is present the form loads the existing aircraft
 * and operates in edit mode; otherwise it creates a new one.
 * All text is in Italian.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAircraftDetail } from '@/hooks/use-aircraft';
import { createAircraft, updateAircraft } from '@/services/aircraft-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// ---------------------------------------------------------------------------
// Form state
// ---------------------------------------------------------------------------

interface FormFields {
  readonly callsign: string;
  readonly type: string;
  readonly seats: string;
  readonly hourlyRate: string;
  readonly comments: string;
  readonly displayOrder: string;
}

const EMPTY_FORM: FormFields = {
  callsign: '',
  type: '',
  seats: '',
  hourlyRate: '',
  comments: '',
  displayOrder: '0',
};

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function AircraftFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = id !== undefined;

  const {
    data: existing,
    isLoading: isLoadingDetail,
    error: loadError,
  } = isEdit
    ? useAircraftDetail(id)
    : { data: null, isLoading: false, error: null };

  const [form, setForm] = useState<FormFields>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Populate form when existing aircraft is loaded
  useEffect(() => {
    if (existing) {
      setForm({
        callsign: existing.callsign,
        type: existing.type,
        seats: String(existing.seats),
        hourlyRate: existing.hourlyRate ? String(existing.hourlyRate) : '',
        comments: existing.comments ?? '',
        displayOrder: String(existing.displayOrder),
      });
    }
  }, [existing]);

  // -------------------------------------------------------------------------
  // Field change handler (immutable)
  // -------------------------------------------------------------------------

  const handleChange = (field: keyof FormFields, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

  const validate = (): string | null => {
    if (!form.callsign.trim()) {
      return 'Immatricolazione obbligatoria';
    }
    if (!form.type.trim()) {
      return 'Tipo aeromobile obbligatorio';
    }
    const seats = Number(form.seats);
    if (!Number.isInteger(seats) || seats < 1) {
      return 'Inserire un numero intero di posti (minimo 1)';
    }
    if (form.hourlyRate && Number(form.hourlyRate) < 0) {
      return 'Il costo orario non puo essere negativo';
    }
    return null;
  };

  // -------------------------------------------------------------------------
  // Submit
  // -------------------------------------------------------------------------

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validate();
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const payload = {
      callsign: form.callsign.trim(),
      type: form.type.trim(),
      seats: Number(form.seats),
      hourlyRate: form.hourlyRate ? Number(form.hourlyRate) : undefined,
      comments: form.comments.trim() || undefined,
      displayOrder: Number(form.displayOrder),
    };

    const result = isEdit
      ? await updateAircraft(id!, payload)
      : await createAircraft(payload);

    setSubmitting(false);

    if (result.success && result.data) {
      navigate(`/aeromobili/${result.data.id}`);
    } else {
      setSubmitError(result.error ?? 'Errore durante il salvataggio');
    }
  };

  // -------------------------------------------------------------------------
  // Loading / error states
  // -------------------------------------------------------------------------

  if (isEdit && isLoadingDetail) {
    return <LoadingSpinner centered size="lg" />;
  }

  if (isEdit && loadError) {
    return (
      <div className="p-4 sm:p-6">
        <p className="text-destructive">{loadError}</p>
        <Link to="/aeromobili" className="mt-4 inline-block text-sm text-primary underline">
          Torna alla flotta
        </Link>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Link to="/aeromobili" className="text-sm text-muted-foreground hover:underline">
            Flotta
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-xl sm:text-2xl font-bold">
            {isEdit ? 'Modifica Aeromobile' : 'Nuovo Aeromobile'}
          </h1>
        </div>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>
            {isEdit ? 'Modifica dati aeromobile' : 'Inserisci i dati del nuovo aeromobile'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Callsign */}
            <div>
              <label htmlFor="callsign" className="mb-1 block text-sm font-medium">
                Immatricolazione *
              </label>
              <Input
                id="callsign"
                value={form.callsign}
                onChange={(e) => handleChange('callsign', e.target.value)}
                placeholder="es. I-ABCD"
                maxLength={10}
                required
              />
            </div>

            {/* Type */}
            <div>
              <label htmlFor="type" className="mb-1 block text-sm font-medium">
                Tipo *
              </label>
              <Input
                id="type"
                value={form.type}
                onChange={(e) => handleChange('type', e.target.value)}
                placeholder="es. C172, PA28"
                maxLength={20}
                required
              />
            </div>

            {/* Seats */}
            <div>
              <label htmlFor="seats" className="mb-1 block text-sm font-medium">
                Posti *
              </label>
              <Input
                id="seats"
                type="number"
                value={form.seats}
                onChange={(e) => handleChange('seats', e.target.value)}
                min={1}
                step={1}
                required
              />
            </div>

            {/* Hourly Rate */}
            <div>
              <label htmlFor="hourlyRate" className="mb-1 block text-sm font-medium">
                Costo Orario (EUR)
              </label>
              <Input
                id="hourlyRate"
                type="number"
                value={form.hourlyRate}
                onChange={(e) => handleChange('hourlyRate', e.target.value)}
                min={0}
                step={0.01}
                placeholder="es. 150.00"
              />
            </div>

            {/* Display Order */}
            <div>
              <label htmlFor="displayOrder" className="mb-1 block text-sm font-medium">
                Ordine Visualizzazione
              </label>
              <Input
                id="displayOrder"
                type="number"
                value={form.displayOrder}
                onChange={(e) => handleChange('displayOrder', e.target.value)}
                min={0}
                step={1}
              />
            </div>

            {/* Comments */}
            <div>
              <label htmlFor="comments" className="mb-1 block text-sm font-medium">
                Note
              </label>
              <textarea
                id="comments"
                value={form.comments}
                onChange={(e) => handleChange('comments', e.target.value)}
                maxLength={500}
                rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Note visibili in tooltip sul calendario"
              />
            </div>

            {/* Error */}
            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Salvataggio...' : isEdit ? 'Salva Modifiche' : 'Crea Aeromobile'}
              </Button>
              <Link to={isEdit ? `/aeromobili/${id}` : '/aeromobili'}>
                <Button type="button" variant="outline">
                  Annulla
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
