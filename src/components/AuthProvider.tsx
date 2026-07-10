import { useEffect, useState, type ReactNode } from 'react';
import { AuthContext } from '@/hooks/useAuth';
import { TOKEN_KEY } from '@/lib/api/client';
import {
  fetchMe,
  loginWithEmail as apiLoginWithEmail,
  loginWithGoogle as apiLoginWithGoogle,
  logoutRequest,
  type LoginResponse,
  type User,
} from '@/lib/api/auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate the current user from a persisted token once on mount. Intentionally
  // not re-run when accessToken changes via login/logout — those already set
  // `user` directly, so re-hydrating here would just be a redundant refetch.
  useEffect(() => {
    if (!accessToken) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoading(false);
      return;
    }
    fetchMe()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setAccessToken(null);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyLogin = ({ token, user }: LoginResponse) => {
    localStorage.setItem(TOKEN_KEY, token);
    setAccessToken(token);
    setUser(user);
  };

  const loginWithEmail = async (email: string, password: string) => {
    applyLogin(await apiLoginWithEmail(email, password));
  };

  const loginWithGoogle = async (idToken: string) => {
    applyLogin(await apiLoginWithGoogle(idToken));
  };

  const logout = async () => {
    if (accessToken) {
      try {
        await logoutRequest();
      } catch {
        // Best-effort — clear local state regardless of whether the server call succeeded.
      }
    }
    localStorage.removeItem(TOKEN_KEY);
    setAccessToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoading, loginWithEmail, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
