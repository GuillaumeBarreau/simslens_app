import { ClerkProvider, SignedIn, SignedOut, SignIn } from '@clerk/clerk-react';
import { useState } from 'react';

import Dashboard from '../pages/Dashboard';
import Guilds from '../pages/Guilds';
import type { Page } from '../types';
import Sidebar from './Sidebar';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

function App() {
  const [page, setPage] = useState<Page>('dashboard');

  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <SignedOut>
        <div className="flex h-screen items-center justify-center bg-gray-950">
          <SignIn routing="hash" />
        </div>
      </SignedOut>
      <SignedIn>
        <div className="flex h-screen overflow-hidden bg-gray-950 text-gray-100">
          <Sidebar currentPage={page} onNavigate={setPage} />
          <main className="flex-1 overflow-y-auto">
            {page === 'dashboard' && <Dashboard />}
            {page === 'guilds' && <Guilds />}
          </main>
        </div>
      </SignedIn>
    </ClerkProvider>
  );
}

export default App;
