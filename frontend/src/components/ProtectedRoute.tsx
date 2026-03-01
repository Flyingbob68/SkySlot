import { useEffect, useRef } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { useAuth } from '@/hooks/use-auth';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface ProtectedRouteProps {
  readonly requiredPermissions?: string[];
}

export function ProtectedRoute({ requiredPermissions }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const { initAuth } = useAuth();
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      initAuth();
    }
  }, [initAuth]);

  if (isLoading) {
    return <LoadingSpinner centered size="lg" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPermissions && user) {
    const hasPermissions = requiredPermissions.every((p) =>
      user.permissions.includes(p),
    );
    if (!hasPermissions) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <Outlet />;
}
