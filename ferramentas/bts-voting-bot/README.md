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
Os agendamentos usam `probe` até os seletores e confirmações serem validados em execução real. Os resultados são independentes do computador pessoal.
