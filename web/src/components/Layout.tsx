import { NavLink, Outlet } from 'react-router';

const navItems = [
  { to: '/', label: 'Overview', end: true },
  { to: '/models', label: 'Models' },
  { to: '/projects', label: 'Projects' },
  { to: '/sessions', label: 'Sessions' },
];

export default function Layout() {
  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-60 shrink-0 bg-white border-r border-slate-200 flex flex-col">
        <div className="px-6 py-5 border-b border-slate-200">
          <span className="text-lg font-semibold tracking-tight text-slate-900">yclaude</span>
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
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
