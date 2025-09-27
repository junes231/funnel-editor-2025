import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getDoc, doc } from 'firebase/firestore'; // 只导入所需方法
import { db } from '../firebase.ts'; // 导入已初始化的 db 实例

const PlayFunnel = () => {
  const { id } = useParams<{ id: string }>();
  const [funnelData, setFunnelData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
