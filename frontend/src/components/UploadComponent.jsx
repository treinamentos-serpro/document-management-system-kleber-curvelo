import { useState } from 'react';
import { uploadDocument } from '../services/documentsApi.js';

export default function UploadComponent({ userId, onUploaded }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const document = await uploadDocument(userId, file);
      setFile(null);
      event.target.reset();
      onUploaded(document);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="file" onChange={(event) => setFile(event.target.files[0] ?? null)} />
      <button type="submit" disabled={!file || loading}>
        {loading ? 'Enviando...' : 'Enviar'}
      </button>
      {error && <p role="alert" style={{ color: 'crimson' }}>{error}</p>}
    </form>
  );
}
