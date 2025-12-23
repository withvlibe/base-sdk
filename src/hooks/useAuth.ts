'use client';

import { useState, useEffect, useCallback } from 'react';
import type { VlibeBaseAuth } from '../VlibeBaseAuth';
import type { VlibeUser, UseAuthReturn } from '../types';

/**
 * React hook for authentication
 *
 * @param auth - VlibeBaseAuth instance
 * @param initialToken - Optional initial token (from SSO callback)
 * @returns Auth state and operations
 *
 * @example
 * ```tsx
 * function App() {
 *   const { user, loading, login, logout, hasFeature } = useAuth(auth);
 *
 *   if (loading) return <div>Loading...</div>;
 *
 *   if (!user) {
 *     return <button onClick={() => login()}>Login</button>;
 *   }
 *
 *   return (
 *     <div>
 *       <p>Welcome, {user.name}!</p>
 *       {hasFeature('premium') && <PremiumFeature />}
 *       <button onClick={() => logout()}>Logout</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAuth(
  auth: VlibeBaseAuth,
  initialToken?: string | null
): UseAuthReturn {
  const [user, setUser] = useState<VlibeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Verify session on mount
  useEffect(() => {
    const verifySession = async () => {
      setLoading(true);
      setError(null);

      try {
        // Check for token in URL params (SSO callback)
        let token = initialToken;
        if (!token && typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          token = params.get('vlibe_token');
        }

        // Check localStorage for existing session
        if (!token && typeof window !== 'undefined') {
          token = localStorage.getItem('vlibe_base_token');
        }

        if (token) {
          const verifiedUser = await auth.verifySession(token);
          if (verifiedUser) {
            setUser(verifiedUser);
            // Store token for future use
            if (typeof window !== 'undefined') {
              localStorage.setItem('vlibe_base_token', token);
            }
          } else {
            // Clear invalid token
            if (typeof window !== 'undefined') {
              localStorage.removeItem('vlibe_base_token');
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Auth verification failed'));
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, [auth, initialToken]);

  const login = useCallback(
    (redirectPath?: string) => {
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
      const loginUrl = auth.getLoginUrl(redirectPath || currentPath);
      if (typeof window !== 'undefined') {
        window.location.href = loginUrl;
      }
    },
    [auth]
  );

  const logout = useCallback(
    (redirectPath?: string) => {
      // Clear local storage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('vlibe_base_token');
      }
      setUser(null);

      const logoutUrl = auth.getLogoutUrl(redirectPath || '/');
      if (typeof window !== 'undefined') {
        window.location.href = logoutUrl;
      }
    },
    [auth]
  );

  const hasFeature = useCallback(
    (feature: string): boolean => {
      return auth.hasFeature(user, feature);
    },
    [auth, user]
  );

  const hasSubscription = useCallback((): boolean => {
    return auth.hasSubscription(user);
  }, [auth, user]);

  return {
    user,
    loading,
    error,
    login,
    logout,
    hasFeature,
    hasSubscription,
  };
}
