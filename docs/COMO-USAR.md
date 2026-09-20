# Como usar

O caminho completo, do arquivo bruto do MED-PC até a planilha exportada.

## O fluxo em três passos

1. **Abrir** — em *Análises → Nova análise*, arraste o arquivo de saída do MED-PC.
   O programa lê o cabeçalho e recolhe os eventos de todas as seções.
2. **Identificar** — cada código detectado recebe um nome, uma categoria e uma cor.
   Enquanto faltar nome em algum código, o botão de concluir fica desabilitado: é de
   propósito, um código anônimo torna ilegível tudo o que vem depois.
3. **Examinar** — a análise abre com a linha do tempo no topo, onde se define o recorte,
   e os cartões, a tabela e as análises logo abaixo, já obedecendo a ele.

Tudo acontece no seu navegador, nesta máquina. Nenhum arquivo é enviado para a internet.

## O arquivo que o programa espera

```
Start Date: 10/02/25
Subject: R12
Experiment: AUTOSHAPING
Start Time: 9:36:59
MSN: AUTOSHAPING

A:
     0:     1644.110     1650.200     1702.110
     5:     1755.200        0.000        0.000
B:
     0:     2100.110
```

- As linhas `Campo: valor` antes da primeira seção formam o **cabeçalho**: sujeito,
  experimento, data, hora de início, programa.
- `A:`, `B:`, `C:`… abrem as **seções**, que aqui são chamadas de **sessões**.
- Dentro da seção, cada número no formato `tempo.código` é um **evento**.
  Em `1644.110`, o tempo é 1644 centésimos de segundo (16,44 s) e o código é 110.

Códigos `0` são lidos junto com os demais. Costumam ser preenchimento de array, mas quem
decide ignorá-los é você, na tela de identificação.

## Identificando os eventos

Para cada código o programa mostra quantas vezes ele ocorreu e quando foi a primeira e a
última ocorrência — normalmente é o suficiente para reconhecer o que é o quê: o código
que ocorre centenas de vezes tende a ser a resposta, o que ocorre algumas dezenas tende a
ser o reforço.

Preencha o **nome**, escolha a **categoria** e ajuste a **cor**, que é a que vai aparecer
na linha do tempo. O botão *Sortear* gera uma cor distinta para códigos vizinhos, útil
quando há muitos eventos parecidos.

Para voltar a essa tela depois, use **Identificar eventos** no topo da análise.

## Escolhendo a sessão

Quando o arquivo tem mais de uma seção, aparece a barra **Sessão**, com uma opção por
seção mais `TODAS`. A escolha vale para tudo o que vem abaixo: cartões, linha do tempo,
tabela, análises e regressões passam a enxergar apenas aquela sessão.

Trocar de sessão limpa os filtros — a janela de tempo é contada a partir do início da
sessão e não teria o mesmo significado em outra.

## O painel da linha do tempo

Todo o manejo da sessão acontece em um lugar só: o painel **Linha do tempo**, logo
abaixo do seletor de sessão. Ali ficam a janela de tempo, o isolamento de eventos, o
modo de contagem e o próprio desenho da sessão — nada fica escondido atrás de um botão
de abrir, e não há um segundo lugar na página que filtre a mesma coisa.

A janela de tempo **é** o trecho desenhado. Arrastar a linha do tempo ou aproximar com
`Ctrl`/`⌘` + roda do mouse move exatamente o mesmo controle que a barra logo acima dela,
e os cartões e a tabela acompanham na hora. Não existem duas noções de "trecho visível"
para se desencontrarem.

### Janela de tempo

Recorta a sessão por tempo. A contagem começa no **primeiro evento da sessão**, não no
relógio: numa sessão de uma hora, `3:00 → 15:00` são os minutos 3 a 15 de registro.

- A **barra de dois marcadores** faz o ajuste grosso.
- Os campos **De**, **Até** e **Duração** aceitam `9` (minutos), `9.5`, `9,5` e `9:30`
  (minutos e segundos). Alterar a *Duração* mantém o início e move o fim.
- Os **atalhos de duração** (1, 3, 5, 10, 15, 20, 30, 45 e 60 min) aparecem apenas
  enquanto couberem na sessão; `sessão inteira` volta ao começo.
- **← trecho anterior** e **próximo trecho →** movem a janela inteira de uma vez. Com
  uma janela de 3 minutos, `próximo trecho →` percorre a sessão de 3 em 3 minutos — é o
  jeito rápido de comparar blocos sucessivos.
- Os botões **＋** e **－** aproximam e afastam em torno do centro da janela, e valem o
  mesmo que dar zoom com a roda do mouse sobre o desenho.
- **Arrastar o desenho** com o mouse percorre a sessão sem mudar a duração da janela.

### Eventos

Marca quais eventos interessam. A **linha do tempo passa a mostrar só os marcados**.
Sem nenhuma marcação, mostra todos.

- Clicar em um evento quando nada está marcado isola **só aquele**.
- Os botões de categoria marcam e desmarcam todos os eventos daquela categoria de uma vez.
- `Todos` volta a mostrar tudo; `Nenhum` desmarca a seleção.
- Este é o único filtro por evento e por categoria da página: a tabela abaixo não tem
  um seletor próprio para não contrariar o que está marcado aqui.
- Cada botão mostra quantas ocorrências aquele evento tem **dentro da janela atual** —
  o número muda conforme você move a janela.

### Contando

Decide o que a tabela, os cartões e as análises contabilizam:

| Modo | O que entra na conta |
| --- | --- |
| **Somente os isolados** | apenas os eventos marcados, dentro da janela |
| **Todos os eventos da janela** | tudo o que ocorreu na janela; os não marcados aparecem esmaecidos na tabela, mas contam |

Nos dois modos a linha do tempo continua isolada. É a diferença entre perguntar *quantas
respostas houve entre 9 e 12 minutos?* e *o que mais aconteceu em volta dessas respostas?*.

### O desenho

Uma faixa horizontal por categoria, com o nome e a contagem à esquerda. Categorias sem
nenhum evento continuam desenhadas, em cinza: ausência é resultado.

Clicar em um ponto destaca aquele evento na tabela e no painel do evento selecionado. A
seleção acompanha o evento: mover a janela não faz o destaque pular para outro ponto, e
se o evento sair do recorte o destaque simplesmente se desfaz.

## O restante da página

Tudo o que vem abaixo obedece ao que foi definido no painel da linha do tempo.

- **Cartões** — total por categoria, duração da sessão e taxa de eventos por minuto.
- **Evento selecionado** — o intervalo até o evento anterior e o seguinte, as
  estatísticas dos intervalos entre ocorrências daquele mesmo evento e um atalho para
  transformar aquilo em uma análise salva.
- **Eventos** — tabela ordenável. O campo *Localizar nesta tabela* apenas procura uma
  linha por nome ou código; ele não recorta a análise. A coluna `Δ` é a diferença para a
  **linha anterior visível**: com um único evento marcado, ela passa a ser o intervalo
  entre ocorrências dele.
- **Análises próprias** — tempo entre dois eventos: escolha os eventos de origem e
  destino, a direção da busca e a operação.
- **Regressão linear** — divide a sessão em blocos de tempo e ajusta um modelo sobre as
  variáveis de cada bloco.
- **Exportar** — CSV, JSON e XLSX.

## Categorias

Cada análise começa com cinco categorias — Resposta, Reforço, Estímulo, Estado e Outro —
e você pode criar quantas quiser em *Identificar eventos*.

- Escolha o nome, a cor e o símbolo. O nome não pode repetir o de outra categoria.
- Uma categoria criada vale **só naquela análise**, assim como os nomes dos eventos.
- Renomear leva junto todos os eventos que estavam nela.
- Excluir devolve esses eventos para **Outro** — o programa avisa antes quantos serão
  afetados.
- As cinco categorias prontas não podem ser renomeadas nem excluídas: são a estrutura
  fixa da linha do tempo e o destino dos eventos que ficam sem categoria.

## Análises próprias

Servem para responder "quanto tempo passa entre um evento e outro".

1. Escolha um ou mais códigos de **origem** — por exemplo, a resposta.
2. Escolha um ou mais códigos de **destino** — por exemplo, o reforço.
3. Escolha a **direção**: o próximo destino *depois* da origem (latência até o reforço)
   ou o último destino *antes* dela (tempo desde o reforço anterior).
4. Escolha a **operação**: média, mediana, desvio padrão, mínimo, máximo, soma, contagem
   ou intervalo médio.

Cada ocorrência da origem é pareada com a **primeira** ocorrência do destino naquela
direção. Origens sem destino correspondente ficam de fora do cálculo — por isso o
resultado vem sempre acompanhado do **tamanho da amostra**.

## Regressão linear

A sessão é dividida em **blocos de tempo** de largura escolhida por você, e cada bloco
vira uma observação. Para cada evento, o bloco fornece três variáveis: quantas vezes
ocorreu, a taxa por minuto e o intervalo médio entre ocorrências.

Escolha a variável dependente e um ou mais preditores. O resultado traz os coeficientes
com erro-padrão, valor de *p* e intervalo de confiança, além de R², R² ajustado e teste F.

Dois cuidados:

- O **último bloco incompleto é descartado**, para não entrar no modelo como um bloco de
  baixa taxa quando na verdade teve menos tempo.
- O **tamanho do bloco muda o resultado** e fica guardado junto do modelo. Dois modelos
  com blocos diferentes não devem ser comparados diretamente.

## Exportação

| Formato | Conteúdo |
| --- | --- |
| CSV | uma linha por evento: tempo, tempo bruto, código, nome e categoria |
| JSON | a análise inteira, com as identificações, as categorias e as análises salvas |
| XLSX | abas separadas de cabeçalho, eventos, identificações e análises próprias |

A exportação respeita os filtros ativos: o que está na tela é o que sai no arquivo.

O JSON é também a forma de **guardar uma cópia** da análise ou de levá-la para outro
computador — as análises ficam no navegador desta máquina, e limpar os dados do navegador
as apaga.
