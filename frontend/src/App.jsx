import { useCallback, useEffect, useState } from 'react';
import UploadComponent from './components/UploadComponent.jsx';
import DocumentList from './components/DocumentList.jsx';
import { listDocuments } from './services/documentsApi.js';

export default function App() {
  const [userId, setUserId] = useState('');
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState('');

  const activeUserId = userId.trim();

  const refresh = useCallback(async () => {
    if (!activeUserId) {
      setDocuments([]);
      return;
    }
    try {
      setDocuments(await listDocuments(activeUserId));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, [activeUserId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
      <h1>Document Management System</h1>

      <label>
        Usuário:{' '}
        <input
          value={userId}
          maxLength={128}
          placeholder="Informe seu ID de usuário"
          onChange={(event) => setUserId(event.target.value)}
        />
      </label>

      {activeUserId && (
        <>
          <h2>Enviar documento</h2>
          <UploadComponent userId={activeUserId} onUploaded={refresh} />

          <h2>Meus documentos</h2>
          {error && <p role="alert" style={{ color: 'crimson' }}>{error}</p>}
          <DocumentList userId={activeUserId} documents={documents} />
        </>
      )}
    </main>
  );
}
