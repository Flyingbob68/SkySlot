/**
 * Instructor list page.
 *
 * Renders a responsive card grid of all instructors showing trigram,
 * full name, and contact info.  Click a card to navigate to the
 * instructor detail page.
 * All text is in Italian.
 */

import { Link } from 'react-router-dom';
import { useInstructors } from '@/hooks/use-instructors';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { Instructor } from '@/types/instructor';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getFullName(instructor: Instructor): string {
  return `${instructor.member.firstName} ${instructor.member.lastName}`;
}

function getStatusBadge(instructor: Instructor) {
  if (!instructor.member.active) {
    return <Badge className="bg-red-600 text-white">Inattivo</Badge>;
  }
  return <Badge className="bg-green-600 text-white">Attivo</Badge>;
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function InstructorListPage() {
  const { data: instructors, error, isLoading } = useInstructors();

  if (isLoading) {
    return <LoadingSpinner centered size="lg" />;
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  const list = instructors ?? [];

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Istruttori</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Elenco degli istruttori del club
        </p>
      </div>

      {list.length === 0 ? (
        <p className="text-muted-foreground">
          Nessun istruttore registrato.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((instructor) => (
            <Link
              key={instructor.id}
              to={`/istruttori/${instructor.id}`}
              className="block"
            >
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                        {instructor.trigram}
                      </span>
                      <CardTitle className="text-lg">
                        {getFullName(instructor)}
                      </CardTitle>
                    </div>
                    {getStatusBadge(instructor)}
                  </div>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Email</dt>
                      <dd className="font-medium truncate max-w-[180px]">
                        {instructor.member.email}
                      </dd>
                    </div>
                    {instructor.member.cellPhone && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Telefono</dt>
                        <dd className="font-medium">
                          {instructor.member.cellPhone}
                        </dd>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Sigla</dt>
                      <dd className="font-medium">{instructor.trigram}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
