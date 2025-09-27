import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { initializeApp } from 'firebase/app';
import { getFirestore, getDoc, doc } from 'firebase/firestore';
import { firebaseConfig } from '../../firebase-config'; // 调整为项目路径

const PlayFunnel = () => {
  const { id } = useParams<{ id: string }>();
  const [funnelData, setFunnelData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    const fetchFunnel = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      try {
        const docRef = doc(db, 'funnels', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setFunnelData(docSnap.data());
        } else {
          console.log('No funnel found for ID:', id);
        }
      } catch (err) {
        console.error('Error fetching funnel:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFunnel();
  }, [id]);

  if (loading) return <div>Loading funnel...</div>;
  if (!funnelData) return <div>Funnel not found</div>;

  return (
    <div>
      <h1>Funnel Preview</h1>
      <pre>{JSON.stringify(funnelData, null, 2)}</pre>
    </div>
  );
};

export default PlayFunnel;
