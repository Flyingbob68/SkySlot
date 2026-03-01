import { useState, useCallback, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Plane,
  Users,
  Award,
  GraduationCap,
  Settings,
  User,
  Menu,
  X,
  ChevronDown,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useConfigStore } from '@/stores/config-store';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

const APP_VERSION = '0.1.0';

interface NavSubItem {
  readonly label: string;
  readonly to: string;
}

interface NavItemConfig {
  readonly label: string;
  readonly to: string;
  readonly icon: React.ReactNode;
  readonly permission?: string;
  readonly subItems?: readonly NavSubItem[];
}

const NAV_ITEMS: readonly NavItemConfig[] = [
  {
    label: 'Dashboard',
    to: '/dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    label: 'Prenotazioni',
    to: '/prenotazioni',
    icon: <Calendar className="h-5 w-5" />,
    subItems: [
      { label: 'Calendario', to: '/prenotazioni/calendario' },
      { label: 'Le mie prenotazioni', to: '/prenotazioni/mie' },
    ],
  },
  {
    label: 'Aeromobili',
    to: '/aeromobili',
    icon: <Plane className="h-5 w-5" />,
  },
  {
    label: 'Soci',
    to: '/soci',
    icon: <Users className="h-5 w-5" />,
    subItems: [
      { label: 'Elenco', to: '/soci/elenco' },
      { label: 'Directory', to: '/soci/directory' },
    ],
  },
  {
    label: 'Qualifiche',
    to: '/qualifiche',
    icon: <Award className="h-5 w-5" />,
  },
  {
    label: 'Istruttori',
    to: '/istruttori',
    icon: <GraduationCap className="h-5 w-5" />,
  },
  {
    label: 'Amministrazione',
    to: '/admin',
    icon: <Settings className="h-5 w-5" />,
    permission: 'club:configure',
    subItems: [
      { label: 'Configurazione', to: '/admin/configurazione' },
      { label: 'Ruoli', to: '/admin/ruoli' },
      { label: 'Audit Log', to: '/admin/audit' },
      { label: 'Statistiche', to: '/admin/statistiche' },
    ],
  },
  {
    label: 'Profilo',
    to: '/profilo',
    icon: <User className="h-5 w-5" />,
  },
];

function SidebarNavItem({ item, onNavigate }: {
  readonly item: NavItemConfig;
  readonly onNavigate?: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const hasSubItems = item.subItems && item.subItems.length > 0;

  return (
    <li>
      {hasSubItems ? (
        <>
          <button
            type="button"
            onClick={handleToggle}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium',
              'text-sidebar-foreground transition-colors',
              'hover:bg-sidebar-accent',
            )}
          >
            {item.icon}
            <span className="flex-1 text-left">{item.label}</span>
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform duration-200',
                isExpanded && 'rotate-180',
              )}
            />
          </button>
          <ul
            className={cn(
              'overflow-hidden transition-all duration-200',
              isExpanded ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0',
            )}
          >
            {item.subItems?.map((subItem) => (
              <li key={subItem.to}>
                <NavLink
                  to={subItem.to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'block rounded-lg py-1.5 pl-11 pr-3 text-sm transition-colors',
                      isActive
                        ? 'bg-sidebar-accent font-medium text-primary'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent',
                    )
                  }
                >
                  {subItem.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <NavLink
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-sidebar-accent text-primary'
                : 'text-sidebar-foreground hover:bg-sidebar-accent',
            )
          }
        >
          {item.icon}
          <span>{item.label}</span>
        </NavLink>
      )}
    </li>
  );
}

function ClubLogo() {
  const { config } = useConfigStore();

  const logoSrc = config?.hasLogo
    ? '/api/admin/config/logo'
    : '/logo_skyslot.png';

  const altText = config?.clubName ?? 'SkySlot';

  return (
    <img
      src={logoSrc}
      alt={altText}
      className="h-10 w-10 rounded-md object-contain"
    />
  );
}

function SidebarContent({ onNavigate }: { readonly onNavigate?: () => void }) {
  const { user } = useAuthStore();
  const { config } = useConfigStore();
  const userPermissions = user?.permissions ?? [];

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.permission) return true;
    return userPermissions.includes(item.permission);
  });

  const clubName = config?.clubName ?? '';

  return (
    <div className="flex h-full flex-col">
      {/* Club logo + name */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
        <ClubLogo />
        <span className="text-sm font-semibold leading-tight text-sidebar-foreground truncate">
          {clubName}
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="flex flex-col gap-1">
          {visibleItems.map((item) => (
            <SidebarNavItem
              key={item.to}
              item={item}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      </nav>

      {/* App name + version */}
      <div className="border-t border-sidebar-border px-4 py-3">
        <div className="flex items-center gap-2">
          <img
            src="/logo_skyslot.png"
            alt="SkySlot"
            className="h-6 w-6 rounded object-contain"
          />
          <div className="flex flex-col">
            <span className="text-sm font-bold leading-tight tracking-tight text-sidebar-foreground">
              SkySlot
            </span>
            <span className="text-[10px] leading-tight text-muted-foreground">
              v{APP_VERSION}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Header({
  onMenuToggle,
}: {
  readonly onMenuToggle: () => void;
}) {
  const { user, clearAuth } = useAuthStore();
  const { config } = useConfigStore();
  const navigate = useNavigate();

  const handleLogout = useCallback(() => {
    clearAuth();
    navigate('/login');
  }, [clearAuth, navigate]);

  const clubName = config?.clubName ?? '';

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuToggle}
          aria-label="Apri menu di navigazione"
        >
          <Menu className="h-5 w-5" />
        </Button>
        {/* Show club logo + name on mobile (hidden on desktop where sidebar is visible) */}
        <div className="flex items-center gap-2 lg:hidden">
          <ClubLogo />
          <span className="text-sm font-semibold text-foreground truncate max-w-[150px]">
            {clubName}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {user && (
          <>
            <Avatar
              firstName={user.firstName}
              lastName={user.lastName}
              size="sm"
            />
            <span className="hidden text-sm font-medium sm:inline">
              {user.firstName} {user.lastName}
            </span>
          </>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          aria-label="Esci"
          title="Esci"
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { fetchConfig, config } = useConfigStore();

  useEffect(() => {
    if (!config) {
      fetchConfig();
    }
  }, [config, fetchConfig]);

  const handleMenuToggle = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-sidebar-border bg-sidebar lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={handleCloseSidebar}
            aria-hidden="true"
          />
          {/* Sidebar panel */}
          <aside className="fixed inset-y-0 left-0 z-50 w-60 bg-sidebar shadow-xl transition-transform">
            <div className="absolute right-2 top-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCloseSidebar}
                aria-label="Chiudi menu di navigazione"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <SidebarContent onNavigate={handleCloseSidebar} />
          </aside>
        </div>
      )}

      {/* Main content area */}
      <div className="flex flex-1 flex-col">
        <Header onMenuToggle={handleMenuToggle} />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
