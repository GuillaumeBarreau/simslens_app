import { CURRENT_SEASON, WOW_EXTENSION } from 'config/seasonConfig';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import api from 'services/api';
import type { User } from 'types/user.types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  isAuthenticated: boolean;
  refetchUser: () => Promise<void>;
  selectedCharacterId: number | null;
  setSelectedCharacter: (characterId: number | null) => void;
  lastVisitedRealm: { guildName: string; extension: string; season: string } | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [bnetUser, setBnetUser] = useState<User | null>(null);
  const [isBnetLoading, setIsBnetLoading] = useState(true);
  const [selectedCharacterId, setSelectedCharacterIdState] = useState<number | null>(() => {
    const stored = localStorage.getItem('selectedCharacterId');
    return stored ? parseInt(stored, 10) : null;
  });

  const fetchBnetUser = async () => {
    try {
      const res = await api.get(`${API_BASE_URL}/auth/me`);
      if (res.data) {
        setBnetUser({ ...res.data, provider: 'bnet' });
      } else {
        setBnetUser(null);
      }
    } catch (err) {
      setBnetUser(null);
    } finally {
      setIsBnetLoading(false);
    }
  };

  useEffect(() => {
    fetchBnetUser();
  }, []);

  const refetchUser = async () => {
    await fetchBnetUser();
  };

  const setSelectedCharacter = (characterId: number | null) => {
    setSelectedCharacterIdState(characterId);
    if (characterId) {
      localStorage.setItem('selectedCharacterId', String(characterId));
    } else {
      localStorage.removeItem('selectedCharacterId');
    }
  };

  useEffect(() => {
    if (bnetUser) {
      const redirect = localStorage.getItem('auth_redirect');
      const isSafeInternalPath =
        typeof redirect === 'string' &&
        redirect.startsWith('/') &&
        !redirect.startsWith('//') &&
        !redirect.includes('\\');
      if (isSafeInternalPath && redirect !== '/login' && redirect !== '/') {
        localStorage.removeItem('auth_redirect');
        window.location.href = redirect;
      }
    }
  }, [bnetUser]);

  const login = () => {
    if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
      localStorage.setItem('auth_redirect', window.location.pathname + window.location.search);
    }

    window.location.href = `${API_BASE_URL}/auth/bnet`;
  };

  const logout = async () => {
    localStorage.removeItem('selectedCharacterId');
    localStorage.removeItem('auth_redirect');
    window.location.href = `${API_BASE_URL}/auth/logout`;
  };

  const user = bnetUser;
  const isLoading = isBnetLoading;

  const lastVisitedRealm =
    selectedCharacterId && user?.linkedCharacters
      ? (() => {
          const char = user.linkedCharacters.find((c) => c.id === selectedCharacterId);
          if (char?.guildName) {
            const pathParts = window.location.pathname.split('/').filter(Boolean);
            const extension = pathParts[1] || WOW_EXTENSION;
            const season = pathParts[2] || CURRENT_SEASON;

            return {
              guildName: char.guildName,
              extension,
              season,
            };
          }
          return null;
        })()
      : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        isAuthenticated: !!user,
        refetchUser,
        selectedCharacterId,
        setSelectedCharacter,
        lastVisitedRealm,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
