# CLAUDE.md

Instruções para o Claude Code neste repositório.

## Regras de trabalho

- **Estou aprendendo Git, Python e dados geográficos.** Explique cada comando antes de rodar: o que ele faz, por que é necessário e o que muda.
- **Não reviso o código linha a linha.** Ao criar ou alterar código, explique em linguagem simples o que cada parte principal faz e por quê. Escolha a tecnologia que for melhor para o produto, sem se limitar ao que eu já conheço.
- **Quero explorar os arquivos `.gdb` em Python por conta própria.** Quando eu pedir, me instrua passo a passo.
- **Não adicione funcionalidades que não pedi.** Se achar que algo seria útil, proponha e espere minha aprovação antes de implementar.
- **Issues já criadas são implementadas direto**, sem parar para aprovar o plano: o escopo é o que está escrito na issue. O que sair desse escopo continua precisando de proposta e aprovação.
- **Fluxo de Git:**
  - Todo trabalho é feito num branch ligado a uma issue (ex.: branch `explorar-bdgd` ↔ issue #1).
  - Nada é commitado direto no `main`. Mudanças entram no `main` só por Pull Request, para ficarem registradas.
  - A descrição do PR deve referenciar a issue (ex.: `Closes #1`).
  - **O Claude faz o merge sozinho** depois de rodar as verificações: trava de privacidade, testes do pipeline e `npm run build` do site. Se tudo passar, usa `gh pr merge --merge --delete-branch` e atualiza o `main` local. Se algo falhar, não faz o merge e me avisa. Eu posso revisar os PRs depois, no histórico do GitHub.
- **Nunca coloque no repositório:**
  - Dados brutos (arquivos `.gdb`, `.zip` da BDGD, extrações completas).
  - Senhas, tokens, chaves de API ou qualquer credencial.

## Produto

Uma **plataforma web interativa que é ao mesmo tempo tutorial e explorador da BDGD**. Ela explica o que é a BDGD, onde baixar os arquivos, o que significa cada parte do nome do arquivo e o que cada camada e coluna guarda. E mostra, com os dados de uma distribuidora real, a rede, os consumidores (agregados) e a GD.

**Princípio central: rastreabilidade.** Todo número, tabela ou mapa mostra de onde veio: arquivo, camada, coluna(s) e o cálculo feito.

**Princípio de design: mostrar, não só explicar.** O site não pode ser uma reescrita dos manuais. Cada página começa por um elemento visual ou interativo (animação, ilustração, diagrama clicável, mapa) que mostra a ideia; o texto é curto e serve de apoio. Animações respeitam `prefers-reduced-motion` (o estado final fica sempre visível) e tudo funciona no celular. Referências: "Decifrando o arquivo" (nome em peças clicáveis, animação zip → arquivos internos → mosaico de camadas, certidão) e "O que é a BDGD" (cena interativa da rede, linha do tempo dos prazos em escala real, diagrama do SIG-R).

**Princípio de aprendizagem: a pessoa experimenta.** Cada página termina com um teste (`site/src/componentes/Quiz.tsx`): escolha, classificar e, de preferência, **estimativa** (chutar um número da Nova Palma num controle deslizante antes de ver o valor real), que faz imaginar antes de saber. Toda resposta mostra a explicação com fonte; números vêm dos JSON. Nada de quem joga é guardado fora do navegador. O plano completo está na issue #22.

Seções planejadas:
1. O que é a BDGD (regulação, portal da ANEEL, concessionária × permissionária).
2. Decifrando o arquivo (o nome do arquivo baixado, parte por parte, e a procedência: link, tamanho, SHA-256, data do download).
3. Explorador de camadas (o que é, registros, colunas com significado, ligações).
4. Como as camadas se conectam (chaves `SUB` → `CTMT` → `UNI_TR_MT` → consumidores e GD).
5. Raio-x da rede (Fase 1).
6. GD × capacidade (Fase 2).
7. Mapa (subestações, rede, transformadores; consumidores nunca como pontos).

### Fase 1: raio-x da rede de uma distribuidora pequena
Subestações, alimentadores, km de rede, transformadores e consumidores por alimentador.

### Fase 2: geração distribuída (GD)
GD conectada por transformador e por alimentador, comparada com a capacidade (ex.: potência do transformador).

## Arquitetura

```
dados brutos (dados/brutos/, fora do Git)
   → pipeline Python (geopandas + pyogrio)
   → trava de privacidade (pipeline/checar_privacidade.py)
   → dados processados pequenos e agregados (JSON/GeoJSON, versionados no Git)
   → site React (TypeScript + Vite), mapas com MapLibre GL
   → publicado como site estático (GitHub Pages)
```

- Ordem do pipeline:
  1. `pipeline/catalogar_gdb.py` → `arquivo.json` e `catalogo.json` (estrutura do `.gdb`);
  2. `pipeline/extrair_dicionario.py` → `dicionario.json` (entidades, campos e domínios do Manual, comparados com o catálogo);
  3. `pipeline/checar_privacidade.py` (trava) e `python -m unittest discover -s pipeline\testes`.
- O site só lê dados processados; nunca lê o `.gdb`.
- **Site** em `site/`, publicado em https://joaoviktorino.github.io/bdgd-raio-x/ pelo workflow `.github/workflows/publicar-site.yml` a cada push no `main`.
  - A lista de seções (menu, página inicial e páginas provisórias) fica em `site/src/secoes.ts`; a seção que ganha página própria entra em `PAGINAS_PRONTAS`, no `site/src/main.tsx`.
  - **Toda afirmação sobre a BDGD leva fonte**: `<Fonte de="modulo10" onde="item 41.2" />` (componente em `site/src/componentes/Fonte.tsx`), com as fontes cadastradas em `site/src/referencias.ts`, e `<ListaDeFontes />` no fim da página. O que for leitura nossa, e não do documento, é dito como observação.
  - Números sobre a Nova Palma são lidos dos JSON, nunca digitados no texto.
  - Estilos: `site/src/estilos.css` (moldura do site), `site/src/visual.css` (cores, formas, selos, botões, código, animações comuns) e um CSS por página ou componente. **Nomes de classe CSS valem para o site inteiro**: classes de componente levam prefixo próprio (ex.: `quiz-…`, `regua-marca`, `cena-…`) para não colidir.
  - Os JSON de `dados/processados/` são importados em `site/src/dados.ts`.
  - Endereços próprios por página (`/camadas/UNTRMT`); o `404.html` é cópia do `index.html` para o GitHub Pages abrir esses endereços diretamente.
  - Comandos (em `site/`): `npm ci`, `npm run dev`, `npm run build`, `npm run preview`.
- O `.gitignore` ignora `dados/brutos/`; `dados/processados/` é versionado.
- Scripts do pipeline usam caminhos relativos à pasta do projeto e terminam com erro (código diferente de zero) quando algo falha.

## Ambiente (Windows)

- **Python:** o do Anaconda (3.13.9), fora do PATH. O projeto usa o `.venv` criado a partir dele; rodar sempre com `.venv\Scripts\python.exe` (dependências em `requirements.txt`).
- **Node.js** 24 LTS e npm em `C:\Program Files\nodejs\`. Em terminais abertos antes da instalação, acrescentar essa pasta ao `PATH` da sessão.
- **GitHub CLI:** `C:\Program Files\GitHub CLI\gh.exe`, logado como `joaoviktorino`. O `gh issue develop --checkout` precisa rodar de dentro da pasta do repositório.
- **PowerShell 5.1** quebra texto passado a outros programas:
  - **qualquer texto com aspas duplas ou acentos vai por arquivo UTF-8**, nunca pela linha de comando: mensagem de commit (`git commit -F arquivo`), título e corpo de PR e issue (`gh ... --body-file`, e o título lido de arquivo por um script Python que chama o `gh` via `subprocess`). O PowerShell 5.1 quebra os argumentos nas aspas, inclusive em filtros `--jq`; para consultas, preferir `Invoke-RestMethod` na API do GitHub;
  - a exibição de acentos no terminal sai quebrada; para conferir textos, gravar em arquivo UTF-8 e ler.

## Distribuidora de estudo

- **Nova Palma (UHENPAL)**, código ANEEL 400, concessionária (RS).
- Arquivo: `Nova_Palma_400_2025-12-31_V11_20260823-1836.gdb.zip` (6.293.535 bytes, SHA-256 `1742CD48698F01A040AEEC50117E365D294876D9D689CB69247D555636321025`).
- Origem: portal de dados abertos da ANEEL no ArcGIS (item `e3a518b754ff42fcaf0232003c0b1e9d`).

## Referências

As explicações do produto sobre entidades, campos e códigos devem vir destes documentos, com citação, e não de memória:

- **Módulo 10 do PRODIST** (Anexo X da REN ANEEL nº 956/2021): o que a BDGD deve conter, prazos, sistema de coordenadas.
- **Manual de Instruções da BDGD** (Revisão 5, vigência 01/03/2026), disponível em https://www.gov.br/aneel/pt-br/centrais-de-conteudos/manuais-modelos-e-instrucoes/distribuicao:
  - Anexo I (p. 41–160): modelo de dados V1.1, cada entidade campo a campo.
  - Anexo II (p. 161–212): Dicionário de Dados ANEEL do SIG-R (DDA), com os códigos.
  - Anexo III (p. 213): lista de distribuidoras.

- **Lei nº 8.987/1995** (Lei das Concessões), texto compilado em https://www.planalto.gov.br/ccivil_03/leis/l8987cons.htm: definições de concessão (art. 2º, II) e permissão (art. 2º, IV; art. 40).

Os PDFs não vão para o repositório. A cópia do Manual usada pelo pipeline fica em `dados/brutos/referencias/Manual_Instrucoes_BDGD_Rev5.pdf` (SHA-256 `93D22D64D41865452CA4A95D4F6124E2029E09D2367670694F04A350C4A13459`); o `extrair_dicionario.py` para se o PDF for outro, porque as páginas citadas dependem da revisão.

O conteúdo dos Anexos I e II está em `dados/processados/dicionario.json`: 43 entidades, 1.390 campos e 44 domínios do DDA, cada item com a página do Manual. Explicações do site sobre camadas, campos e códigos saem desse arquivo.

### Fatos já confirmados nos dados e nas referências

- Sufixo de modelo no nome do arquivo: `M6` = Modelo Antigo (Módulo 6), `M10` = Modelo Novo (Módulo 10, Rev. 0), `V10` = Modelo V1.0, `V11` = Modelo V1.1 (atual). A última parte (ex.: `20260823-1836`) parece ser data e hora de geração; ainda não confirmado.
- Coordenadas em SIRGAS 2000 geográfico (EPSG:4674), conforme o item 45 do Módulo 10. `Shape_Length` está em graus: para comprimentos, usar `COMP` ou reprojetar.
- No Manual, unidades consumidoras e geradoras são entidades com geometria (ponto) e têm o campo `LGRD` (logradouro). No arquivo publicado, elas vêm como tabelas sem geometria (`UCBT_tab`, `UGBT_tab` etc.) e sem `LGRD`, mas **mantêm `CEP` e `BRR`**.
- `POT_NOM` muda de tipo conforme a entidade: em `UNTRMT` é Decimal em kVA (p. 104); em `EQTRMT` é código DDA `TPOTAPRT` (p. 126), cuja tabela traz a coluna `pot` com o valor em kVA. Sempre conferir o tipo do campo no `dicionario.json` antes de usar.
- `POT_INST` (GD) é Decimal em kW; `COMP` (rede) é Decimal em metros.
- Divergências de nome entre Manual e arquivo: em `EQTRMT`/`EQTRAT`, o Manual escreve `UN_TR_MT`/`UN_TR_AT` e o arquivo usa `UNI_TR_MT`/`UNI_TR_AT` (como todas as outras camadas). A lista completa fica em `comparacao_com_arquivo` no `dicionario.json`.
- Erros de digitação do Manual: o domínio `TCABOGEOM` aparece no título do Anexo II como `TCABOGTCEOM` (p. 176); a `SSDAT` lista `SAHPE_LENG`. O extrator corrige a sigla do domínio de forma explícita e registra em `inconsistencias_do_manual`.

## Privacidade

- Dados de unidades consumidoras e geradoras **só podem aparecer agregados**: por alimentador, transformador ou município. **Nunca por consumidor individual**, em tabelas, mapas, gráficos, logs ou arquivos commitados.
- **Grupos com menos de 3 unidades** não mostram o valor: aparecem como "menos de 3" ou são omitidos. Isso evita que um transformador com um único consumidor exponha um dado individual.
- Colunas que identificam a unidade (`COD_ID`, `PAC`, `PN_CON`, `CEP`, `BRR`, `RAMAL`) servem só para agrupar e ligar camadas. Nunca vão para os dados processados.
- Nunca ligar unidades consumidoras ou geradoras à camada `PONNOT` para obter localização em saídas.

### Convenções dos dados processados

Todo arquivo em `dados/processados/` segue estas convenções, conferidas por `pipeline/checar_privacidade.py` (termina com erro se alguma for quebrada):

1. **Sem colunas que identificam unidade:** `PAC`, `PN_CON`, `CEP`, `BRR`, `RAMAL` e também o genérico `COD_ID`. Códigos de elementos da rede ganham nomes explícitos (`alimentador`, `transformador`, `subestacao`…).
2. **Contagens de unidades** sempre em `qtd_uc` (consumidoras) e `qtd_ug` (geradoras). Valores derivados dessas unidades usam o prefixo `uc_` ou `ug_` (ex.: `ug_potencia_kw`). Se a contagem for 1 ou 2, ela vira `"menos de 3"` e os campos `uc_*`/`ug_*` da mesma linha ficam vazios (`null`). Zero é permitido.
3. **GeoJSON:** toda feição tem a propriedade `camada` (a camada da BDGD de origem). Feições de camadas de unidades consumidoras ou geradoras (`UCBT`, `UGMT_tab` etc.) são proibidas.
4. **Sem coordenadas soltas** (`lat`, `lon`, `latitude`, `longitude`…). Geometria só dentro de GeoJSON.

Testes da trava: `.venv\Scripts\python.exe -m unittest discover -s pipeline\testes -v`.

## Licença dos dados

Os dados da BDGD são licenciados sob **ODbL (Open Database License)**. Todo produto derivado (tabelas, mapas, relatórios, o site) deve **citar a ANEEL como fonte**.
