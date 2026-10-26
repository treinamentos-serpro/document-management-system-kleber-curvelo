# Especificação - Document Management System

## 1. Objetivo

Disponibilizar uma aplicação web para que usuários enviem, consultem e baixem seus documentos, com arquivos no filesystem local e metadados mantidos em memória nesta fase do projeto.

## 2. Escopo

### Dentro do escopo

- Upload de um documento por requisição.
- Listagem dos documentos pertencentes ao usuário informado na requisição.
- Download de um documento pelo identificador, somente quando pertencer ao usuário da requisição.
- Interface web para upload, listagem, atualização da listagem e download.
- Validação de entrada, feedback de carregamento, estado vazio e apresentação de erros.
- Armazenamento dos arquivos localmente com Multer e `diskStorage`.
- Persistência em memória dos metadados enquanto o processo do backend estiver ativo.

### Fora do escopo

- Provedores de armazenamento externos ou em nuvem.
- Banco de dados ou persistência durável de metadados.
- Versionamento, edição ou compartilhamento de documentos.
- Cadastro, autenticação e gerenciamento de credenciais de usuários.
- Exclusão de documentos e administração do armazenamento.
- Garantia de disponibilidade em múltiplas instâncias do backend.

## 3. Requisitos funcionais

| ID    | Requisito                                                                                                                    | Critério de aceite                                                                                                                  |
| ----- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| RF-01 | O usuário pode enviar um arquivo pela interface web.                                                                         | Um arquivo válido é enviado como `multipart/form-data`; a resposta apresenta os metadados criados e a listagem pode ser atualizada. |
| RF-02 | O backend valida a presença de exatamente um arquivo e o limite configurado de tamanho.                                      | Requisição sem arquivo ou acima do limite é rejeitada com erro estruturado; arquivo parcial não permanece no armazenamento.         |
| RF-03 | O sistema atribui um identificador único e registra nome original, tamanho, data de upload, tipo de conteúdo e proprietário. | A resposta de upload contém os metadados públicos, sem caminho ou nome físico interno.                                              |
| RF-04 | O usuário pode listar seus documentos pela interface e pela API.                                                             | A lista contém apenas documentos associados à identidade da requisição e pode ser vazia.                                            |
| RF-05 | O usuário pode baixar um documento listado.                                                                                  | O conteúdo binário é retornado como anexo, com nome de download derivado do nome original.                                          |
| RF-06 | O sistema não permite baixar documentos de outro proprietário.                                                               | Documento inexistente ou não pertencente ao usuário resulta em `404`, sem revelar a existência de documentos alheios.               |
| RF-07 | A interface comunica estados de carregamento, lista vazia, sucesso de upload e falha de operação.                            | Estados são apresentados sem bloquear permanentemente novas tentativas.                                                             |
| RF-08 | O backend disponibiliza uma verificação de saúde.                                                                            | `GET /health` responde `200` com `{ "status": "ok" }` quando a aplicação está operacional.                                          |

## 4. Requisitos não funcionais

| ID     | Requisito                                                                                                                                                                                       |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RNF-01 | Os arquivos enviados devem ser gravados no filesystem local via Multer com `diskStorage`, por padrão em `backend/storage`. Não usar serviços externos.                                          |
| RNF-02 | Os metadados devem permanecer em memória nesta fase; reiniciar o processo pode tornar metadados indisponíveis mesmo que arquivos ainda existam no disco.                                        |
| RNF-03 | Porta, diretório de armazenamento e limite de tamanho devem ser configuráveis por variáveis de ambiente, com defaults documentados abaixo.                                                      |
| RNF-04 | O nome físico do arquivo deve ser gerado pelo servidor, não derivado diretamente da entrada do usuário. O caminho de armazenamento nunca deve ser aceito da requisição nem exposto na resposta. |
| RNF-05 | O backend deve tratar erros de upload, leitura e gravação nos limites da aplicação, sem retornar stack trace ou caminhos locais ao cliente.                                                     |
| RNF-06 | Metadados e respostas JSON devem usar UTF-8; datas devem seguir ISO 8601 em UTC.                                                                                                                |
| RNF-07 | A configuração e as dependências devem permanecer compatíveis com Node.js, Express, Multer e React já adotados pelo projeto.                                                                    |
| RNF-08 | O MVP não deve ser exposto a usuários não confiáveis sem uma solução de autenticação confiável; o identificador de usuário por cabeçalho não constitui autenticação.                            |

## 5. Modelo de dados

### Documento

| Campo            | Tipo                  | Público | Descrição                                                                                           |
| ---------------- | --------------------- | ------- | --------------------------------------------------------------------------------------------------- |
| `id`             | string (UUID)         | Sim     | Identificador único atribuído pelo backend.                                                         |
| `originalName`   | string                | Sim     | Nome original informado no upload; usado como nome sugerido no download, com tratamento seguro.     |
| `size`           | number (inteiro)      | Sim     | Tamanho do conteúdo em bytes.                                                                       |
| `uploadedAt`     | string (ISO 8601 UTC) | Sim     | Instante em que o upload foi concluído e registrado.                                                |
| `owner`          | string                | Sim     | Identificador do usuário associado ao documento.                                                    |
| `contentType`    | string                | Sim     | Tipo MIME informado/detectado para servir o download; não é uma validação de segurança do conteúdo. |
| `storedFilename` | string                | Não     | Nome físico aleatório gerado para o arquivo dentro do diretório de armazenamento.                   |

O repositório de metadados mantém os documentos em memória, indexados por `id`. O caminho completo é derivado internamente de `STORAGE_DIR` e `storedFilename`; não é um campo recebido do cliente nem retornado pela API. O armazenamento local contém os bytes do documento. Não se promete recuperação dos metadados depois de reinicialização.

### Identidade do proprietário no MVP

Na ausência de autenticação implementada, a API recebe `X-User-Id` em cada rota que opera sobre documentos. O valor deve ser não vazio e limitado a 128 caracteres. Em ambiente de desenvolvimento, o cliente pode enviar um identificador fixo configurado localmente. Esse mecanismo serve apenas para separar dados em ambiente controlado: qualquer cliente que possa chamar a API pode falsificar o cabeçalho. Não deve ser tratado como autenticação nem usado como controle de acesso em implantação pública.

## 6. Contratos de API

As rotas abaixo são relativas ao backend. No desenvolvimento, o Vite encaminha `/api/*` ao backend e remove o prefixo `/api`; portanto, o frontend chama, por exemplo, `/api/documents`.

### Formato comum de erro

```json
{
  "error": {
    "code": "DOCUMENT_NOT_FOUND",
    "message": "Documento não encontrado."
  }
}
```

`code` é estável para tratamento pelo cliente; `message` é legível e não contém caminhos locais ou detalhes internos. O backend não retorna stack traces.

### `POST /upload`

- Finalidade: armazenar um arquivo e registrar seus metadados.
- Cabeçalho obrigatório: `X-User-Id`.
- Entrada: `multipart/form-data` com exatamente um campo de arquivo chamado `file`.
- Tamanho máximo padrão: 10 MiB (10.485.760 bytes), configurável por `MAX_FILE_SIZE_BYTES`.
- Sucesso: `201 Created`, `Content-Type: application/json`.

```json
{
  "document": {
    "id": "uuid",
    "originalName": "relatorio.pdf",
    "size": 2048,
    "uploadedAt": "2026-10-26T12:00:00.000Z",
    "owner": "usuario-123",
    "contentType": "application/pdf"
  }
}
```

- Erros: `400` (`FILE_REQUIRED`, `INVALID_UPLOAD`), `413` (`FILE_TOO_LARGE`), `500` (`INTERNAL_ERROR`). Se o registro dos metadados falhar após gravar o arquivo, o arquivo recém-gravado deve ser removido quando possível.

### `GET /documents`

- Finalidade: listar documentos do proprietário da requisição.
- Cabeçalho obrigatório: `X-User-Id`.
- Sucesso: `200 OK`; lista vazia é válida.

```json
{
  "documents": [
    {
      "id": "uuid",
      "originalName": "relatorio.pdf",
      "size": 2048,
      "uploadedAt": "2026-10-26T12:00:00.000Z",
      "owner": "usuario-123",
      "contentType": "application/pdf"
    }
  ]
}
```

- Erros: `400` (`USER_ID_REQUIRED`), `500` (`INTERNAL_ERROR`). A listagem nunca inclui `storedFilename` ou caminho físico.

### `GET /documents/:id/download`

- Finalidade: transmitir o conteúdo de um documento pertencente ao proprietário da requisição.
- Cabeçalho obrigatório: `X-User-Id`.
- Sucesso: `200 OK`, corpo binário, `Content-Disposition: attachment` com nome seguro derivado de `originalName` e `Content-Type` registrado para o documento (fallback `application/octet-stream`).
- Erros: `400` (`USER_ID_REQUIRED`, `INVALID_DOCUMENT_ID`), `404` (`DOCUMENT_NOT_FOUND`) quando o documento não existe, pertence a outro usuário ou o arquivo não está disponível, `500` (`INTERNAL_ERROR`) para falhas de leitura não recuperáveis.

### `GET /health`

- Sucesso: `200 OK`, JSON `{ "status": "ok" }`.
- Não exige identidade de usuário.

### Configuração padrão

| Variável              | Default           | Uso                                                                                                              |
| --------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------- |
| `PORT`                | `3000`            | Porta HTTP do backend.                                                                                           |
| `STORAGE_DIR`         | `backend/storage` | Diretório local para arquivos. O diretório deve existir ou ser criado pela aplicação com permissões apropriadas. |
| `MAX_FILE_SIZE_BYTES` | `10485760`        | Limite máximo de um arquivo enviado.                                                                             |

## 7. Decisões arquiteturais

### Backend

Manter a Clean Architecture simples já definida no projeto, com o fluxo de dependências `routes -> controllers -> services -> repositories`:

- `routes/`: declara caminhos, métodos e middlewares HTTP, incluindo a configuração do Multer.
- `controllers/`: lê parâmetros, cabeçalhos e arquivo recebido; chama serviços; converte resultados em respostas HTTP.
- `services/`: aplica regras de negócio, valida proprietário, coordena upload/download e trata consistência entre arquivo e metadados.
- `repositories/`: persiste arquivos no filesystem local e metadados em memória. O repositório de arquivos usa Multer com `diskStorage`; não usa provedores externos.
- `app.js`: compõe middleware, rotas e verificação de saúde; não concentra regras de negócio.

Camadas internas não devem depender de Express ou conhecer detalhes da resposta HTTP. A aplicação exporta o app para testes e só inicia o listener quando executada diretamente, conforme o seed atual.

### Frontend

Manter React com componentes funcionais e Hooks, organizado em `components/`, `pages/` e `services/`. A comunicação com o backend ocorre por `fetch` usando `/api`; o proxy de desenvolvimento já configurado remove esse prefixo. A interface deve oferecer upload, listagem e download, além de tratar respostas não-2xx e estados vazios/carregando.

### Segurança e consistência

- O nome físico do arquivo deve ser aleatório e independente de `originalName`.
- Sanitizar o nome usado em `Content-Disposition`; nunca permitir que a entrada forme um caminho.
- Aplicar o limite de bytes no Multer antes de concluir a gravação.
- Se ocorrer falha entre gravação e registro de metadados, tentar remover o arquivo parcial/orfão.
- A API não deve afirmar que valida o conteúdo real do arquivo apenas com base em extensão ou MIME enviado pelo cliente.
- Sem autenticação confiável, `X-User-Id` não oferece isolamento seguro contra clientes maliciosos. A implantação pública fica bloqueada até existir autenticação apropriada.

## 8. Plano de execução

Este plano descreve etapas futuras. Nesta entrega, somente este documento de especificação deve ser criado; não implementar nem editar arquivos de backend ou frontend.

1. Confirmar os contratos, a política de identidade do MVP e os defaults de configuração; preparar testes de comportamento para upload, listagem, download e erros.
2. Implementar a camada de repositórios para armazenamento local via Multer `diskStorage` e metadados em memória, incluindo geração de nomes físicos e compensação de falhas.
3. Implementar serviços de aplicação para upload, listagem filtrada por proprietário e obtenção segura de documento para download.
4. Implementar controllers e rotas Express para os contratos definidos, mantendo validação HTTP nos limites e regras de negócio nos serviços.
5. Construir a interface React de upload, listagem e download; integrar pelo serviço `fetch` com o prefixo `/api` e cobrir carregamento, vazio e erro.
6. Validar a integração ponta a ponta, os limites de upload, o isolamento entre proprietários, os headers de download e a verificação `/health`; registrar as limitações de reinicialização e autenticação.

## 9. Critérios de conclusão do MVP

- Upload válido grava o arquivo localmente e retorna metadados sem expor o caminho.
- Upload ausente ou acima do limite produz erro estruturado e não deixa arquivo parcial conhecido.
- Listagem retorna apenas os documentos do proprietário solicitado e funciona sem resultados.
- Download retorna os bytes corretos como anexo apenas para o proprietário; inexistência, ausência de arquivo e propriedade diferente não expõem conteúdo.
- A interface consome a API pelo proxy `/api` e apresenta estados de sucesso, carregamento, lista vazia e falha.
- Testes automatizados cobrem caminhos de sucesso e erros relevantes; a rota `/health` continua funcional.
- Nenhuma etapa do MVP depende de armazenamento remoto ou de banco de dados.
