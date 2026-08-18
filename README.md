# Blaze System

Bot Discord modular para atendimento, vendas e gerenciamento de produtos licenciados para servidores.

O projeto foi desenvolvido em TypeScript com Discord.js e utiliza componentes interativos do Discord para oferecer uma operacao centralizada de tickets, suporte, pagamentos via PIX e ativacao de licencas.

## Funcionalidades

### Atendimento e tickets

- Abertura de tickets por categoria: suporte, compras, parcerias e bugs.
- Atribuicao de tickets a membros da equipe.
- Adicao, remocao e notificacao de participantes.
- Chamada de voz temporaria dentro do ticket.
- Encerramento, transcript e estatisticas de atendimento.
- Avaliacao do atendimento com nota e comentario.
- Configuracao de cargo, categoria e canal de transcript pelo Discord.

### Loja e licenciamento

- Geracao manual de cobrancas PIX pelo Mercado Pago.
- Suporte a ambiente sandbox e producao.
- Ativacao manual de licencas do Bot de Torcida.
- Remocao manual de licencas.
- Integracao com a API de licenciamento por HTTP.
- Apresentacao comercial do produto diretamente pelo Discord.

### Administracao

- Comandos administrativos protegidos pela permissao `Administrator`.
- Publicacao de anuncios com titulo, mensagem, imagem e mencao temporaria de `@everyone`.
- Contador e comando de diagnostico (`ping`).
- Presenca rotativa com informacoes do bot.

## Requisitos

- Node.js 20.12 ou superior.
- npm.
- Um aplicativo de bot criado no [Discord Developer Portal](https://discord.com/developers/applications).
- PostgreSQL para os dados de planos, licencas, assinaturas e pagamentos.
- Um banco SQLite local para os dados auxiliares de tickets.

## Instalacao

```bash
git clone <URL_DO_REPOSITORIO>
cd blazev2
npm install
```

Copie o arquivo de exemplo para o ambiente local:

```bash
cp .env.example .env
```

No Windows PowerShell, use:

```powershell
Copy-Item .env.example .env
```

Preencha as variaveis obrigatorias antes de iniciar o bot.

## Variaveis de ambiente

| Variavel                           | Obrigatoria     | Finalidade                                                        |
| ---------------------------------- | --------------- | ----------------------------------------------------------------- |
| `BOT_TOKEN`                        | Sim             | Token do bot Discord.                                             |
| `DATABASE_URL`                     | Sim para Prisma | URL de conexao do PostgreSQL.                                     |
| `DIRECT_URL`                       | Recomendada     | Conexao direta usada pelo Prisma em ambientes com pooler.         |
| `MP_ACCESS_TOKEN`                  | Para PIX        | Token do Mercado Pago. Use credencial `TEST-` somente no sandbox. |
| `MP_SANDBOX`                       | Nao             | Use `true` para operar no ambiente de testes.                     |
| `MP_TEST_PAYER_EMAIL`              | Sandbox         | E-mail de comprador de teste do Mercado Pago.                     |
| `URL_BOT_TORCIDA`                  | Para licencas   | URL base da API do Bot de Torcida.                                |
| `LICENSE_ACTIVATION_WEBHOOK_URL`   | Alternativa     | URL da API de ativacao quando `URL_BOT_TORCIDA` nao for usada.    |
| `LICENSE_ACTIVATION_WEBHOOK_TOKEN` | Para licencas   | Token Bearer da API de licenciamento.                             |
| `WEBHOOK_PORT`                     | Nao             | Porta do servidor de webhooks, quando habilitado.                 |
| `WEBHOOK_BASE_URL`                 | Nao             | URL publica usada para callbacks de webhook.                      |
| `WEBHOOK_LOGS_URL`                 | Nao             | Webhook opcional para logs.                                       |
| `GUILD_ID`                         | Nao             | Servidor usado em configuracoes especificas do ambiente.          |
| `LOJA_SALES_LOG_CHANNELS`          | Nao             | Canais destinados aos logs de vendas.                             |

Nunca versione `.env` ou tokens reais. O arquivo `.env.example` deve conter apenas valores ficticios.

> **Nota:** o codigo usa `MP_ACCESS_TOKEN` para chamar o Mercado Pago. Se o seu `.env.example` ainda estiver usando apenas `MP_TEST_ACCESS_TOKEN`, renomeie essa variavel para `MP_ACCESS_TOKEN` no ambiente local.

## Banco de dados

O Prisma usa PostgreSQL. Depois de configurar `DATABASE_URL`, aplique as migrations:

```bash
npx prisma migrate deploy
npx prisma generate
```

Durante o desenvolvimento, novas migrations podem ser criadas com:

```bash
npx prisma migrate dev --name nome_da_migration
```

Os dados auxiliares dos tickets sao mantidos em arquivos SQLite locais dentro de `data/`. Esses arquivos nao devem ser enviados ao repositorio.

## Execucao

| Comando             | Descricao                                          |
| ------------------- | -------------------------------------------------- |
| `npm run dev`       | Executa em desenvolvimento usando `.env`.          |
| `npm run dev:dev`   | Executa usando `.env.dev`.                         |
| `npm run watch`     | Executa com reinicio automatico usando `.env`.     |
| `npm run watch:dev` | Executa com reinicio automatico usando `.env.dev`. |
| `npm run check`     | Executa a verificacao de tipos do TypeScript.      |
| `npm run build`     | Compila `src/` para `build/`.                      |
| `npm start`         | Inicia a versao compilada usando `.env`.           |
| `npm run start:dev` | Inicia a versao compilada usando `.env.dev`.       |

Fluxo recomendado para producao:

```bash
npm ci
npx prisma migrate deploy
npm run check
npm run build
npm start
```

## Comandos do Discord

### Publicos

- `/ping`
- `/counter`

### Tickets

- `/configurar-bot`
- `/enviar-painel`
- `/ticket-config`
- `/ticket-stats`

### Loja e Torcida

- `/gerar-pix`
- `/ativar-torcida`
- `/remover-torcida`
- `/torcida-apresentar`

### Blaze

- `/anuncio`

Os comandos administrativos exigem permissao de administrador no servidor.

## Estrutura do projeto

```text
src/
	discord/          Comandos, eventos e responders do Discord
	functions/        Funcoes compartilhadas e emojis
	lib/              Clientes e integracoes de infraestrutura
	services/         Regras de negocio de loja e tickets
	server/            Servicos HTTP e webhooks
	utils/             Builders de paineis, transcripts e formatadores
	types/             Tipos compartilhados
prisma/
	schema.prisma     Modelo PostgreSQL e migrations
build/              Saida gerada pela compilacao
data/               Bancos SQLite locais
```

## Seguranca e operacao

- Mantenha tokens, credenciais e URLs privadas somente em variaveis de ambiente.
- Use `MP_SANDBOX=true` com uma credencial `TEST-` durante os testes.
- Em producao, use uma credencial de producao do Mercado Pago (`APP_USR-`).
- Restrinja as permissoes do bot ao necessario no servidor.
- Faca backup dos bancos e valide as migrations antes de cada deploy.
- Nao publique os arquivos gerados em `build/` nem os bancos locais em `data/`.

## Licenca

Defina aqui a licenca de distribuicao do projeto antes de publica-lo. Se o codigo nao for open source, informe explicitamente os termos de uso e redistribuicao.
