const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
test('API de documentos com armazenamento local', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'dms-test-'));
  const previousDirectory = process.env.STORAGE_DIR;
  const previousLimit = process.env.MAX_FILE_SIZE_BYTES;
  process.env.STORAGE_DIR = path.join(directory, 'storage');
  process.env.MAX_FILE_SIZE_BYTES = '64';

  const isolatedApp = require('../src/app');
  const repository = require('../src/repositories/documents.repository');
  const server = isolatedApp.listen(0, '127.0.0.1');
  t.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
      server.closeAllConnections();
    });
    await fs.rm(directory, { recursive: true, force: true });
    if (previousDirectory === undefined) delete process.env.STORAGE_DIR;
    else process.env.STORAGE_DIR = previousDirectory;
    if (previousLimit === undefined) delete process.env.MAX_FILE_SIZE_BYTES;
    else process.env.MAX_FILE_SIZE_BYTES = previousLimit;
  });
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  function request(endpoint, options = {}, owner = 'alice') {
    return fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...(owner === null ? {} : { 'X-User-Id': owner }),
        ...options.headers,
      },
    });
  }

  function fileForm(content = 'conteudo do documento', name = 'relatorio.txt', field = 'file') {
    const form = new FormData();
    form.append(field, new Blob([content], { type: 'text/plain' }), name);
    return form;
  }

  async function expectError(response, status, code) {
    assert.strictEqual(response.status, status);
    assert.match(response.headers.get('content-type'), /^application\/json/);
    const body = await response.json();
    assert.strictEqual(body.error.code, code);
    assert.strictEqual(typeof body.error.message, 'string');
    assert.ok(!JSON.stringify(body).includes(directory));
  }

  let document;
  let storedFilename;

  await t.test('o app backend é exportado', () => {
    assert.strictEqual(typeof isolatedApp, 'function', 'o app Express deve ser uma função');
  });

  await t.test('preserva health e retorna lista vazia', async () => {
    const health = await request('/health', {}, null);
    assert.strictEqual(health.status, 200);
    assert.deepStrictEqual(await health.json(), { status: 'ok' });
    const response = await request('/documents');
    assert.deepStrictEqual(await response.json(), { documents: [] });
  });

  await t.test('valida usuário antes de gravar uploads', async () => {
    for (const owner of [null, ' ', 'a'.repeat(129)]) {
      await expectError(await request('/documents', {}, owner), 400, 'USER_ID_REQUIRED');
    }
    await expectError(await request('/upload', {
      method: 'POST', body: fileForm(),
    }, null), 400, 'USER_ID_REQUIRED');
    await expectError(await request(`/documents/${randomUUID()}/download`, {}, null),
      400, 'USER_ID_REQUIRED');
    await assert.rejects(fs.readdir(process.env.STORAGE_DIR), { code: 'ENOENT' });
  });

  await t.test('upload retorna metadados públicos e grava bytes com nome aleatório', async () => {
    const response = await request('/upload', { method: 'POST', body: fileForm() });
    assert.strictEqual(response.status, 201);
    ({ document } = await response.json());
    assert.deepStrictEqual(Object.keys(document).sort(),
      ['id', 'originalName', 'size', 'uploadedAt', 'owner', 'contentType'].sort());
    assert.match(document.id, /^[0-9a-f-]{36}$/);
    assert.strictEqual(document.originalName, 'relatorio.txt');
    assert.strictEqual(document.size, Buffer.byteLength('conteudo do documento'));
    assert.strictEqual(document.owner, 'alice');
    assert.strictEqual(document.contentType, 'text/plain');
    assert.strictEqual(new Date(document.uploadedAt).toISOString(), document.uploadedAt);
    [storedFilename] = await fs.readdir(process.env.STORAGE_DIR);
    assert.match(storedFilename, /^[0-9a-f-]{36}$/);
    assert.strictEqual(await fs.readFile(path.join(process.env.STORAGE_DIR, storedFilename), 'utf8'),
      'conteudo do documento');
  });

  await t.test('filtra listagem e downloads pelo proprietário', async () => {
    const ownList = await request('/documents');
    assert.deepStrictEqual(await ownList.json(), { documents: [document] });
    const otherList = await request('/documents', {}, 'bob');
    assert.deepStrictEqual(await otherList.json(), { documents: [] });
    await expectError(await request(`/documents/${document.id}/download`, {}, 'bob'),
      404, 'DOCUMENT_NOT_FOUND');
  });

  await t.test('download preserva conteúdo, tipo e nome do anexo', async () => {
    const response = await request(`/documents/${document.id}/download`);
    assert.strictEqual(response.status, 200);
    assert.match(response.headers.get('content-disposition'), /attachment; filename="relatorio.txt"/);
    assert.match(response.headers.get('content-type'), /^text\/plain/);
    assert.strictEqual(await response.text(), 'conteudo do documento');
  });

  await t.test('rejeita arquivo ausente, campo incorreto e arquivos múltiplos sem resíduos', async () => {
    await expectError(await request('/upload', { method: 'POST', body: new FormData() }),
      400, 'FILE_REQUIRED');
    await expectError(await request('/upload', {
      method: 'POST', body: fileForm('dados', 'teste.txt', 'other'),
    }), 400, 'INVALID_UPLOAD');
    const multiple = fileForm();
    multiple.append('file', new Blob(['segundo']), 'outro.txt');
    await expectError(await request('/upload', { method: 'POST', body: multiple }),
      400, 'INVALID_UPLOAD');
    assert.deepStrictEqual(await fs.readdir(process.env.STORAGE_DIR), [storedFilename]);
  });

  await t.test('rejeita multipart malformado com erro estruturado', async () => {
    await expectError(await request('/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data' },
      body: 'inválido',
    }), 400, 'INVALID_UPLOAD');
    await expectError(await request('/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data; boundary=dms-boundary' },
      body: '--dms-boundary\r\nContent-Disposition: form-data; name="file"; filename="partial.txt"\r\n'
        + 'Content-Type: text/plain\r\n\r\nparcial',
    }), 400, 'INVALID_UPLOAD');
    assert.deepStrictEqual(await fs.readdir(process.env.STORAGE_DIR), [storedFilename]);
  });

  await t.test('aplica limite de bytes e remove arquivos parciais', async () => {
    await expectError(await request('/upload', {
      method: 'POST', body: fileForm('a'.repeat(65)),
    }), 413, 'FILE_TOO_LARGE');
    assert.deepStrictEqual(await fs.readdir(process.env.STORAGE_DIR), [storedFilename]);
    const response = await request('/upload', {
      method: 'POST', body: fileForm('a'.repeat(64)),
    });
    assert.strictEqual(response.status, 201);
    const result = await response.json();
    assert.strictEqual(result.document.size, 64);
  });

  await t.test('valida identificador e trata documento inexistente', async () => {
    await expectError(await request('/documents/invalido/download'), 400, 'INVALID_DOCUMENT_ID');
    await expectError(await request(`/documents/${randomUUID()}/download`),
      404, 'DOCUMENT_NOT_FOUND');
  });

  await t.test('trata arquivo ausente sem revelar caminho local', async () => {
    await fs.unlink(path.join(process.env.STORAGE_DIR, storedFilename));
    await expectError(await request(`/documents/${document.id}/download`),
      404, 'DOCUMENT_NOT_FOUND');
  });

  await t.test('trata falha de leitura com erro JSON e registro interno', async (subtest) => {
    const loggedErrors = [];
    subtest.mock.method(console, 'error', (...args) => loggedErrors.push(args));
    await fs.mkdir(path.join(process.env.STORAGE_DIR, storedFilename));
    await expectError(await request(`/documents/${document.id}/download`),
      500, 'INTERNAL_ERROR');
    assert.strictEqual(loggedErrors.length, 1);
  });

  await t.test('remove arquivo quando persistência de metadados falha', async (subtest) => {
    const filesBefore = await fs.readdir(process.env.STORAGE_DIR);
    const loggedErrors = [];
    subtest.mock.method(console, 'error', (...args) => loggedErrors.push(args));
    subtest.mock.method(repository, 'save', () => { throw new Error('Falha simulada'); });
    await expectError(await request('/upload', { method: 'POST', body: fileForm() }),
      500, 'INTERNAL_ERROR');
    assert.deepStrictEqual(await fs.readdir(process.env.STORAGE_DIR), filesBefore);
    assert.strictEqual(loggedErrors.length, 1);
  });

  await t.test('trata erro de gravação sem expor detalhes internos', async (subtest) => {
    const loggedErrors = [];
    subtest.mock.method(console, 'error', (...args) => loggedErrors.push(args));
    const files = await fs.readdir(process.env.STORAGE_DIR);
    await fs.rename(process.env.STORAGE_DIR, path.join(directory, 'saved-storage'));
    await fs.writeFile(process.env.STORAGE_DIR, 'diretório indisponível');
    await expectError(await request('/upload', { method: 'POST', body: fileForm() }),
      500, 'INTERNAL_ERROR');
    assert.strictEqual(loggedErrors.length, 1);
    assert.deepStrictEqual(await fs.readdir(path.join(directory, 'saved-storage')), files);
  });
});
