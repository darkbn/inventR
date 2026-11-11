import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { ApiError } from '@/api/client';
import { AppLayout } from '@/components/layout/app-layout';
import { ErrorBoundary } from '@/components/layout/error-boundary';
import { RequireAuth } from '@/components/layout/require-auth';
import { ToastProvider } from '@/components/ui/toast';
import { AuthProvider } from '@/features/auth/auth-context';
import { ActivityLogsPage } from '@/pages/activity-logs-page';
import { ArticlesPage } from '@/pages/articles-page';
import { CampaignCreatePage } from '@/pages/campaign-create-page';
import { CampaignDetailPage } from '@/pages/campaign-detail-page';
import { CampaignsPage } from '@/pages/campaigns-page';
import { HomePage } from '@/pages/home-page';
import { ImportPage } from '@/pages/import-page';
import { ListCreatePage } from '@/pages/list-create-page';
import { ListDetailPage } from '@/pages/list-detail-page';
import { LocationsPage } from '@/pages/locations-page';
import { LoginPage } from '@/pages/login-page';
import { NotFoundPage } from '@/pages/not-found-page';
import { SettingsPage } from '@/pages/settings-page';
import { UsersPage } from '@/pages/users-page';
import { WarehousesPage } from '@/pages/warehouses-page';

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // Une erreur d'autorisation ou de validation ne se résoudra pas en
          // réessayant : seules les défaillances réseau méritent une relance.
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
            return false;
          }
          return failureCount < 2;
        },
      },
      mutations: { retry: false },
    },
  });
}

export function App() {
  // Instance créée une seule fois : la recréer à chaque rendu viderait le cache.
  const [queryClient] = useState(createQueryClient);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ToastProvider>
            <AuthProvider>
              <Routes>
                <Route path="/connexion" element={<LoginPage />} />

                <Route element={<RequireAuth />}>
                  <Route element={<AppLayout />}>
                    <Route index element={<HomePage />} />
                    <Route path="campagnes" element={<CampaignsPage />} />
                    <Route path="campagnes/:campaignId" element={<CampaignDetailPage />} />
                    <Route path="listes/:listId" element={<ListDetailPage />} />

                    {/* Écrans réservés à l'encadrement */}
                    <Route element={<RequireAuth roles={['ADMIN', 'SUPERVISOR']} />}>
                      <Route path="campagnes/nouvelle" element={<CampaignCreatePage />} />
                      <Route
                        path="campagnes/:campaignId/listes/nouvelle"
                        element={<ListCreatePage />}
                      />
                      <Route path="listes/:listId/import" element={<ImportPage />} />
                      <Route path="articles" element={<ArticlesPage />} />
                      <Route path="magasins" element={<WarehousesPage />} />
                      <Route path="emplacements" element={<LocationsPage />} />
                      <Route path="utilisateurs" element={<UsersPage />} />
                    </Route>

                    {/* Écrans réservés à l'administration */}
                    <Route element={<RequireAuth roles={['ADMIN']} />}>
                      <Route path="parametrage" element={<SettingsPage />} />
                      <Route path="journal" element={<ActivityLogsPage />} />
                    </Route>

                    <Route path="404" element={<NotFoundPage />} />
                    <Route path="*" element={<Navigate to="/404" replace />} />
                  </Route>
                </Route>
              </Routes>
            </AuthProvider>
          </ToastProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
