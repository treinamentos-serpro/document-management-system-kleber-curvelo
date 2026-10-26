import { useCallback, useEffect, useRef, useState } from 'react';
import UploadComponent from './components/UploadComponent.jsx';
import DocumentList from './components/DocumentList.jsx';
import { listDocuments } from './services/documentsApi.js';

export default function App() {
  const [userId, setUserId] = useState('');
  const [documents, setDocuments] = useState([]);
  const [documentsUserId, setDocumentsUserId] = useState('');
  const [error, setError] = useState('');
  const requestIdRef = useRef(0);

  const activeUserId = userId.trim();

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    if (!activeUserId) {
      setDocuments([]);
      setDocumentsUserId('');
      return;
    }
    try {
      const result = await listDocuments(activeUserId);
      if (requestId !== requestIdRef.current) return;
      setDocuments(result);
      setDocumentsUserId(activeUserId);
      setError('');
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err.message);
    }
  }, [activeUserId]);

  useEffect(() => {
    setDocuments([]);
    setDocumentsUserId('');
    setError('');
    refresh();
    return () => {
      requestIdRef.current += 1;
    };
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
          <DocumentList
            userId={activeUserId}
            documents={documentsUserId === activeUserId ? documents : []}
          />
        </>
      )}
    </main>
  );
}
