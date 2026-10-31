import { useClerk } from '@clerk/clerk-react';
import logo from 'assets/logo.svg';

import type { Page } from '../types';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const navItems: { id: Page; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'guilds', label: 'Guildes', icon: '⚔️' },
];

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { signOut } = useClerk();

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-gray-800 bg-gray-900">
      <div className="flex items-center gap-3 border-b border-gray-800 px-4 py-5">
        <img src={logo} alt="logo" className="size-8" />
        <span className="text-sm font-bold uppercase tracking-wide text-yellow-400">WoW Admin</span>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
            className={[
              'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              currentPage === item.id
                ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100',
            ].join(' ')}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="border-t border-gray-800 px-2 py-3">
        <button
          type="button"
          onClick={() => signOut()}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          <span>🚪</span>
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
