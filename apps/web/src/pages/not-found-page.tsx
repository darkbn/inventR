import { Compass } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

export function NotFoundPage() {
  return (
    <EmptyState
      icon={Compass}
      title="Page introuvable"
      description="L’adresse demandée n’existe pas ou n’est plus accessible."
      action={
        <Button asChild>
          <Link to="/">Revenir à l’accueil</Link>
        </Button>
      }
    />
  );
}
