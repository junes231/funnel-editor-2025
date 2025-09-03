import React, { useState } from 'react';
import { Funnel } from '../../types/funnel.ts';
import { useNavigate } from 'react-router-dom';

interface Props {
  funnels: Funnel[];
  loading: boolean;
  error: string | null;
  createFunnel: (name: string) => Promise<string | undefined>;
  deleteFunnel: (id: string) => Promise<void>;
  notify: (m: string, t?: 'success' | 'error') => void;
}

export const FunnelDashboard: React.FC<Props> = ({
  funnels,
  loading,
  error,
  createFunnel,
  deleteFunnel,
  notify
}) => {
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const id = await createFunnel(newName.trim());
      if (id) {
        setNewName('');
        window.location.hash = `#/edit/${id}`;
      }
    } catch (e: any) {
      notify('Create failed', 'error');
    } finally {
      setCreating(false);
    }
  }

  function handleCopyLink(id: string) {
    const base = window.location.href.split('#')[0];
    const url = `${base}#/play/${id}`;
    navigator.clipboard.writeText(url)
      .then(() => notify('Link copied'))
      .catch(() => notify('Copy failed', 'error'));
  }

  return (
    <div className="dashboard-container">
      <h2>🥞 Your Funnels</h2>

      <div className="create-funnel-section">
        <input
          type="text"
          placeholder="New Funnel Name"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          className="funnel-name-input"
          disabled={creating}
        />
        <button
          className="add-button"
          onClick={handleCreate}
          disabled={creating}
        >
          {creating ? 'Creating...' : 'Create New Funnel'}
        </button>
      </div>

      {loading && <p className="loading-message">Loading funnels...</p>}
      {error && <p className="error-message">{error}</p>}

      {!loading && !error && (
        funnels.length === 0 ? (
          <p className="no-funnels-message">No funnels yet. Create one!</p>
        ) : (
          <ul className="funnel-list">
            {funnels.map(f => (
              <li key={f.id} className="funnel-item">
                <span>{f.name}</span>
                <div className="funnel-actions">
                  <button className="button-link" onClick={() => navigate(`/edit/${f.id}`)}>Edit</button>
                  <button className="button-link" onClick={() => navigate(`/play/${f.id}`)}>Play</button>
                  <button className="button-link" onClick={() => handleCopyLink(f.id)}>Copy Link</button>
                  <button className="button-link delete-button" onClick={() => deleteFunnel(f.id)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
};
