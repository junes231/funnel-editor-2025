import { useCallback, useEffect, useState } from 'react';
import {
  Firestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc
} from 'firebase/firestore';
import { Funnel, FunnelData, defaultFunnelData } from '../types/funnel.ts';
import { User } from 'firebase/auth';

interface UseFunnelsOptions {
  db: Firestore;
  user: User | null;
  isAdmin: boolean;
  notify: (msg: string, type?: 'success' | 'error') => void;
}

export function useFunnels({ db, user, isAdmin, notify }: UseFunnelsOptions) {
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!db || !user) {
      setFunnels([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const ref = collection(db, 'funnels');
      const q = isAdmin ? query(ref) : query(ref, where('ownerId', '==', user.uid));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => {
        const raw = d.data() as any;
        return {
          id: d.id,
          name: raw.name,
          ownerId: raw.ownerId,
          data: { ...defaultFunnelData, ...raw.data }
        } as Funnel;
      });
      setFunnels(data);
    } catch (e: any) {
      setError(e.message || 'Load error');
    } finally {
      setLoading(false);
    }
  }, [db, user, isAdmin]);

  useEffect(() => {
    reload();
  }, [reload]);

  const createFunnel = useCallback(async (name: string) => {
    if (!db || !user) return;
    if (!name.trim()) return;
    const ref = collection(db, 'funnels');
    const newDoc = await addDoc(ref, {
      name,
      ownerId: user.uid,
      data: defaultFunnelData
    });
    notify(`Funnel "${name}" created`);
    setFunnels(prev => [...prev, {
      id: newDoc.id,
      name,
      ownerId: user.uid,
      data: defaultFunnelData
    }]);
    return newDoc.id;
  }, [db, user, notify]);

  const deleteFunnelById = useCallback(async (id: string) => {
    if (!db || !user) return;
    await deleteDoc(doc(db, 'funnels', id));
    setFunnels(prev => prev.filter(f => f.id !== id));
    notify('Funnel deleted');
  }, [db, user, notify]);

  const updateFunnelData = useCallback(async (id: string, data: FunnelData) => {
    if (!db || !user) return;
    await updateDoc(doc(db, 'funnels', id), { data });
  }, [db, user]);

  return {
    funnels,
    loading,
    error,
    reload,
    createFunnel,
    deleteFunnelById,
    updateFunnelData,
    setFunnels
  };
}
