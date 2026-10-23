# bdgd-raio-x

Projeto para estudar a BDGD de uma pequena distribuidora e verificar a GD nela.

É uma plataforma web que é ao mesmo tempo **tutorial e explorador da BDGD** (Base de Dados Geográfica da Distribuidora), da ANEEL, usando o arquivo real da **Nova Palma (UHENPAL)**, com data de referência 31/12/2025. Cada número mostrado diz de qual camada e coluna veio.

Site: https://joaoviktorino.github.io/bdgd-raio-x/

## Estrutura

```
dados/brutos/        arquivos baixados (.gdb, PDF do Manual), fora do Git
dados/processados/   JSON pequenos e agregados gerados pelo pipeline, versionados
pipeline/            scripts Python que geram dados/processados/
pipeline/testes/     testes do pipeline e da trava de privacidade
site/                site em React + TypeScript + Vite
```

## Como rodar o site localmente

Precisa do [Node.js](https://nodejs.org/) (versão LTS).

```
cd site
npm ci           # instala as dependências do package-lock.json
npm run dev      # abre o site em http://localhost:5173/bdgd-raio-x/ e recarrega a cada mudança
npm run build    # gera a versão final em site/dist/
npm run preview  # mostra a versão final em http://localhost:4173/bdgd-raio-x/
```

A cada mudança no `main`, o GitHub Actions (`.github/workflows/publicar-site.yml`) gera o site e publica no GitHub Pages.

## Como rodar o pipeline

Precisa do Python 3.13 e de um ambiente virtual com as dependências do `requirements.txt`. Os arquivos brutos (o `.gdb` da Nova Palma e o PDF do Manual de Instruções da BDGD, Revisão 5) ficam em `dados/brutos/`; veja a procedência em `dados/processados/arquivo.json` e no `CLAUDE.md`.

```
python pipeline/catalogar_gdb.py          # estrutura do .gdb -> arquivo.json, catalogo.json
python pipeline/extrair_dicionario.py     # Manual da BDGD -> dicionario.json
python pipeline/checar_privacidade.py     # trava: para com erro se algum dado expuser unidade
python -m unittest discover -s pipeline/testes -v
```

## Fonte e licença dos dados

Dados: ANEEL, Base de Dados Geográfica da Distribuidora (BDGD), licença [ODbL](https://opendatacommons.org/licenses/odbl/1-0/). Dados de unidades consumidoras e geradoras aparecem só agregados, com no mínimo 3 unidades por grupo.

Referências: Módulo 10 do PRODIST e Manual de Instruções da BDGD (ANEEL).
