import { useState } from 'react';
import { downloadDocument } from '../services/documentsApi.js';

export default function DownloadButton({ userId, document }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleClick() {
    setLoading(true);
    setError('');
    try {
      await downloadDocument(userId, document);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button type="button" onClick={handleClick} disabled={loading}>
        {loading ? 'Baixando...' : 'Baixar'}
      </button>
      {error && <span role="alert" style={{ color: 'crimson', marginLeft: 8 }}>{error}</span>}
    </>
  );
}
