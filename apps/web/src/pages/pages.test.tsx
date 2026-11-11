import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as client from '@/api/client';
import { ToastProvider } from '@/components/ui/toast';
import { AuthProvider } from '@/features/auth/auth-context';
import { CampaignsPage } from '@/pages/campaigns-page';
import { HomePage } from '@/pages/home-page';
import type { Campaign, UserProfile } from '@/api/types';

/**
 * Rendu réel des écrans, avec l'API simulée.
 *
 * Ces tests existent à la suite d'une régression : un bouton-lien mal construit
 * faisait échouer le rendu de l'accueil, et l'absence de limite d'erreur
 * transformait l'exception en page blanche muette. Monter chaque page au moins
 * une fois en test rend ce type de défaut immédiatement visible.
 */

const ADMIN: UserProfile = {
  id: 'user-1',
  email: 'admin@inventair.local',
  username: 'admin',
  fullName: 'Administrateur InventAir',
  role: 'ADMIN',
  isActive: true,
  lastLoginAt: null,
};

const CAMPAIGN: Campaign = {
  id: 'campaign-1',
  code: 'INV-2026-PDR-01',
  name: 'Inventaire annuel PDR Boufarik',
  campaignTypeId: 'type-1',
  inventoryMethodId: 'method-1',
  warehouseId: 'warehouse-1',
  status: 'COUNTING',
  round: 1,
  parentCampaignId: null,
  startedAt: '2026-06-14T08:00:00.000Z',
  closedAt: null,
  missingZeroedAt: null,
  reopenedAt: null,
  reopenReason: null,
  createdAt: '2026-06-01T08:00:00.000Z',
  updatedAt: '2026-06-14T08:00:00.000Z',
};

const DASHBOARD = {
  campaignId: CAMPAIGN.id,
  code: CAMPAIGN.code,
  name: CAMPAIGN.name,
  status: CAMPAIGN.status,
  round: 1,
  methodCode: 'METHOD_1',
  methodLabel: 'Méthode 1 — Somme cumulative',
  campaignTypeLabel: 'Pièces de rechange (PDR)',
  warehouseCode: '19R01',
  zeroTheoreticalHidden: true,
  progress: {
    totalItems: 100,
    pending: 40,
    counted: 55,
    confirmed: 0,
    awaitingSecondCount: 0,
    awaitingThirdCount: 0,
    underInvestigation: 0,
    discrepancies: 0,
    notFound: 5,
    manualItems: 0,
    completionPercent: 60,
  },
  variance: {
    surplusCount: 3,
    shortageCount: 7,
    matchingCount: 50,
    surplusQuantity: 12,
    shortageQuantity: 9,
    surplusValue: 1200,
    shortageValue: 20000,
    netValue: -18800,
  },
  topVariances: [],
  lists: [],
  counters: [],
  startedAt: CAMPAIGN.startedAt,
  closedAt: null,
};

/** Réponses de l'API, par préfixe d'URL. */
function mockApi(): void {
  vi.spyOn(client, 'apiGet').mockImplementation((url: string) => {
    if (url === '/auth/me') return Promise.resolve(ADMIN as never);
    if (url.startsWith('/campaigns/')) return Promise.resolve(DASHBOARD as never);
    if (url === '/campaigns') {
      return Promise.resolve({
        data: [CAMPAIGN],
        meta: {
          page: 1,
          limit: 25,
          total: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      } as never);
    }
    return Promise.resolve({
      data: [],
      meta: {
        page: 1,
        limit: 25,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    } as never);
  });
}

function renderPage(ui: React.ReactElement): void {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ToastProvider>
          <AuthProvider>{ui}</AuthProvider>
        </ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('rendu des écrans', () => {
  beforeEach(() => {
    localStorage.setItem('inventair.accessToken', 'jeton');
    localStorage.setItem('inventair.refreshToken', 'rafraichissement');
    mockApi();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('affiche l’accueil sans lever d’exception', async () => {
    renderPage(<HomePage />);

    // Le bouton « Nouvelle campagne » est un bouton-lien : c'est précisément
    // lui qui provoquait l'écran blanc.
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /Nouvelle campagne/ })).toBeInTheDocument();
    });

    // Le code figure à deux endroits : dans la liste des campagnes récentes et
    // dans le bloc d'avancement.
    expect(screen.getAllByText(CAMPAIGN.code).length).toBeGreaterThan(0);
  });

  it('affiche la liste des campagnes', async () => {
    renderPage(<CampaignsPage />);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: CAMPAIGN.code })).toBeInTheDocument();
    });

    expect(screen.getByText('Comptage en cours')).toBeInTheDocument();
  });
});
