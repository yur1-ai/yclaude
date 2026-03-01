import { NavLink, Outlet } from 'react-router';
import { useThemeStore, type Theme } from '../store/useThemeStore';

const navItems = [
  { to: '/', label: 'Overview', end: true },
  { to: '/models', label: 'Models' },
  { to: '/projects', label: 'Projects' },
  { to: '/sessions', label: 'Sessions' },
];

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
      onClick={handleToggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="text-slate-400 dark:text-[#8b949e] hover:text-slate-600 dark:hover:text-[#e6edf3] p-1 rounded transition-colors"
    >
      {isDark ? '☀' : '☾'}
    </button>
  );
}

export default function Layout() {
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0d1117]">
      <aside className="w-60 shrink-0 bg-white dark:bg-[#161b22] border-r border-slate-200 dark:border-[#30363d] flex flex-col">
        <div className="px-6 py-5 border-b border-slate-200 dark:border-[#30363d]">
          <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-[#e6edf3]">yclaude</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-100 text-slate-900 dark:bg-[#21262d] dark:text-[#e6edf3]'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-[#8b949e] dark:hover:bg-[#21262d] dark:hover:text-[#e6edf3]'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-slate-200 dark:border-[#30363d] flex items-center justify-between mt-auto">
          <ThemeToggle />
          <span className="text-xs text-slate-400 dark:text-[#8b949e]">v1.1.0</span>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
