import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router';
import { useConfig } from '../hooks/useConfig';
import type { ProviderFilter } from '../lib/providers';
import { useProviderStore } from '../store/useProviderStore';
import { type Theme, useThemeStore } from '../store/useThemeStore';
import { ProviderTabs } from './ProviderTabs';

const navItems = [
  { to: '/', label: 'Overview', end: true },
  { to: '/models', label: 'Models' },
  { to: '/projects', label: 'Projects' },
  { to: '/sessions', label: 'Sessions' },
];

/** Routes supported per provider. Projects is NOT available for Cursor. */
const providerPages: Record<string, string[]> = {
  claude: ['/', '/models', '/projects', '/sessions', '/chats'],
  cursor: ['/', '/models', '/sessions', '/chats'],
  opencode: ['/', '/models', '/sessions', '/chats'],
  all: ['/', '/models', '/projects', '/sessions', '/chats'],
};

function isRouteSupported(provider: ProviderFilter, route: string): boolean {
  const pages = providerPages[provider];
  return pages ? pages.includes(route) : true;
}

function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();

  function handleToggle() {
    // Determine current effective state to pick the opposite
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const next: Theme = isDark ? 'light' : 'dark';
    setTheme(next);
  }

  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="text-slate-400 dark:text-[#8b949e] hover:text-slate-600 dark:hover:text-[#e6edf3] p-1 rounded transition-colors"
    >
      {isDark ? '☀' : '☾'}
    </button>
  );
}

export default function Layout() {
  const { data: config } = useConfig();
  const { provider, setProviders } = useProviderStore();

  // Populate provider store from config when loaded
  // biome-ignore lint/correctness/useExhaustiveDependencies: setProviders is stable (Zustand setter)
  useEffect(() => {
    if (config?.providers) {
      setProviders(
        config.providers.map((p) => ({
          id: p.id as 'claude' | 'cursor' | 'opencode',
          name: p.name,
          eventCount: p.eventCount,
        })),
      );
    }
  }, [config?.providers]);

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('yclaude:sidebar-collapsed') === 'true';
    } catch {
      return false;
    }
  });

  function toggleSidebar() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('yclaude:sidebar-collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0d1117]">
      {collapsed ? (
        <div className="shrink-0 bg-white dark:bg-[#161b22] border-r border-slate-200 dark:border-[#30363d] flex flex-col items-center py-3">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Expand sidebar"
            className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 dark:text-[#8b949e] hover:text-slate-600 dark:hover:text-[#e6edf3] hover:bg-slate-100 dark:hover:bg-[#21262d] transition-colors"
          >
            ▶
          </button>
        </div>
      ) : (
        <aside className="w-60 shrink-0 bg-white dark:bg-[#161b22] border-r border-slate-200 dark:border-[#30363d] flex flex-col">
          <div className="px-2 py-5 border-b border-slate-200 dark:border-[#30363d] flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label="Collapse sidebar"
              className="text-slate-400 dark:text-[#8b949e] hover:text-slate-600 dark:hover:text-[#e6edf3] p-1 rounded transition-colors shrink-0"
            >
              ◀
            </button>
            <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-[#e6edf3] whitespace-nowrap">
              yclaude
            </span>
          </div>
          <ProviderTabs />
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map(({ to, label, end }) => {
              const supported = isRouteSupported(provider, to);
              return (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  tabIndex={supported ? undefined : -1}
                  className={({ isActive }) =>
                    `block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      !supported
                        ? 'opacity-40 pointer-events-none text-slate-600 dark:text-[#8b949e]'
                        : isActive
                          ? 'bg-slate-100 text-slate-900 dark:bg-[#21262d] dark:text-[#e6edf3]'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-[#8b949e] dark:hover:bg-[#21262d] dark:hover:text-[#e6edf3]'
                    }`
                  }
                >
                  {label}
                </NavLink>
              );
            })}
            {(() => {
              const chatsSupported = isRouteSupported(provider, '/chats');
              return (
                <NavLink
                  to="/chats"
                  tabIndex={chatsSupported ? undefined : -1}
                  className={({ isActive }) =>
                    `block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      !chatsSupported
                        ? 'opacity-40 pointer-events-none text-slate-600 dark:text-[#8b949e]'
                        : isActive
                          ? 'bg-slate-100 text-slate-900 dark:bg-[#21262d] dark:text-[#e6edf3]'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-[#8b949e] dark:hover:bg-[#21262d] dark:hover:text-[#e6edf3]'
                    }`
                  }
                >
                  Chats
                </NavLink>
              );
            })()}
          </nav>
          <div className="px-4 py-3 border-t border-slate-200 dark:border-[#30363d] flex items-center justify-between mt-auto">
            <ThemeToggle />
            <span className="text-xs text-slate-400 dark:text-[#8b949e]">
              {config?.version ? `v${config.version}` : ''}
            </span>
          </div>
        </aside>
      )}
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
