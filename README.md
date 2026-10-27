# Document Management System com GitHub Copilot

<img src="https://octodex.github.com/images/Professortocat_v2.png" align="right" height="200px" />

Hey KleberASGC!

Mona here. I'm done preparing your exercise. Hope you enjoy! 💚

Remember, it's self-paced so feel free to take a break! ☕️

[![](https://img.shields.io/badge/Go%20to%20Exercise-%E2%86%92-1f883d?style=for-the-badge&logo=github&labelColor=197935)](https://github.com/treinamentos-serpro/document-management-system-kleber-curvelo/issues/1)

---

## Backend DMS

Com Node.js 22 ou superior:

```sh
cd backend
npm install
npm start
# Em outro terminal:
npm test
```

O backend usa as camadas `routes -> controllers -> services -> repositories`.
Os arquivos ficam no filesystem local, via Multer `diskStorage`, e os metadados
permanecem em memória. Reiniciar o processo perde a listagem, mas não remove
os arquivos do disco.

| Variável | Padrão | Finalidade |
| --- | --- | --- |
| `PORT` | `3000` | Porta HTTP |
| `STORAGE_DIR` | `backend/storage` | Diretório local, criado automaticamente; caminhos relativos usam o diretório de execução |
| `MAX_FILE_SIZE_BYTES` | `10485760` | Tamanho máximo de cada arquivo (10 MiB) |

As rotas de documentos exigem `X-User-Id` não vazio, com até 128 caracteres:

```sh
curl -H 'X-User-Id: usuario-123' -F 'file=@documento.pdf' http://localhost:3000/upload
curl -H 'X-User-Id: usuario-123' http://localhost:3000/documents
curl -H 'X-User-Id: usuario-123' -OJ http://localhost:3000/documents/UUID/download
curl http://localhost:3000/health
```

O upload aceita exatamente um arquivo no campo `file` e retorna `201` com
`{ "document": { ... } }`. A listagem retorna `{ "documents": [...] }`, filtrada
por proprietário. O download retorna o conteúdo como anexo; documentos de outro
proprietário ou ausentes retornam `404`. Erros seguem o formato
`{ "error": { "code": "...", "message": "..." } }`.

**Atenção:** `X-User-Id` é apenas uma identidade de desenvolvimento, não
autenticação. Não exponha este MVP a usuários não confiáveis.
Consulte os contratos completos na [especificação](docs/specs/dms-spec.md).

&copy; 2025 GitHub &bull; [Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/code_of_conduct.md) &bull; [MIT License](https://gh.io/mit)
