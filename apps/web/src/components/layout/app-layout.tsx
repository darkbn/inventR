import {
  Boxes,
  ClipboardList,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Package,
  ScrollText,
  Users,
  Warehouse,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/auth-context';
import { ROLE_LABELS } from '@/lib/labels';
import { cn } from '@/lib/utils';
import type { Role } from '@/api/types';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: Role[];
  /** Exige une correspondance exacte, pour les routes d'index. */
  end?: boolean;
}

/**
 * Navigation filtrée par rôle. Masquer une entrée n'est pas une mesure de
 * sécurité — l'API garde chaque route — mais cela évite de présenter à un
 * utilisateur des écrans qu'il ne peut pas ouvrir.
 */
const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Pilotage',
    items: [
      {
        to: '/',
        label: 'Tableau de bord',
        icon: LayoutDashboard,
        roles: ['ADMIN', 'SUPERVISOR', 'USER'],
        end: true,
      },
      {
        to: '/campagnes',
        label: 'Campagnes',
        icon: ClipboardList,
        roles: ['ADMIN', 'SUPERVISOR', 'USER'],
      },
    ],
  },
  {
    title: 'Référentiels',
    items: [
      { to: '/articles', label: 'Articles', icon: Package, roles: ['ADMIN', 'SUPERVISOR'] },
      { to: '/magasins', label: 'Magasins', icon: Warehouse, roles: ['ADMIN', 'SUPERVISOR'] },
      { to: '/emplacements', label: 'Emplacements', icon: MapPin, roles: ['ADMIN', 'SUPERVISOR'] },
      { to: '/parametrage', label: 'Paramétrage', icon: Boxes, roles: ['ADMIN'] },
    ],
  },
  {
    title: 'Administration',
    items: [
      { to: '/utilisateurs', label: 'Utilisateurs', icon: Users, roles: ['ADMIN', 'SUPERVISOR'] },
      { to: '/journal', label: 'Journal d’activité', icon: ScrollText, roles: ['ADMIN'] },
    ],
  },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async (): Promise<void> => {
    await logout();
    navigate('/connexion', { replace: true });
  };

  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => (user ? item.roles.includes(user.role) : false)),
  })).filter((section) => section.items.length > 0);

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Voile d'arrière-plan du menu mobile */}
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Fermer le menu"
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-background transition-transform lg:static lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-5">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" aria-hidden />
            <span className="text-lg font-semibold tracking-tight">InventAir</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Fermer le menu"
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto p-4">
          {visibleSections.map((section) => (
            <div key={section.title}>
              <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {section.title}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                        )
                      }
                    >
                      <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t p-4">
          <div className="mb-3 min-w-0">
            <p className="truncate text-sm font-medium">{user?.fullName}</p>
            <Badge variant="secondary" className="mt-1">
              {user ? ROLE_LABELS[user.role] : ''}
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => void handleLogout()}
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Se déconnecter
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 border-b bg-background px-4 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" aria-hidden />
          </Button>
          <span className="font-semibold">InventAir</span>
        </header>

        <main className="min-w-0 flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
