/**
 * Instructor detail page.
 *
 * Shows instructor profile info, resolved availability calendar,
 * regular availability editor (for authorized users), and
 * exception management.
 *
 * All text is in Italian.
 */

import { useParams, Link } from 'react-router-dom';
import {
  useInstructor,
  useRegularAvailability,
  useExceptions,
} from '@/hooks/use-instructors';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { AvailabilityEditor } from '@/components/instructors/AvailabilityEditor';
import { AvailabilityCalendar } from '@/components/instructors/AvailabilityCalendar';
import { ExceptionEditor } from '@/components/instructors/ExceptionEditor';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hasPermission(permission: string): boolean {
  const user = useAuthStore.getState().user;
  return user?.permissions.includes(permission) ?? false;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function InstructorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const instructorId = id!;

  const {
    data: instructor,
    error: instructorError,
    isLoading: loadingInstructor,
  } = useInstructor(instructorId);

  const {
    data: regularSlots,
    isLoading: loadingRegular,
    save: saveRegular,
    saving: savingRegular,
    saveError: regularSaveError,
  } = useRegularAvailability(instructorId);

  const {
    data: exceptions,
    isLoading: loadingExceptions,
    create: createException,
    update: updateException,
    remove: removeException,
    mutating: mutatingException,
    mutationError: exceptionError,
  } = useExceptions(instructorId);

  const canManage = hasPermission('instructor:manage_availability');

  // -----------------------------------------------------------------------
  // Loading / error states
  // -----------------------------------------------------------------------

  if (loadingInstructor) {
    return <LoadingSpinner centered size="lg" />;
  }

  if (instructorError || !instructor) {
    return (
      <div className="p-4 sm:p-6">
        <p className="text-destructive">
          {instructorError ?? 'Istruttore non trovato'}
        </p>
        <Link
          to="/istruttori"
          className="mt-4 inline-block text-sm text-primary underline"
        >
          Torna alla lista istruttori
        </Link>
      </div>
    );
  }

  const fullName = `${instructor.member.firstName} ${instructor.member.lastName}`;

  return (
    <div className="p-4 sm:p-6">
      {/* Breadcrumb + Header */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          to="/istruttori"
          className="text-sm text-muted-foreground hover:underline"
        >
          Istruttori
        </Link>
        <span className="text-muted-foreground">/</span>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {instructor.trigram}
          </span>
          <h1 className="text-xl sm:text-2xl font-bold">{fullName}</h1>
          <Badge
            className={
              instructor.member.active
                ? 'bg-green-600 text-white'
                : 'bg-red-600 text-white'
            }
          >
            {instructor.member.active ? 'Attivo' : 'Inattivo'}
          </Badge>
        </div>
      </div>

      {/* Profile info */}
      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Informazioni</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="font-medium">{instructor.member.email}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Telefono</dt>
                <dd className="font-medium">
                  {instructor.member.cellPhone ?? '-'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Sigla</dt>
                <dd className="font-medium">{instructor.trigram}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Registrato il</dt>
                <dd className="font-medium">{formatDate(instructor.createdAt)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Resolved availability calendar */}
      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Disponibilita Calcolata</CardTitle>
          </CardHeader>
          <CardContent>
            <AvailabilityCalendar instructorId={instructorId} />
          </CardContent>
        </Card>
      </div>

      {/* Regular availability editor + Exceptions editor */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weekly schedule editor */}
        <Card>
          <CardHeader>
            <CardTitle>Disponibilita Ricorrente</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRegular ? (
              <LoadingSpinner centered />
            ) : (
              <>
                {regularSaveError && (
                  <p className="mb-3 text-sm text-destructive">{regularSaveError}</p>
                )}
                <AvailabilityEditor
                  slots={regularSlots ?? []}
                  onSave={saveRegular}
                  saving={savingRegular}
                />
                {!canManage && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Non hai i permessi per modificare la disponibilita.
                    Le modifiche non verranno salvate.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Exceptions */}
        <Card>
          <CardHeader>
            <CardTitle>Eccezioni</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingExceptions ? (
              <LoadingSpinner centered />
            ) : (
              <>
                {!canManage && (
                  <p className="mb-3 text-xs text-muted-foreground">
                    Non hai i permessi per gestire le eccezioni.
                  </p>
                )}
                <ExceptionEditor
                  exceptions={exceptions ?? []}
                  onCreate={createException}
                  onUpdate={updateException}
                  onDelete={removeException}
                  mutating={mutatingException}
                  error={exceptionError}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
