# Backup e restauração do banco escolar

O banco de produção é SQLite e usa `EDUSAAS_SQLITE_PATH`. O processo de
backup é executado pelo próprio serviço da API:

- um backup é criado e restaurado em uma cópia isolada antes de a API aceitar
  requisições;
- novos backups são criados a cada 6 horas;
- a retenção padrão é de 14 dias, com no máximo quatro cópias por dia;
- cada cópia passa por `PRAGMA integrity_check` e `PRAGMA foreign_key_check`;
- o endpoint `/api/healthz` responde `status: "degraded"` após uma falha de
  backup, permitindo monitoramento externo.

O backup é feito com o mecanismo online do SQLite, portanto não é uma simples
cópia potencialmente inconsistente do arquivo em uso. A restauração automática
usa um arquivo temporário dentro do diretório de backups e o remove depois da
validação.

## Configuração

As variáveis de produção são configuradas no serviço da API:

| Variável | Padrão | Uso |
| --- | --- | --- |
| `EDUSAAS_SQLITE_PATH` | obrigatório em produção | Caminho do banco ativo |
| `EDUSAAS_SQLITE_BACKUP_DIR` | `<diretório-do-banco>/backups` | Diretório de cópias |
| `EDUSAAS_SQLITE_BACKUP_INTERVAL_HOURS` | `6` | Intervalo entre cópias |
| `EDUSAAS_SQLITE_BACKUP_RETENTION_DAYS` | `14` | Janela de retenção |

O processo não inicia em produção se o caminho configurado não existir, não
for um arquivo regular, ou se a primeira cópia não puder ser criada e
restaurada. Isso evita operar com um banco diferente por engano e evita que
uma falha de backup fique silenciosa.

## Operação manual

Criar uma cópia agora (o restore isolado também é testado):

```bash
pnpm --filter @workspace/api-server run backup
```

Restaurar uma cópia para um arquivo novo, sem sobrescrever nada:

```bash
pnpm --filter @workspace/api-server run restore -- \
  artifacts/api-server/backups/edusaas-<timestamp>.sqlite \
  /tmp/edusaas-restore.sqlite
```

Após a restauração verificada, o arquivo deve ser revisado antes de qualquer
troca do banco ativo. O comando falha se o destino já existir.

## Monitoramento e resposta a incidentes

1. Monitore `/api/healthz` e alerte quando `status` deixar de ser `ok`.
2. Consulte os logs pela mensagem `SQLite backup failed` ou
   `SQLite backup created and restore verified`.
3. Não apague a cópia mais recente durante a investigação.
4. Se for necessário recuperar dados, restaure primeiro para um caminho
   isolado, valide a aplicação e só então faça a troca controlada do arquivo
   ativo.
5. Se o armazenamento de backups estiver indisponível, mantenha a API parada
   até corrigir o caminho/permissão; não habilite seed demo em produção.

O seed automático existe somente no ambiente de desenvolvimento. Em produção
ele não é chamado e também falha explicitamente se for invocado por engano.