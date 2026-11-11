import { render, screen } from '@testing-library/react';
import { MemoryRouter, Link } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { Button } from './button';

describe('Button', () => {
  it('rend un bouton standard', () => {
    render(<Button>Enregistrer</Button>);
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeInTheDocument();
  });

  it('affiche un indicateur et se désactive pendant le chargement', () => {
    render(<Button loading>Enregistrer</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  /**
   * Non-régression : Radix `Slot` lève une exception s'il reçoit plusieurs
   * enfants. Une version antérieure injectait l'emplacement de l'indicateur de
   * chargement même en mode `asChild`, ce qui faisait deux enfants et
   * provoquait une page blanche sur tous les écrans comportant un bouton-lien
   * — dont l'accueil, juste après la connexion.
   */
  it('délègue le rendu à son enfant sans lever d’exception', () => {
    render(
      <MemoryRouter>
        <Button asChild>
          <Link to="/campagnes">
            <span aria-hidden>+</span>
            Nouvelle campagne
          </Link>
        </Button>
      </MemoryRouter>,
    );

    // Le « + » porte aria-hidden : il est exclu du nom accessible, ce qui est
    // bien le comportement recherché pour une icône décorative.
    const link = screen.getByRole('link', { name: 'Nouvelle campagne' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/campagnes');
  });

  it('ne transmet pas l’attribut disabled à une ancre', () => {
    render(
      <MemoryRouter>
        <Button asChild>
          <Link to="/campagnes">Voir</Link>
        </Button>
      </MemoryRouter>,
    );

    // `disabled` n'existe pas sur <a> : le transmettre produirait un attribut
    // invalide, ignoré par le navigateur et trompeur pour les lecteurs d'écran.
    expect(screen.getByRole('link')).not.toHaveAttribute('disabled');
  });
});
