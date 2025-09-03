import { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';

interface UseAuthResult {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
}

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (current) => {
      if (current) {
        setUser(current);
        try {
          const token = await current.getIdTokenResult(true);
            setIsAdmin(token.claims.role === 'admin');
        } catch (e) {
          console.error('Admin claim check failed', e);
          setIsAdmin(false);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { user, isAdmin, loading };
}
