# Orlando Queue Tracker

Web app mobile-first para acompanhar tempos de espera dos principais parques de Orlando, com dados ao vivo, histórico, previsões e backend local em SQLite.

## O que já está incluído

- Seleção de 9 parques de Orlando e Tampa
- Lista de atrações ordenada da menor para a maior fila
- Atrações abertas, fechadas e indisponíveis sempre visíveis
- Busca por nome da atração ou área do parque
- Atualização automática a cada 60 segundos
- Atualização manual e horário da última consulta
- Interface responsiva em dark mode
- Dados mockados isolados em `src/data`
- Serviço de consulta isolado em `src/services/waitTimes.ts`
- Navegação com URLs compartilháveis, sem dependência de roteamento

## Desenvolvimento local

Você precisa ter o Node.js 22 ou superior instalado, pois o backend utiliza o
SQLite nativo do Node.

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Esse comando inicia:

- frontend em `http://localhost:5173`;
- backend em `http://localhost:3001`.

Para executar apenas um dos processos:

```powershell
npm run client
npm run server
```

## Build

```powershell
npm run build
```

O comando gera:

- `dist/`: frontend React;
- `dist-server/`: backend Node.js compilado.

## Produção

Em produção, frontend e backend são servidos pelo mesmo processo e domínio.

```powershell
Copy-Item .env.production.example .env.production
npm run build
npm run start
```

Acesse a porta definida em `PORT`. O exemplo de produção usa `10000`, compatível
com uma execução local semelhante ao Render.

O `VITE_STORAGE_API_URL` deve ficar vazio em produção para que o frontend use
URLs relativas como `/storage` e `/analytics`.

> Variáveis `VITE_*` são incorporadas durante o build. Refaça
> `npm run build` depois de alterá-las.

## Scripts

```text
npm run dev      Frontend e backend em modo desenvolvimento
npm run client   Apenas o Vite
npm run server   Apenas o backend TypeScript com watch
npm run build    Compila frontend e backend
npm run start    Executa o backend compilado e serve o frontend
```

## Variáveis de ambiente

### Desenvolvimento (`.env`)

```text
VITE_STORAGE_API_URL=http://localhost:3001
PORT=3001
DATABASE_PATH=server/data/orlando-queue.db
ENABLE_COLLECTOR=true
```

### Produção (`.env.production`)

```text
VITE_STORAGE_API_URL=
NODE_ENV=production
PORT=10000
DATABASE_PATH=/var/data/orlando-queue.db
ENABLE_COLLECTOR=true
```

| Variável | Uso |
| --- | --- |
| `VITE_STORAGE_API_URL` | URL pública da API usada pelo frontend. Vazia significa mesma origem. |
| `NODE_ENV` | Use `production` no serviço publicado. |
| `PORT` | Porta HTTP do Express. Padrão: `3001`. |
| `DATABASE_PATH` | Caminho absoluto ou relativo do arquivo SQLite. |
| `ENABLE_COLLECTOR` | Ativa a coleta automática de filas no backend. |

Em plataformas de deploy, configure `PORT` e `DATABASE_PATH` diretamente no
ambiente. O diretório do banco precisa ser persistente e gravável.

## Publicar no GitHub

Antes de conectar o projeto ao Render, crie um repositório vazio no GitHub e
envie o código a partir da pasta do projeto:

```powershell
git init
git add .
git commit -m "Preparar Orlando Queue Tracker para deploy"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
git push -u origin main
```

O `.gitignore` impede o envio de `node_modules`, builds, arquivos `.env` e bancos
SQLite locais. Os arquivos `.env.example` e `.env.production.example` permanecem
versionados porque contêm somente modelos de configuração.

Antes do primeiro push, confira:

```powershell
git status
```

Não envie senhas, tokens ou valores secretos. Configure esses valores diretamente
no painel do serviço de hospedagem.

## PWA e instalação

O app inclui manifest, service worker, tela offline e ícones próprios. Em
produção, o Express entrega estes arquivos no mesmo domínio:

```text
/manifest.webmanifest
/sw.js
/offline.html
/icons/icon-192.png
/icons/icon-512.png
/icons/apple-touch-icon.png
```

O service worker guarda apenas o app e arquivos estáticos. Respostas de `/api`,
`/storage`, `/analytics`, `/collector`, `/health` e `/data-quality` nunca são
armazenadas em cache.

Para instalar:

- Chrome no Android ou desktop: abra o app por HTTPS e use **Instalar app**.
- Safari no iPhone: toque em **Compartilhar** e depois em
  **Adicionar à Tela de Início**.

Service workers exigem HTTPS em produção. O domínio fornecido pelo Render já
atende esse requisito. Depois do deploy, valide a instalação e execute uma
auditoria PWA no Lighthouse do Chrome.

## Deploy no Render

O Orlando Queue Tracker deve ser publicado como um único **Web Service**. O
Express serve tanto as APIs quanto o build do Vite no mesmo domínio.

### 1. Preparar o repositório

Envie o projeto para um repositório GitHub, GitLab ou Bitbucket. Confirme
localmente antes do deploy:

```powershell
npm ci
npm run build
npm run start
```

O projeto requer Node.js 22 ou superior porque utiliza o módulo SQLite nativo do
Node.

### 2. Criar o Web Service

No [Render Dashboard](https://dashboard.render.com/):

1. Clique em **New > Web Service**.
2. Conecte o repositório do projeto.
3. Escolha **Node** como runtime.
4. Se o projeto estiver na raiz do repositório, deixe **Root Directory** vazio.
5. Escolha a região e o plano desejados.
6. Use as configurações:

```text
Build Command: npm ci && npm run build
Start Command: npm run start
Health Check Path: /health
```

O build gera o frontend em `dist/` e o backend em `dist-server/`. O comando
`start` executa o Express compilado, que entrega os arquivos do Vite e preserva
as rotas de SPA, como `/planner` e `/analytics-dashboard`.

### 3. Variáveis de ambiente

Configure em **Environment**:

```text
NODE_ENV=production
DATABASE_PATH=/var/data/orlando-queue.db
ENABLE_COLLECTOR=true
```

O Render fornece `PORT` automaticamente. O backend já lê essa variável, portanto
não fixe uma porta diferente no painel. Se precisar defini-la manualmente:

```text
PORT=10000
```

Não configure `VITE_STORAGE_API_URL`, ou deixe o valor vazio:

```text
VITE_STORAGE_API_URL=
```

Assim, o frontend usa o mesmo domínio do Express para `/storage`, `/analytics`,
`/data-quality` e `/health`.

Opcionalmente, fixe a versão do Node:

```text
NODE_VERSION=22
```

### 4. SQLite persistente

O filesystem padrão do Render é efêmero. Sem um Persistent Disk, o arquivo
SQLite será perdido em reinícios ou novos deploys.

No Web Service:

1. Abra **Disks**, ou **Advanced** durante a criação.
2. Clique em **Add Disk**.
3. Use um nome como `orlando-queue-data`.
4. Configure o mount path:

```text
/var/data
```

5. Escolha inicialmente o menor tamanho adequado.
6. Confirme que a variável aponta para um arquivo dentro do mount:

```text
DATABASE_PATH=/var/data/orlando-queue.db
```

Somente arquivos dentro de `/var/data` serão preservados. Persistent Disks estão
disponíveis para serviços pagos, ficam ligados a uma única instância e não
permitem escalar horizontalmente o serviço com esse SQLite.

O disco fica disponível em runtime, não durante o Build Command. Isso não é um
problema neste projeto, porque o banco e as migrações são criados ao executar
`npm run start`.

### 5. Fazer o deploy

Salve o Web Service e aguarde o build. Nos logs, procure mensagens semelhantes a:

```text
Orlando Queue Tracker disponível em http://localhost:PORT
SQLite: /var/data/orlando-queue.db
```

O app ficará disponível no endereço `https://seu-servico.onrender.com`.

### 6. Checklist pós-deploy

- [ ] Abrir `https://seu-servico.onrender.com/`.
- [ ] Abrir `https://seu-servico.onrender.com/planner`.
- [ ] Consultar `https://seu-servico.onrender.com/health` e confirmar
      `"status": "ok"`.
- [ ] Abrir `https://seu-servico.onrender.com/analytics-dashboard`.
- [ ] Abrir um parque e aguardar uma atualização para gerar amostras.
- [ ] Confirmar no Analytics que a quantidade de amostras aumentou.
- [ ] Verificar nos logs que o caminho do SQLite começa com `/var/data/`.
- [ ] Reiniciar o serviço pelo Render Dashboard.
- [ ] Abrir novamente o Analytics e confirmar que as amostras continuam salvas.
- [ ] Fazer um novo deploy e confirmar novamente a persistência.

Se os dados desaparecerem após reiniciar, confira se o disco está montado em
`/var/data` e se `DATABASE_PATH` aponta exatamente para
`/var/data/orlando-queue.db`.

Documentação oficial:

- [Deploy de Node/Express no Render](https://render.com/docs/deploy-node-express-app)
- [Persistent Disks no Render](https://render.com/docs/disks)

## Estrutura

```text
src/
├── components/    # Componentes reutilizáveis
├── data/          # Dados mockados dos parques e atrações
├── pages/         # Páginas principal e de detalhes do parque
├── services/      # Camada de acesso aos dados
├── types/         # Tipos TypeScript compartilhados
├── App.tsx        # Navegação e composição principal
├── main.tsx       # Entrada da aplicação
└── styles.css     # Design system e estilos responsivos

server/
├── data/           # Banco SQLite local em desenvolvimento
├── database.ts     # Inicialização e operações do banco
├── index.ts        # API Express
└── tsconfig.json
```

## Persistência

Se a API ficar temporariamente indisponível, o frontend continua usando o
armazenamento local como fallback.

```text
VITE_STORAGE_API_URL=http://localhost:3001
```

O banco é criado automaticamente em:

```text
server/data/orlando-queue.db
```

Na primeira inicialização, o backend detecta o formato antigo em JSON, migra os
dados existentes e cria o schema relacional:

```text
parks
attractions
wait_time_samples
predictions
prediction_results
```

Os endpoints continuam retornando os mesmos arrays JSON esperados pelo frontend.

## Qualidade dos dados

Cada amostra é validada no frontend e novamente no backend. Amostras aceitas
recebem `quality: VALID` ou `quality: SUSPICIOUS`. Dados inválidos são rejeitados
do histórico e registrados apenas para auditoria em `data_quality_events`.

As previsões usam somente amostras `VALID`, enquanto os analytics ignoram dados
`INVALID`.

Endpoints disponíveis:

```text
GET/PUT/DELETE /storage/waitTimeHistory
GET/PUT/DELETE /storage/predictions
GET /health
GET /analytics/overview
GET /analytics/park/:parkId
GET /analytics/attraction/:attractionId
POST /collector/run-once
GET /collector/status
```

## Coletor automático

Com `ENABLE_COLLECTOR=true`, o backend coleta as filas de todos os parques ao
iniciar e continua automaticamente:

- a cada 5 minutos em desenvolvimento;
- a cada 10 minutos quando `NODE_ENV=production`.

As amostras passam pela camada de Data Quality e são adicionadas ao SQLite sem
substituir o histórico existente. Uma execução manual pode ser disparada com:

```text
POST /collector/run-once
```
