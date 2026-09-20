# Ratnalyzer

Um programa para analisar sessões do **MED-PC** sem sair do navegador. Você abre o
arquivo da sessão, diz o que cada código significa e recebe um painel com a linha do
tempo dos eventos, as frequências, os intervalos entre respostas e os modelos que
quiser ajustar.

Nada é enviado para a internet: o arquivo é lido, analisado e guardado na sua própria
máquina.

## O que dá para fazer

### Abrir a sessão e nomear os eventos
- Leitura direta do arquivo de saída do MED-PC, com cabeçalho e todas as seções.
- Uma tela onde cada código recebe um nome, uma categoria e uma cor.
- O programa já mostra quantas vezes cada código ocorreu e quando foi a primeira e a
  última ocorrência, para ajudar a reconhecer o que é o quê.

### Organizar o seu vocabulário
- Cinco categorias prontas: Resposta, Reforço, Estímulo, Estado e Outro.
- **Categorias próprias**, com o nome, a cor e o símbolo que você quiser — por exemplo
  *Tentativa omitida*, *Entrada no comedouro* ou *Período de blackout*.
- Renomear uma categoria leva junto todos os eventos que estavam nela; excluir devolve
  esses eventos para *Outro*.

### Recortar o que interessa
- Escolha da **sessão** quando o arquivo tem mais de uma, ou todas juntas.
- **Janela de tempo livre**: qualquer trecho da sessão — do minuto 3 ao 15, do 9 ao 12,
  os últimos 10 minutos — por barra deslizante ou digitando o tempo.
- **Isolamento de eventos**: a linha do tempo mostra só os eventos que você marcar.
- **Modo de contagem**: contabilizar apenas os eventos isolados, ou também todo o resto
  que ocorreu naquele trecho.

### Examinar
- Linha do tempo com uma faixa por categoria, zoom, arraste e detalhes ao passar o mouse.
- Tabela de eventos ordenável, com busca e com a coluna de intervalo entre ocorrências.
- Cartões com o total por categoria, a duração da sessão e a taxa de eventos por minuto.
- Painel do evento selecionado: o intervalo até o evento anterior e o seguinte, e a
  distribuição dos intervalos entre ocorrências daquele mesmo evento.

### Analisar
- **Análises próprias**: tempo entre dois eventos — média, mediana, desvio padrão,
  mínimo, máximo, soma, contagem e intervalo médio — com a direção da busca à sua
  escolha (o próximo evento depois, ou o último antes).
- **Regressão linear**, simples ou múltipla, sobre blocos de tempo da sessão, com os
  coeficientes, o erro-padrão, o valor de *p*, o intervalo de confiança, o R², o R²
  ajustado e o teste F.

### Levar embora
- Planilha de eventos em CSV, arquivo completo em JSON e pasta de trabalho em XLSX.
- A exportação sai com os filtros que estiverem ativos: o que você vê é o que sai.

## Como esta documentação está organizada

| Documento | Para quê |
| --- | --- |
| **Como usar** | o caminho completo, tela a tela |
| **Regras de análise** | o que o programa garante em cada cálculo |
| **Decisões** | por que o programa se comporta assim |
