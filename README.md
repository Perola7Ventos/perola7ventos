# A Pérola dos Sete Ventos — resgate para GitHub

Migração de `perola7ventos.wordpress.com`, cujo acesso aos conteúdos foi bloqueado pela suspensão da plataforma em 14/11/2026.

## Material original recuperado

- 9 fascículos BTS × ARMY: PDFs individuais preservados no pacote de resgate; [DOCX editável ORIGINAL](arquivo/fontes-originais/FASCICULOS_BTS_ARMY_ARQUIVO_EDITAVEL.docx) transferido em formato binário; [PDF ORIGINAL de 36 páginas em cinco partes binárias](arquivo/fontes-originais/pdf-em-partes/) com instruções de reconstrução e SHA-256 para confirmar a integridade.
- Texto recuperado dos fascículos: [transcrição do DOCX](arquivo/fontes-editaveis/fasciculos-bts-army-transcricao-docx.txt) e [extração do PDF](arquivo/fontes-editaveis/colecao-documental-bts-army-36-paginas-texto-pdf.txt).
- 13 imagens originais da discografia e ficheiros visuais (no pacote de fontes).
- Cópias HTML de [coleção de fascículos](arquivo/versoes-visuais/previa_colecao_fasciculos_bts.html) e [menu dos Sete Ventos](arquivo/versoes-visuais/previa-menu-sete-ventos.html).
- Inventário verificado: [75 páginas](arquivo/inventario/75-paginas.json) e [81 artigos](arquivo/inventario/81-artigos.json), incluindo 65 capítulos distribuídos por quatro longfics e 16 outras publicações.

## Manuscritos

O inventário WordPress está recuperado, mas **a maioria dos textos integrais** não está disponível após a suspensão do site. **O facto de terem sido escritos pelo assistente e publicados no WordPress não garante que exista cópia externa automática.** O arquivo completo desses manuscritos só pode ser considerado recuperado após obtenção dos textos originais. Não usar resumos ou reescritas como substituição.

## GitHub Pages

A estrutura P0.0 foi substituída por um portal HTML/CSS/JS com todas as rotas inventariadas. Os manuscritos que faltam permanecem assinalados, sem versões fictícias.

## Verificação

Os ficheiros originais incluídos no ZIP de recuperação contêm um inventário SHA-256 para deteção de alterações.

## Recuperação dos manuscritos a partir das conversas

Está disponível a ferramenta [recuperar_wordpress_de_chats.py](ferramentas/recuperar_wordpress_de_chats.py). Pode procurar conteúdos originais em registos de execução incluídos numa exportação das conversas ChatGPT. A existência desses registos na exportação **não está garantida**. Não publicar a exportação completa em repositórios públicos, pois contém conversas pessoais.


## Migração estrutural de 14/11/2026

- Portal HTML/CSS/JS com sete botões navegáveis, banner V3, ornamentos e tipografia responsiva.
- **75 páginas** do inventário e **81 publicações** do inventário acessíveis por caminhos estáticos.
- Dois manuscritos recuperados integralmente a partir das conversas: [Reunião Pré-Tour: Dragões, Raízes, Ramen e… Pinguins?](ficcao/cracfics/reuniao-pre-tour-dragoes-raizes-ramen-e-pinguins/) e [A Lenda da Pérola dos Sete Ventos](a-lenda-da-perola-dos-sete-ventos/). Não foi possível comparar as versões com o WordPress suspenso. O manuscrito e a ficha da Reunião Pré-Tour estão consolidados numa única página com o título definitivo; os endereços históricos redirecionam para ela.
- O texto integral de outras páginas e artigos **continua indisponível** por suspensão do WordPress; nenhum capítulo foi inventado para preencher lacunas.
- Imagens e documentos binários previamente arquivados foram preservados, bem como o [relatório de resgate](arquivo/resgate-wordpress/estado_resgate.json).
- Sem WordPress no código de execução: o site GitHub Pages funciona apenas com HTML, CSS e JavaScript.

- A lenda inclui o prólogo, nove capítulos, epílogo e as correções PT-PT registadas; está disponível também [em Markdown editável](arquivo/fontes-editaveis/lenda-perola-sete-ventos-texto.md).

## Fascículos BTS × ARMY no GitHub Pages

A [página dos nove fascículos](warehouse-0613/bts/fasciculos/) reconstitui no navegador o PDF de 36 páginas a partir dos cinco blocos originais e verifica o SHA-256 422d8eb2576e696caf5f535a325b0f2d699c436eef0a491eced6bd0adb78149b. Não altera as páginas do documento.

## Título definitivo da crackfic

O título único é **Reunião Pré-Tour: Dragões, Raízes, Ramen e… Pinguins?**. A [página canónica](ficcao/cracfics/reuniao-pre-tour-dragoes-raizes-ramen-e-pinguins/) contém o manuscrito integral; as ligações antigas redirecionam para ela. O texto narrativo não foi reescrito.

## Estado atualizado da recuperação de ficções — 15/11/2026

- [Inventário canónico](arquivo/inventario/ficcao-canonica.json): **22 One-Shots** e **4 Longfics**.
- [Relatório verificável](arquivo/inventario/estado-recuperacao-fics.json): **7 One-Shots com manuscrito integral**, incluindo Reunião Pré-Tour e seis textos de publicações anteriores em conversa.
- **A Rua das Duas Horas**: capítulos **6–20** recuperados integralmente; capítulos **1–5** com texto original ainda indisponível.
- As restantes longfics mantêm índices históricos sem textos substitutos. Cada fic aparece numa só categoria conhecida.
- **10 One-Shots e 2 Longfics** mantidas na secção de classificação original por verificar, para evitar falsos géneros ou duplicação.
- **A Última Luz da Sala C**: GenFics, por decisão expressa da autora. **A Última Nota Antes do Amanhecer**: GenFics por não apresentar POV de fã.
- O antigo caminho `ficcao/cracfics/` encaminha agora para a categoria única `echos-of-ink/ink-fiction/one-shots/cracfics/`.
- A recuperação não é total: **15 One-Shots** e **65 capítulos de Longfics** permanecem sem manuscrito integral recuperado. Não foram reescritos para simular os originais.


## Identidade editorial definitiva (16/11/2026)

As sete áreas principais estão reorganizadas como páginas de entrada com conteúdos e destinos existentes. O arquivo [IDENTIDADE_EDITORIAL_CANONICA.json](arquivo/inventario/IDENTIDADE_EDITORIAL_CANONICA.json) fixa nomes e categorias. Manuscritos originais não devem ser trocados por resumos.
