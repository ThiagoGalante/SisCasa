# Estória: Atualizar o módulo de beneficiários conforme feedback do PO

**Sprint:** 4
**Status:** Em desenvolvimento

## Contexto
Comparando o nosso cadastro de Beneficiários com a tela de referência do sistema
legado ("Sistema de Apoio Operacional — Cadastro de Beneficiários") apresentada pelo
PO, identificamos campos ausentes. Esta estória traz o cadastro à paridade.

## Campos/recursos adicionados
| Item | Tipo | Onde |
|---|---|---|
| Bairro | escalar | coluna `BAIRRO_PES` (já existia, passou a ser usada) |
| Contato de Emergência | escalar | nova coluna `CONTATO_EMG_PES` |
| Fone de Emergência | escalar | nova coluna `FONE_EMG_PES` |
| Médico | escalar | nova coluna `MEDICO_PES` |
| Restrição Alimentar | escalar | nova coluna `RESTR_ALIM_PES` |
| Restrição Médica | escalar | nova coluna `RESTR_MED_PES` |
| Projetos | N:N | tabelas `PROJETOS` + `BENEFICIARIO_PROJETOS` |
| Foto do beneficiário | upload | bucket Storage `fotos-beneficiarios` + coluna `FOTO_URL_PES` |

## Critérios de aceitação
- [ ] Cadastrar/editar beneficiário com todos os novos campos e persistir corretamente.
- [ ] Selecionar 0..N projetos por beneficiário (grade), salvar e reexibir na edição.
- [ ] Enviar foto (PNG/JPG/WebP, até 5 MB) e exibi-la na lista (detalhes).
- [ ] Tela de detalhes mostra todos os novos campos.
- [ ] Apenas `admin` pode cadastrar/editar (regra existente mantida).

## Arquivos alterados
- `supabase/migrations/20260601000001_beneficiarios_feedback_po.sql` (novo)
- `supabase/config.toml` (bucket `fotos-beneficiarios`)
- `server/index.js` (POST/GET/GET:id/PUT de `/api/beneficiarios` + lookup `/api/projetos`)
- `client/src/components/FormularioBeneficiarios.js` (campos, projetos, upload de foto)
- `client/src/components/ListaBeneficiarios.js` (detalhes com novos campos)

## Como aplicar/testar
1. Recriar o banco com a migration: `supabase db reset` (ou `supabase start` em ambiente limpo).
2. `cd server && npm run dev` e `cd client && npm start`.
3. Login como admin → Beneficiários → Adicionar Novo → preencher novos campos,
   marcar projetos, enviar foto → Salvar.
4. Abrir o beneficiário na lista e validar os dados/foto nos detalhes.

## Dívida técnica conhecida (fora do escopo desta estória)
- Os endpoints de beneficiários vivem em `server/index.js` (servidor real), enquanto os
  testes importam `server/app.js`, que é uma versão divergente. Os testes **não** cobrem
  estes novos campos. Recomenda-se consolidar `app.js`/`index.js` numa próxima estória.
