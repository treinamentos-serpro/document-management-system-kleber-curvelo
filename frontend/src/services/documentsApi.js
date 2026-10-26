const API_PREFIX = '/api';

async function request(path, userId, options = {}) {
  const response = await fetch(`${API_PREFIX}${path}`, {
    ...options,
    headers: { ...options.headers, 'X-User-Id': userId },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message ?? 'Não foi possível concluir a operação.');
  }
  return response;
}

export async function listDocuments(userId) {
  const response = await request('/documents', userId);
  const { documents } = await response.json();
  return documents;
}

export async function uploadDocument(userId, file) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await request('/upload', userId, { method: 'POST', body: formData });
  const { document } = await response.json();
  return document;
}

// O download usa fetch (e não um link direto) porque o backend exige o header X-User-Id.
export async function downloadDocument(userId, document) {
  const response = await request(`/documents/${encodeURIComponent(document.id)}/download`, userId);
  const url = URL.createObjectURL(await response.blob());
  const link = window.document.createElement('a');
  link.href = url;
  link.download = document.originalName;
  link.click();
  URL.revokeObjectURL(url);
}
