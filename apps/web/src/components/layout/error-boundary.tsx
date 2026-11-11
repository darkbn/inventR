import { AlertOctagon, RefreshCw } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Dernier filet de sécurité de l'interface.
 *
 * Sans limite d'erreur, React démonte silencieusement tout l'arbre à la
 * première exception de rendu : l'utilisateur voit une page blanche, sans le
 * moindre indice. Mieux vaut un message explicite et un moyen de repartir.
 *
 * Doit rester un composant de classe : React n'expose pas encore d'équivalent
 * sous forme de hook.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // La console reste la trace exploitable en développement ; en production,
    // c'est ici qu'un collecteur d'erreurs serait branché.
    console.error('Erreur de rendu non interceptée', error, info.componentStack);
  }

  private readonly handleReset = (): void => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    const { error } = this.state;

    if (!error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <div className="w-full max-w-lg space-y-4 rounded-lg border bg-card p-8 text-center">
          <AlertOctagon className="mx-auto h-10 w-10 text-destructive" aria-hidden />

          <div className="space-y-1">
            <h1 className="text-xl font-semibold">L’application a rencontré une erreur</h1>
            <p className="text-sm text-muted-foreground">
              Aucune donnée n’a été perdue. Rechargez la page ; si le problème persiste, signalez le
              message ci-dessous à votre administrateur.
            </p>
          </div>

          <pre className="max-h-40 overflow-auto rounded-md bg-muted p-3 text-left text-xs">
            {error.message}
          </pre>

          <div className="flex justify-center gap-2">
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4" aria-hidden />
              Recharger la page
            </Button>
            <Button variant="outline" onClick={this.handleReset}>
              Réessayer
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
