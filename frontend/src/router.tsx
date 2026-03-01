import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AppLayout } from '@/layouts/AppLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// Auth pages
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'));

// Dashboard
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));

// Bookings
const CalendarPage = lazy(() => import('@/pages/bookings/CalendarPage'));
const MyBookingsPage = lazy(() => import('@/pages/bookings/MyBookingsPage'));

// Aircraft
const AircraftListPage = lazy(() => import('@/pages/aircraft/AircraftListPage'));
const AircraftDetailPage = lazy(() => import('@/pages/aircraft/AircraftDetailPage'));
const AircraftFormPage = lazy(() => import('@/pages/aircraft/AircraftFormPage'));

// Members
const MemberListPage = lazy(() => import('@/pages/members/MemberListPage'));
const MemberDetailPage = lazy(() => import('@/pages/members/MemberDetailPage'));
const MemberFormPage = lazy(() => import('@/pages/members/MemberFormPage'));
const MemberDirectoryPage = lazy(() => import('@/pages/members/MemberDirectoryPage'));

// Qualifications
const QualificationListPage = lazy(() => import('@/pages/qualifications/QualificationListPage'));
const QualificationFormPage = lazy(() => import('@/pages/qualifications/QualificationFormPage'));
const ExpiringReportPage = lazy(() => import('@/pages/qualifications/ExpiringReportPage'));

// Instructors
const InstructorListPage = lazy(() => import('@/pages/instructors/InstructorListPage'));
const InstructorDetailPage = lazy(() => import('@/pages/instructors/InstructorDetailPage'));

// Admin
const ConfigPage = lazy(() => import('@/pages/admin/ConfigPage'));
const RolesPage = lazy(() => import('@/pages/admin/RolesPage'));
const AuditLogPage = lazy(() => import('@/pages/admin/AuditLogPage'));
const StatsPage = lazy(() => import('@/pages/admin/StatsPage'));

// Profile
const ProfilePage = lazy(() => import('@/pages/profile/ProfilePage'));
const PreferencesPage = lazy(() => import('@/pages/profile/PreferencesPage'));

// Misc
const UnauthorizedPage = lazy(() => import('@/pages/UnauthorizedPage'));

function LazyPage({ children }: { readonly children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingSpinner centered />}>
      {children}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  // Auth routes (public)
  {
    element: <AuthLayout />,
    children: [
      {
        path: '/login',
        element: <LazyPage><LoginPage /></LazyPage>,
      },
      {
        path: '/register',
        element: <LazyPage><RegisterPage /></LazyPage>,
      },
      {
        path: '/forgot-password',
        element: <LazyPage><ForgotPasswordPage /></LazyPage>,
      },
      {
        path: '/reset-password',
        element: <LazyPage><ResetPasswordPage /></LazyPage>,
      },
    ],
  },
  // Protected routes
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          // Dashboard
          { path: '/', element: <Navigate to="/dashboard" replace /> },
          { path: '/dashboard', element: <LazyPage><DashboardPage /></LazyPage> },

          // Bookings
          { path: '/prenotazioni', element: <Navigate to="/prenotazioni/calendario" replace /> },
          { path: '/prenotazioni/calendario', element: <LazyPage><CalendarPage /></LazyPage> },
          { path: '/prenotazioni/mie', element: <LazyPage><MyBookingsPage /></LazyPage> },

          // Aircraft
          { path: '/aeromobili', element: <LazyPage><AircraftListPage /></LazyPage> },
          { path: '/aeromobili/nuovo', element: <LazyPage><AircraftFormPage /></LazyPage> },
          { path: '/aeromobili/:id', element: <LazyPage><AircraftDetailPage /></LazyPage> },
          { path: '/aeromobili/:id/modifica', element: <LazyPage><AircraftFormPage /></LazyPage> },

          // Members
          { path: '/soci', element: <Navigate to="/soci/elenco" replace /> },
          { path: '/soci/elenco', element: <LazyPage><MemberListPage /></LazyPage> },
          { path: '/soci/directory', element: <LazyPage><MemberDirectoryPage /></LazyPage> },
          { path: '/soci/nuovo', element: <LazyPage><MemberFormPage /></LazyPage> },
          { path: '/soci/:id', element: <LazyPage><MemberDetailPage /></LazyPage> },
          { path: '/soci/:id/modifica', element: <LazyPage><MemberFormPage /></LazyPage> },

          // Qualifications
          { path: '/qualifiche', element: <LazyPage><QualificationListPage /></LazyPage> },
          { path: '/qualifiche/nuova', element: <LazyPage><QualificationFormPage /></LazyPage> },
          { path: '/qualifiche/scadenze', element: <LazyPage><ExpiringReportPage /></LazyPage> },
          { path: '/qualifiche/:id/modifica', element: <LazyPage><QualificationFormPage /></LazyPage> },

          // Instructors
          { path: '/istruttori', element: <LazyPage><InstructorListPage /></LazyPage> },
          { path: '/istruttori/:id', element: <LazyPage><InstructorDetailPage /></LazyPage> },

          // Admin
          { path: '/admin', element: <Navigate to="/admin/configurazione" replace /> },
          { path: '/admin/configurazione', element: <LazyPage><ConfigPage /></LazyPage> },
          { path: '/admin/ruoli', element: <LazyPage><RolesPage /></LazyPage> },
          { path: '/admin/audit', element: <LazyPage><AuditLogPage /></LazyPage> },
          { path: '/admin/statistiche', element: <LazyPage><StatsPage /></LazyPage> },

          // Profile
          { path: '/profilo', element: <LazyPage><ProfilePage /></LazyPage> },
          { path: '/profilo/preferenze', element: <LazyPage><PreferencesPage /></LazyPage> },

          // Misc
          { path: '/unauthorized', element: <LazyPage><UnauthorizedPage /></LazyPage> },
        ],
      },
    ],
  },
]);
