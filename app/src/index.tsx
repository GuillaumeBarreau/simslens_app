import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dates/styles.css';
import './i18n';
import './styles/global.css';
import './styles/signedOut.css';

import { Center, Loader, MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SEO } from 'components/design-system/molecules';
import { Header } from 'components/design-system/organisms';
import { FeatureGuard } from 'components/FeatureGuard';
import RealmRedirect from 'components/RealmRedirect';
import RequireExtension from 'components/RequireExtension';
import RequireGameCapability from 'components/RequireGameCapability';
import RequireRealm from 'components/RequireRealm';
import { AuthProvider, DifficultyProvider, useAuth } from 'contexts';
import { useRealmAccess } from 'contexts/RealmAccessContext';
import AttendancePage from 'pages/AttendancePage/AttendancePage';
import CalendarPage from 'pages/CalendarPage/CalendarPage';
import CreateRealmPage from 'pages/CreateRealmPage/CreateRealmPage';
import DevicePage from 'pages/DevicePage/DevicePage';
import DiscordOAuthCallbackPage from 'pages/DiscordOAuthCallbackPage';
import DungeonComposerPage from 'pages/DungeonComposerPage/DungeonComposerPage';
import DungeonsPage from 'pages/DungeonsPage/DungeonsPage';
import EventRosterPage from 'pages/EventRosterPage/EventRosterPage';
import AttunementsPage from 'pages/forever/AttunementsPage/AttunementsPage';
import HistoryPage from 'pages/HistoryPage/HistoryPage';
import ImportPage from 'pages/ImportPage/ImportPage';
import JoinAsGuestPage from 'pages/JoinAsGuestPage/JoinAsGuestPage';
import KeysHistoryPage from 'pages/KeysHistoryPage/KeysHistoryPage';
import LoginPage from 'pages/LoginPage/LoginPage';
import LootEquityPage from 'pages/LootEquityPage/LootEquityPage';
import LootsOptimiserPage from 'pages/LootsOptimiserPage/LootsOptimiserPage';
import MyActivityPage from 'pages/MyActivityPage/MyActivityPage';
import RosterPage from 'pages/RosterPage/RosterPage';
import SettingsPage from 'pages/SettingsPage/SettingsPage';
import SyncCharactersPage from 'pages/SyncCharactersPage/SyncCharactersPage';
import TrackingPage from 'pages/TrackingPage/TrackingPage';
import WishlistPage from 'pages/WishlistPage/WishlistPage';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { createBrowserRouter, Navigate, RouterProvider, useParams } from 'react-router-dom';

import { theme } from './theme/dark';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const Root = () => {
  // PrivateRoute must be inside Root to have access to AuthProvider
  const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
      return (
        <Center h="100vh">
          <Loader size="xl" />
        </Center>
      );
    }

    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
  };

  const RequireNotGuest = ({ children }: { children: React.ReactNode }) => {
    const { role } = useRealmAccess();
    const { guild, extension } = useParams();
    if (role === 'guest') {
      return <Navigate to={`/${guild}/${extension}/raid`} replace />;
    }
    return <>{children}</>;
  };

  const router = createBrowserRouter([
    {
      path: '/login',
      element: <LoginPage />,
    },
    {
      path: '/discord-oauth-callback',
      element: <DiscordOAuthCallbackPage />,
    },
    {
      path: '/',
      element: <Navigate to="/redirect" replace />,
    },
    {
      path: '/redirect',
      element: (
        <PrivateRoute>
          <RealmRedirect />
        </PrivateRoute>
      ),
    },
    {
      path: '/create-realm',
      element: (
        <PrivateRoute>
          <Header />
          <CreateRealmPage />
        </PrivateRoute>
      ),
    },
    {
      path: '/join-guest',
      element: (
        <PrivateRoute>
          <Header />
          <JoinAsGuestPage />
        </PrivateRoute>
      ),
    },
    {
      path: '/invite/:code',
      element: (
        <PrivateRoute>
          <Header />
          <JoinAsGuestPage />
        </PrivateRoute>
      ),
    },
    {
      path: '/device',
      element: (
        <PrivateRoute>
          <Header />
          <DevicePage />
        </PrivateRoute>
      ),
    },
    {
      path: 'sync',
      element: (
        <PrivateRoute>
          <Header />
          <SyncCharactersPage />
        </PrivateRoute>
      ),
    },
    {
      path: ':guild',
      element: (
        <PrivateRoute>
          <RequireRealm />
        </PrivateRoute>
      ),
      children: [
        {
          path: ':extension',
          element: <RequireExtension />,
          children: [
            {
              path: ':season',
              children: [
                {
                  path: 'boss',
                  element: <Navigate to="0" replace />,
                },
                {
                  path: 'boss/:index',
                  element: (
                    <RequireGameCapability capability="droptimizer">
                      <RequireNotGuest>
                        <Header />
                        <LootsOptimiserPage />
                      </RequireNotGuest>
                    </RequireGameCapability>
                  ),
                },
              ],
            },
            {
              path: 'my-activity',
              element: (
                <>
                  <Header />
                  <MyActivityPage />
                </>
              ),
            },
            {
              path: 'roster',
              element: (
                <RequireNotGuest>
                  <Header />
                  <RosterPage />
                </RequireNotGuest>
              ),
            },
            {
              path: 'wishlist',
              element: (
                <RequireNotGuest>
                  <Header />
                  <WishlistPage />
                </RequireNotGuest>
              ),
            },
            {
              path: 'tracking',
              element: (
                <RequireNotGuest>
                  <Header />
                  <TrackingPage onClose={() => window.history.back()} />
                </RequireNotGuest>
              ),
            },
            {
              path: 'keys-history',
              element: (
                <RequireGameCapability capability="mythicPlus">
                  <RequireNotGuest>
                    <Header />
                    <KeysHistoryPage />
                  </RequireNotGuest>
                </RequireGameCapability>
              ),
            },
            {
              path: 'raid',
              children: [
                {
                  index: true,
                  element: (
                    <>
                      <Header />
                      <CalendarPage />
                    </>
                  ),
                },
                {
                  path: 'event/:eventId/roster',
                  element: (
                    <>
                      <Header />
                      <EventRosterPage />
                    </>
                  ),
                },
              ],
            },
            {
              path: 'dungeons',
              element: <RequireGameCapability capability="mythicPlus" />,
              children: [
                {
                  index: true,
                  element: (
                    <>
                      <Header />
                      <DungeonsPage />
                    </>
                  ),
                },
                {
                  path: 'composer/:date',
                  element: (
                    <>
                      <Header />
                      <DungeonComposerPage />
                    </>
                  ),
                },
              ],
            },
            {
              path: 'import',
              element: (
                <RequireNotGuest>
                  <Header />
                  <ImportPage />
                </RequireNotGuest>
              ),
            },
            {
              path: 'settings',
              element: (
                <RequireNotGuest>
                  <Header />
                  <SettingsPage />
                </RequireNotGuest>
              ),
            },
            {
              path: 'history',
              element: (
                <RequireNotGuest>
                  <Header />
                  <HistoryPage />
                </RequireNotGuest>
              ),
            },
            {
              path: 'attendance',
              element: (
                <RequireNotGuest>
                  <Header />
                  <AttendancePage />
                </RequireNotGuest>
              ),
            },
            {
              path: 'attunements',
              element: (
                <RequireGameCapability capability="attunements">
                  <RequireNotGuest>
                    <Header />
                    <AttunementsPage />
                  </RequireNotGuest>
                </RequireGameCapability>
              ),
            },
            {
              path: 'loot-equity',
              element: (
                <RequireNotGuest>
                  <Header />
                  <FeatureGuard feature="loot-equity">
                    <LootEquityPage />
                  </FeatureGuard>
                </RequireNotGuest>
              ),
            },
          ],
        },
      ],
    },
  ]);

  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <Notifications position="bottom-center" />
      <HelmetProvider>
        <SEO />
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <DifficultyProvider>
              <RouterProvider router={router} />
            </DifficultyProvider>
          </AuthProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </MantineProvider>
  );
};

const container = document.getElementById('root') as HTMLDivElement;
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
