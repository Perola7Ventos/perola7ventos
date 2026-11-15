# BTS Voting Bot (Playwright)

Módulo independente, sem alterações ao HTML do BTS Voting Center.

## Estado
- Motor Playwright instalado em GitHub Actions.
- Campanhas Pop Golden em `campaigns.json`: candidato configurável por categoria.
- `probe`: abre páginas, identifica opções e botão de voto, recolhe diagnóstico.
- `vote`: seleciona candidato, confirma que ficou selecionado, tenta submeter e regista a resposta.
- Supervisão humana: seleção explícita do modo na execução manual; logs e artefactos de cada execução; o workflow pode ser desativado a qualquer momento.
- **Sem resultados inventados**: um clique só não é contabilizado como voto confirmado.

## Execução
```sh
npm install
npx playwright install chromium
npm run probe
npm run vote -- --poll=pg-group
```

### Variáveis/argumentos
- `--mode=probe|vote` (ou `MODE`)
- `--poll=all|pg-pop|pg-group|pg-song|pg-mv|pg-record` (ou `POLL`)
- `--candidate=NAME` para alterar o candidato de uma execução (com um único poll).
- `--headless=false` para inspeção visual local.

## Resultados
`artifacts/results.json`, capturas em `artifacts/`, e resumo no GitHub Actions.
Os estados possíveis são `disponivel`, `selecionado`, `submetido_nao_confirmado`, `confirmado`, `erro` e `indisponivel`.

## GitHub Actions
Executar **BTS Voting Bot** em Actions > Run workflow e selecionar modo e votação.
O agendamento executa `vote` diariamente às **08:15 UTC** nas cinco categorias Pop Golden BTS (até 10 de dezembro de 2026). Cada alteração de código executa apenas `probe`. As execuções manuais permitem `probe` ou `vote`. O workflow pode ser cancelado ou desativado em GitHub Actions. Os resultados não dependem do computador pessoal.

## Validação de 15/11/2026

- 5/5 categorias selecionadas corretamente no navegador remoto.
- 5/5 submissões efetuadas e confirmadas pela Pop Golden, com HTTP 200 em `/poll/voting` e aviso `VOTE SUBMITTED`.
- Histórico de execuções em `https://github.com/Perola7Ventos/perola7ventos/actions/workflows/bts-voting-bot.yml`.
- Fanplus e FANNSTAR ainda não estão ligados a este motor.
