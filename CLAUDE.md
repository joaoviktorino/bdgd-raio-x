# CLAUDE.md

Instruções para o Claude Code neste repositório.

## Regras de trabalho

- **Estou aprendendo Git, Python e dados geográficos.** Explique cada comando antes de rodar: o que ele faz, por que é necessário e o que muda.
- **Não adicione funcionalidades que não pedi.** Se achar que algo seria útil, proponha e espere minha aprovação antes de implementar.
- **Fluxo de Git:**
  - Todo trabalho é feito num branch ligado a uma issue (ex.: branch `explorar-bdgd` ↔ issue #1).
  - Nada é commitado direto no `main`. Mudanças entram no `main` só por Pull Request, que eu reviso.
  - A descrição do PR deve referenciar a issue (ex.: `Closes #1`).
- **Nunca coloque no repositório:**
  - Dados brutos (arquivos `.gdb`, `.zip` da BDGD, extrações completas).
  - Senhas, tokens, chaves de API ou qualquer credencial.

## Contexto do projeto

O projeto usa a **BDGD (Base de Dados Geográfica da Distribuidora)** da ANEEL, regulada pelo **Módulo 10 do PRODIST**. A BDGD é publicada como File Geodatabase (`.gdb`), com camadas geográficas (rede, transformadores, subestações) e tabelas (unidades consumidoras etc.).

### Fase 1: raio-x da rede de uma distribuidora pequena
- Subestações
- Alimentadores
- Km de rede
- Transformadores
- Consumidores por alimentador

### Fase 2: geração distribuída (GD)
- GD conectada por transformador e por alimentador
- Comparação com a capacidade (ex.: potência instalada do transformador)

## Privacidade

Dados de unidades consumidoras **só podem aparecer agregados**: por alimentador, transformador ou município. **Nunca por consumidor individual**, em tabelas, mapas, gráficos, logs ou arquivos commitados.

## Licença dos dados

Os dados da BDGD são licenciados sob **ODbL (Open Database License)**. Todo produto derivado (tabelas, mapas, relatórios) deve **citar a ANEEL como fonte**.
