---
name: Prospect Hunter
description: Aplicacao operacional de prospeccao, qualificacao e CRM para agencias.
colors:
  brand-clay: "#a04b2c"
  brand-clay-dark: "#7a3420"
  app-bg: "#f4eadf"
  surface-warm: "#fffaf5"
  ink: "#231815"
  ink-muted: "#655248"
  ink-faint: "#7a6b62"
  sidebar-dark: "#1c1410"
  success-panel: "#243b30"
typography:
  display:
    fontFamily: "Space Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.03em"
  body:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    letterSpacing: "0.12em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  panel: "20px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface-warm}"
    rounded: "{rounded.lg}"
    padding: "12px 20px"
  button-accent:
    backgroundColor: "{colors.brand-clay}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  card:
    backgroundColor: "#ffffff"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "24px"
  input:
    backgroundColor: "{colors.surface-warm}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "10px 16px"
---

# Design System: Prospect Hunter

## 1. Overview

**Creative North Star: "Mesa de Operacao Comercial"**

Prospect Hunter deve parecer uma mesa de operacao clara, confiavel e pronta para trabalho diario. A interface atual usa uma base quente, com fundo `#f4eadf`, paineis brancos e um sidebar escuro. Essa direcao combina com uma ferramenta pequena e humana, mas precisa ser disciplinada para nao virar uma colecao de cards arredondados demais.

O produto e uma aplicacao, nao uma landing page. A qualidade visual vem de consistencia, densidade controlada, hierarquia de acao e estados bem resolvidos. Cada tela deve responder: o que esta acontecendo, o que merece atencao e qual acao vem depois.

**Key Characteristics:**

- Paleta quente e contida, com argila como acento funcional.
- Sidebar escuro como ancora de navegacao.
- Paineis claros, densos e legiveis.
- Pouca decoracao, muita clareza operacional.
- Estados de erro, sucesso, vazio e carregamento sempre explicitos.

## 2. Colors

A paleta e quente, terrosa e profissional. O acento argila deve aparecer em selecao, foco, acoes importantes e indicadores, nao como decoracao repetida.

### Primary

- **Argila Operacional** (`#a04b2c`): acao principal, estados selecionados, foco e marcadores de prioridade visual.
- **Argila Profunda** (`#7a3420`): hover, estados pressionados e contraste quando o acento principal ficar leve demais.

### Secondary

- **Painel Noturno** (`#1c1410`): sidebar, areas de alto contraste e paineis hero de dashboard.
- **Verde Controle** (`#243b30`): estados positivos, revisao e sinais de operacao em dia.

### Neutral

- **Fundo de Trabalho** (`#f4eadf`): fundo global da aplicacao.
- **Superficie Quente** (`#fffaf5`): inputs, areas internas e paineis suaves.
- **Tinta Principal** (`#231815`): texto principal, botoes escuros e conteudo critico.
- **Tinta Secundaria** (`#655248`): textos auxiliares com contraste suficiente.
- **Tinta Suave** (`#7a6b62`): metadados e textos menos importantes.

### Named Rules

**Regra do Acento Raro.** O argila deve guiar atencao, nao pintar a tela inteira. Use em botoes primarios, estados ativos, foco e poucos marcadores.

**Regra de Sem Azul Solto.** O Tailwind ainda define `primary: #2563EB`, mas a identidade atual nao e azul. Azul so deve aparecer quando representar um significado especifico, como email ou informacao.

## 3. Typography

**Display Font:** Space Grotesk, com fallback `ui-sans-serif`.
**Body Font:** IBM Plex Sans, com fallback `ui-sans-serif`.
**Label/Mono Font:** IBM Plex Sans.

**Character:** A combinacao comunica ferramenta moderna com leitura humana. Space Grotesk deve ser usado com moderacao em titulos; IBM Plex Sans deve carregar formularios, labels, dados e textos de apoio.

### Hierarchy

- **Display** (600, 24-32px, 1.15): nomes de telas e chamadas curtas em paineis principais.
- **Headline** (600, 20-24px, 1.2): titulos de blocos, listas e seccoes.
- **Title** (600, 16-18px, 1.3): cards, colunas, grupos de campos.
- **Body** (400-500, 14-16px, 1.5): descricoes, mensagens e conteudo de leitura.
- **Label** (600, 11-12px): labels de formulario e metadados. Evitar uppercase com tracking alto em excesso.

### Named Rules

**Regra de Produto, Nao Poster.** Nao usar tipografia fluida ou hero-scale nas telas autenticadas. O usuario esta trabalhando, nao lendo uma campanha.

## 4. Elevation

O sistema deve ser quase plano. Profundidade vem de borda leve, contraste de superficie e poucos estados de hover. Sombras grandes devem ser raras, porque a aplicacao ja tem fundo quente e muitos paineis.

### Shadow Vocabulary

- **Panel Rest** (`box-shadow: 0 1px 2px rgba(35, 24, 21, 0.04)`): paineis e cards em repouso.
- **Panel Hover** (`box-shadow: 0 8px 24px rgba(84, 55, 31, 0.10)`): apenas quando hover melhora descobribilidade de item clicavel.
- **Toast / Floating** (`box-shadow: 0 18px 48px rgba(35, 24, 21, 0.18)`): feedback flutuante e modais.

### Named Rules

**Regra Sem Card Fantasma.** Nao combinar borda fina com sombra grande em cards comuns. Escolha borda leve ou sombra curta.

## 5. Components

### Buttons

- **Shape:** raio medio, preferencialmente 12-16px. Evitar `rounded-3xl` em botoes de trabalho.
- **Primary:** fundo `#231815` ou `#a04b2c`, texto claro, label com verbo e objeto.
- **Hover / Focus:** hover sutil, foco visivel com anel argila. Nunca remover foco.
- **Disabled / Loading:** reduzir opacidade, manter label claro e indicar processamento.

### Chips

- **Style:** chips pequenos com borda e fundo suave.
- **State:** selecionado deve usar argila com contraste; inativo deve ser neutro. Evitar muitas cores sem significado.

### Cards / Containers

- **Corner Style:** paineis principais em 16-20px; cards internos em 12-16px.
- **Background:** branco para conteudo, `#fffaf5` para agrupamentos internos.
- **Shadow Strategy:** borda leve em repouso; sombra curta apenas em interacao.
- **Internal Padding:** 20-28px em paineis principais; 12-20px em cards densos.

### Inputs / Fields

- **Style:** fundo `#fffaf5`, borda leve, texto `#231815`.
- **Focus:** borda argila e anel suave.
- **Error / Disabled:** erro precisa de texto de recuperacao, nao apenas borda vermelha.

### Navigation

- **Sidebar:** fundo `#1c1410`, item ativo em argila, itens inativos em tons claros com contraste.
- **Collapsed state:** manter tooltip/title e alvo clicavel confortavel.
- **Consistency:** rotas principais devem manter a mesma hierarquia de cabecalho.

## 6. Do's and Don'ts

### Do

- Use tokens e variaveis antes de hardcoded colors quando possivel.
- Priorize legibilidade de tabela, formularios e pipeline.
- Mantenha a mesma linguagem de botoes, badges e cards em todas as telas.
- Crie estados vazios que ensinem a proxima acao.
- Teste as telas principais em desktop e mobile antes de finalizar.

### Don't

- Nao transformar a aplicacao em landing page.
- Nao adicionar gradientes decorativos, textos com gradiente ou glassmorphism.
- Nao usar `rounded-3xl` como padrao para todo painel.
- Nao espalhar uppercase com tracking alto em toda secao.
- Nao mudar APIs, banco, envs, integrações ou regras de negocio em uma melhoria grafica.
