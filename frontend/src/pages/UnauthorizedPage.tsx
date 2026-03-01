import { useNavigate } from 'react-router-dom';
import { ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function UnauthorizedPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <ShieldX className="h-16 w-16 text-destructive" />
      <h1 className="mt-4 text-2xl font-bold">Accesso Negato</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        Non hai i permessi necessari per accedere a questa pagina.
        Contatta un amministratore se ritieni che si tratti di un errore.
      </p>
      <Button
        className="mt-6"
        onClick={() => navigate('/dashboard')}
      >
        Torna alla Dashboard
      </Button>
    </div>
  );
}
