# Regras de análise

O que o programa garante em cada cálculo. Se um número na tela surpreender, a explicação
está aqui.

## Leitura do arquivo

| # | Regra |
| --- | --- |
| L1 | As linhas no formato `Campo: valor` que vêm antes da primeira seção formam o cabeçalho da sessão — sujeito, experimento, data, hora de início, programa. |
| L2 | Uma letra sozinha seguida de dois-pontos (`A:`, `B:`…) abre uma seção. Valores escalares do MED-PC, como `E: 0.000`, ficam no cabeçalho e não abrem seção. |
| L3 | Dentro de uma seção, todo número no formato `tempo.código` vira um evento. Em `1644.110`, o tempo é 1644 e o código é 110. |
| L4 | O tempo do MED-PC vem em centésimos de segundo. O programa divide por 100 para chegar aos segundos: `1644` = 16,44 s. Essa conversão vale em todas as telas. |
| L5 | Eventos com código 0 **não são descartados** na leitura. São frequentemente preenchimento de array, mas quem decide ignorá-los é você, ao identificar os eventos. |
| L6 | Os eventos são ordenados pelo tempo. Quando dois eventos de seções diferentes caem no mesmo tempo, a ordem entre eles segue o nome da seção — assim a listagem não muda de uma abertura para outra. |
| L7 | Um arquivo sem nenhum evento numérico é recusado na importação, com uma mensagem explicando o formato esperado. |

## Sessões

| # | Regra |
| --- | --- |
| S1 | Cada seção do arquivo (`A`, `B`, `C`…) é tratada como uma **sessão**. O seletor só aparece quando há mais de uma. |
| S2 | A opção `TODAS` junta as seções em uma única linha do tempo, na ordem cronológica. |
| S3 | A **duração** de uma sessão é o tempo do último evento menos o do primeiro. O programa não usa a duração declarada no cabeçalho, que costuma não corresponder ao que de fato foi registrado. |
| S4 | Trocar de sessão limpa os filtros. A janela de tempo é contada a partir do início da sessão, e não teria o mesmo significado em outra. |

## Identificação dos eventos

| # | Regra |
| --- | --- |
| I1 | Todos os códigos precisam de nome antes de a análise abrir. Um código anônimo torna ilegível tudo o que vem depois. |
| I2 | Nome, categoria e cor pertencem **àquela análise**. Abrir outro arquivo exige identificar de novo, mesmo que seja do mesmo experimento — ver *Decisões*. |
| I3 | Um código sem identificação é tratado como categoria **Outro** e aparece como `(cód. N)`. Nenhuma tela quebra por causa disso. |

## Categorias

| # | Regra |
| --- | --- |
| C1 | As cinco categorias prontas — Resposta, Reforço, Estímulo, Estado e Outro — existem sempre e não podem ser renomeadas nem excluídas. |
| C2 | As categorias que você cria valem **apenas naquela análise**. |
| C3 | Duas categorias não podem ter o mesmo nome. A comparação ignora maiúsculas e acentos: *Omissão* e *omissao* são consideradas a mesma. |
| C4 | Renomear uma categoria atualiza, na mesma ação, todos os eventos que estavam nela. |
| C5 | Excluir uma categoria devolve os eventos dela para **Outro**. O programa avisa antes, dizendo quantos eventos serão afetados. |
| C6 | Um evento que aponte para uma categoria que não existe mais é exibido como **Outro**, sem erro. |
| C7 | A linha do tempo desenha **uma faixa para cada categoria da análise**, inclusive as vazias. O desenho não muda de forma a cada filtro, e faixa vazia é informação. |

## Filtros

| # | Regra |
| --- | --- |
| F1 | A janela de tempo é contada **a partir do primeiro evento da sessão**. Numa sessão de uma hora, "de 3 a 15 minutos" são os minutos 3 a 15 de registro, não o horário do relógio. |
| F2 | A janela inclui os dois extremos: um evento exatamente no minuto 15 entra em "até 15". |
| F3 | Sem nenhum evento marcado no isolamento, a linha do tempo mostra todos. Marcando eventos, mostra só os marcados. Desmarcar todos deixa a linha do tempo vazia — é um estado válido, e a tela avisa. |
| F4 | A **linha do tempo mostra somente os eventos isolados**, nos dois modos de contagem. |
| F4b | A janela de tempo é também o trecho desenhado na linha do tempo. Arrastar ou aproximar o desenho edita a janela, e os cartões, a tabela e as análises acompanham. |
| F4c | Filtrar por evento e por categoria acontece em um lugar só, no painel da linha do tempo. A tabela não tem seletor próprio — o campo de busca dela apenas localiza uma linha e não altera nenhuma contagem. |
| F5 | No modo *somente os isolados*, a tabela, os cartões e as análises usam só os eventos marcados que caem dentro da janela. |
| F6 | No modo *todos os eventos da janela*, tudo o que ocorreu no trecho entra nas contas; os eventos fora do isolamento aparecem esmaecidos na tabela, mas contam. |
| F7 | O evento selecionado acompanha o próprio evento, não a posição dele na lista: mover a janela não faz o destaque pular para outro ponto. Se o evento sair do recorte, o destaque se desfaz. |
| F8 | Ao trocar para uma sessão mais curta, uma janela que não cabe mais é encurtada, nunca descartada. |

## Contagens e taxas

| # | Regra |
| --- | --- |
| E1 | O gráfico de categorias mostra **todas** as categorias da análise, inclusive as zeradas, para o eixo não mudar a cada filtro. |
| E2 | A taxa de eventos por minuto é o total de eventos dividido pela duração em minutos. Com duração zero, a taxa é zero. |
| E3 | A coluna de intervalo (`Δ`) da tabela é a diferença para a **linha anterior visível**, não para o evento anterior da sessão inteira. Com um único evento marcado, essa coluna passa a ser o intervalo entre ocorrências dele — o IRT. |
| E4 | Quando não há dados suficientes para uma estatística, o programa mostra um traço, nunca um número inventado. |

## Análises próprias

| # | Regra |
| --- | --- |
| A1 | Cada ocorrência do evento de **origem** é pareada com a **primeira** ocorrência do evento de **destino** na direção escolhida: o próximo depois, ou o último antes. |
| A2 | Uma origem sem destino correspondente é **descartada** do cálculo. Contá-la como zero rebaixaria artificialmente a latência média. |
| A3 | O programa mostra sempre o **tamanho da amostra** ao lado do resultado: é o número de pares que entraram na conta. |
| A4 | Os resultados são recalculados a cada alteração da análise. Nenhum número na tela vem de um cálculo antigo. |

## Regressão linear

| # | Regra |
| --- | --- |
| R1 | A sessão é dividida em **blocos de tempo de tamanho fixo**, e cada bloco é uma observação. Um evento isolado não tem variáveis suficientes para entrar numa regressão múltipla. |
| R2 | A contagem do tempo começa no primeiro evento, a mesma origem usada para a duração e para a janela de filtro. |
| R3 | O **último bloco incompleto é descartado**. Um bloco pela metade tem menos tempo para acumular respostas, e entraria no modelo como se tivesse a mesma oportunidade dos outros. |
| R4 | Cada evento gera três variáveis por bloco: quantas vezes ocorreu, a taxa por minuto e o intervalo médio entre ocorrências. |
| R5 | O intervalo médio não existe em blocos com menos de duas ocorrências. Blocos sem alguma das variáveis escolhidas ficam de fora do ajuste, e o programa informa quantos foram. |
| R6 | O tamanho do bloco muda o resultado e por isso é guardado junto do modelo: dois modelos com blocos diferentes não são comparáveis. |

## Onde ficam os dados

| # | Regra |
| --- | --- |
| G1 | As análises ficam guardadas no seu navegador, nesta máquina. Nada é enviado para servidor nenhum. |
| G2 | Limpar os dados do navegador apaga as análises. Para guardar ou levar para outro computador, exporte em JSON. |
| G3 | Análises salvas em versões anteriores continuam abrindo: recursos novos entram desligados, sem alterar o que já estava lá. |
