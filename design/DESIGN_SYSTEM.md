# MED-PC Analyzer — Design System

Nome do produto: Behavio
Versão inicial: 0.1

## 1. Conceito

O Behavio é um aplicativo de análise de experimentos do MED-PC voltado para pesquisadores, professores e estudantes de comportamento animal.

A interface deve transmitir:
- simplicidade
- precisão científica
- organização
- modernidade
- confiabilidade

A identidade usa referências sutis a ratos de laboratório, timelines e experimentos comportamentais, sem cair em caricatura.

---

## 2. Logo

Conceito:
- wordmark "Behavio" em fonte sem serifa geométrica.
- marcador gráfico: perfil minimalista de rato de laboratório, criado com poucos traços.
- ausência de rosto, olhos, bigodes exagerados ou elementos infantis.
- funciona isolado como ícone/app mark.

Variantes:
- primária: sobre fundo claro.
- inversa: sobre fundo escuro.
- monocromática: 100% preto ou 100% branco.

Assets em `.design/`:
- `.design/logo-behavio.svg`
- `.design/app-icon.svg`
- `.design/favicon.svg`

---

## 3. Ícone

Conceito:
- rato em perfil sobre uma linha de timeline.
- silhueta simples, sem expressão.
- pontos pequenos ao lado sugerem eventos.
- funciona em 16px e acima.

Uso:
- favicon
- app icon
- splash screen
- toolbar
- empty states

---

## 4. Cores

### 4.1 Base

| Token | Cor | Uso |
|--------|------|-----|
| `primary` | `#6366f1` | ações principais, links, foco |
| `primary-soft` | `#6366f1` com opacidade reduzida | fundos suaves, chips |
| `secondary` | `#0f172a` | textos, títulos, superfícies fortes |
| `success` | `#10b981` | conclusões, validações |
| `warning` | `#f59e0b` | atenção, identificação pendente |
| `error` | `#ef4444` | erros, inconsistências |
| `background` | `#f8fafc` | fundo geral |
| `surface` | `#ffffff` | cards, painéis, modais |
| `border` | `#e2e8f0` | divisores e bordas |

### 4.2 Semântica comportamental

| Token | Cor | Significado |
|--------|------|-------------|
| `semantic-response` | `#6366f1` | respostas |
| `semantic-reinforcement` | `#10b981` | reforços |
| `semantic-stimulus` | `#f59e0b` | estímulos |
| `semantic-state` | `#0ea5e9` | estados |
| `semantic-other` | `#94a3b8` | outros |

Regras:
- usar cor semântica em badges, chips, timeline e gráficos.
- priorizar clareza antes de variedade cromática.

---

## 5. Tipografia

Fontes:
- principal: Inter
- números: Inter
- monoespaçada: JetBrains Mono

Estilos:
- display: 32px, peso 700
- heading: 22px, peso 600
- body: 16px, peso 400
- caption: 12px, peso 500, uppercase, tracking amplo

Regras:
- usar `tabular-nums` para tabelas e estatísticas.
- usar monoespaçada para timestamps e códigos.
- evitarWeight excessivo em tela; hierarquia por tamanho e cor, não só negrito.

---

## 6. Componentes

### 6.1 Button
- variações: primary, secondary, ghost
- altura compacta, padding horizontal generoso
- estados: default, hover, active, disabled, loading
- foco acessível com anel primary

### 6.2 Input
- borda sutil, fundo surface
- foco com anel primary
- estados: default, error, disabled
- suporte a ícone à esquerda ou direita

### 6.3 Select
- mesma linguagem do input
- chevron à direita
- hover e foco consistentes

### 6.4 Card
- superfície clara, sombra leve, borda sutil
- padding generoso
- pode ter header, body e footer
- hover sutil em cards clicáveis

### 6.5 Badge
- tamanho pequeno, fonte caption
- usa cores semânticas
- versão outline e preenchida

### 6.6 Modal
- backdrop translúcido
- largura responsiva controlada
- fechamento por ESC, botão e clique fora

### 6.7 Table
- linhas separadas por borda ou espaçamento
- hover por linha
- números alinhados à direita
- estado vazio discreto

### 6.8 Timeline
- linha base fina
- pontos coloridos por code/categoria
- tooltip em hover
- scroll horizontal
- zoom por faixa de tempo

### 6.9 Sidebar
- largura fixa ou colapsável
- itens com ícone + label
- item ativo com fundo brand

### 6.10 Navbar
- altura compacta
- logo à esquerda
- ações à direita
- divisor sutil

### 6.11 Upload Area
- borda tracejada ou pontilhada
- hover com borda primary
- estados: idle, drag-over, success, error
- feedback textual curto

### 6.12 Statistic Card
- caption para título
- heading para valor
- métrica secundária em body
- cor semântica opcional em topo

### 6.13 Tooltip
- fundo escuro, texto claro
- pequeno, padding reduzido
- animação rápida de entrada/saída

---

## 7. Dashboard

Estrutura principal:

| Zona | Conteúdo |
|------|----------|
| Header | nome do experimento, data, status, ações |
| Stats | 4 statistic cards |
| Esquerda | tabela de eventos |
| Centro | timeline |
| Direita | análises e notas |
| Rodapé | gráfico de frequência |

Comportamento:
- manter legibilidade como prioridade.
- usar cor para informação, não decoração.
- respeitar espaços amplos.

---

## 8. Tokens Tailwind

Spacing:
- 1: 4px
- 2: 8px
- 3: 12px
- 4: 16px
- 6: 24px
- 8: 32px

Radius:
- sm: 6px
- md: 10px
- lg: 16px
- full: 9999px

Shadows:
- sm: 0 1px 2px rgba(15,23,42,0.04)
- md: 0 4px 12px rgba(15,23,42,0.06)
- lg: 0 12px 40px rgba(15,23,42,0.10)

Motion:
- transition-fast: 120ms
- transition-base: 180ms
- transition-slow: 260ms
- easing: `cubic-bezier(0.2, 0, 0, 1)`

Tipografia:
- font-sans: Inter
- font-mono: JetBrains Mono
- tracking-tight: -0.02em
- tracking-wide: 0.08em
- leading-snug: 1.35
- leading-normal: 1.55

---

## 9. Estilo de referência

- Linear: precisão e contraste limpo
- Notion: leiturabilidade e respiro visual
- Arc: superfícies suaves e sofisticação discreta
- Figma: atenção aos estados e hierarquia

---

## 10. Próximos passos

- validar cores e tipografia com o usuário
- criar componentes React em `src/components/ui`
- alinhar tokens no `tailwind.config.js`
- montar página de apresentação do design system
