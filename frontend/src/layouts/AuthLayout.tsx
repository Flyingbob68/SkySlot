import { Outlet } from 'react-router-dom';
import { Plane } from 'lucide-react';

export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-primary">
            <Plane className="h-8 w-8" />
            <h1 className="text-3xl font-bold tracking-tight">SkySlot</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Gestione Aeroclub
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
