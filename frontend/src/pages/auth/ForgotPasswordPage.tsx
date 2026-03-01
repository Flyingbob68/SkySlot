import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import * as authApi from '@/services/auth-service';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Inserisci il tuo indirizzo email.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await authApi.forgotPassword(email.trim());

      if (result.success) {
        setIsSubmitted(true);
      } else {
        setError(result.error ?? 'Si e\' verificato un errore. Riprova.');
      }
    } catch {
      setError('Errore di rete. Riprova.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Controlla la tua email</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Se l'indirizzo <strong>{email}</strong> e' registrato, riceverai
          un'email con le istruzioni per reimpostare la password.
        </p>
        <Link
          to="/login"
          className="mt-6 inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Torna al login
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold">Password dimenticata</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Inserisci il tuo indirizzo email e ti invieremo le istruzioni per
        reimpostare la password.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {error && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <Input
            id="email"
            type="email"
            placeholder="nome@esempio.it"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Invio in corso...' : 'Invia istruzioni'}
        </Button>
      </form>

      <p className="mt-6 text-center">
        <Link
          to="/login"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Torna al login
        </Link>
      </p>
    </div>
  );
}
