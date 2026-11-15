# BTS Voting Bot (Playwright)

**Repositório:** Perola7Ventos/perola7ventos

## Organização

- **Voting Center:** `warehouse-0613/bts/votacoes/index.html`
- **Estado partilhado:** `warehouse-0613/bts/votacoes/data/status.json`
- **Comprovativos permanentes:** `warehouse-0613/bts/votacoes/certificados/<campanha>/<timestamp>.jpg` e respetivo `.json`
- **Motor:** `ferramentas/bts-voting-bot/worker.mjs`
- **Sincronização:** `ferramentas/bts-voting-bot/sync.mjs`
- **Campanhas:** `ferramentas/bts-voting-bot/campaigns.json`
- **Automação remota:** `.github/workflows/bts-voting-bot.yml`

## Horários operacionais

- Pop Golden: um ciclo diário às 08:15 UTC, com distribuição de carga de 0–11 minutos; no máximo uma tentativa registada por categoria em cada dia de Portugal.
- Shining: diagnóstico a cada duas horas (minuto 31 UTC), com distribuição operacional de 0–11 minutos. **A submissão Shining ainda não está validada**; não contar os diagnósticos como votos.
- As datas de fim são individuais. Após a data `endsAt`, a categoria não volta a ser submetida.
- O cron pode sofrer atrasos ou perdas de execução em GitHub Actions; não oferece temporização garantida.
- Candidatos não definidos: `pg-artist` (Jin / j-hope) e `shine-men` (V / Jungkook / Jimin / Jin). O motor não escolhe arbitrariamente.
- Não estão incluídos Mnet, KDOL, Fanplus nem FANNSTAR.

## Comprovativos e contagem

Só incrementamos `confirmedCount` quando a página apresenta uma **confirmação de voto** após a submissão e a respetiva imagem é capturada. O ficheiro JSON inclui campanha, candidato, data, resposta HTTP e ID da execução. Trata-se de **comprovativo técnico**, não de certificado oficial da entidade organizadora.

A execução `probe` não submete votos nem incrementa contadores.

O Voting Center lê o JSON público do ramo `main` em GitHub e apresenta contagens por campanha e ligação aos comprovativos. Não mostra votos efetuados fora deste bot.

## Operação

GitHub → Actions → BTS Voting Bot → Run workflow:
- `mode: probe` para testar
- `mode: vote` para uma submissão
- `group: all | popgolden | shining`
- `poll` para a categoria pretendida

## Testes

```bash
npm install
npm test
npx playwright install chromium
npm run probe
```

Os comprovativos são guardados em GitHub e as capturas de diagnóstico ficam também nos Artifacts durante 14 dias.

## Prazos e fontes

- Pop Golden: 10 dezembro 2026; hora específica não confirmada.
- Shining Most Handsome Kpop Idols: 30 novembro 2026, 12:00 EST.
- Shining Most Handsome Men: 31 dezembro 2026, 12:00 EST, sujeito a reconfirmação.

Consultar `campaigns.json` e os URLs oficiais para alterações.
