# Decisões

Por que o programa se comporta assim. Cada escolha aqui tem um motivo metodológico e um
custo — vale conhecer os dois antes de pedir que mude.

## Nada sai da sua máquina

O arquivo é lido, analisado e guardado no próprio navegador. Não há conta, upload nem
servidor.

**Por quê.** Os arquivos são de experimentos ainda não publicados. Ficar inteiramente na
máquina de quem analisa dispensa toda a conversa sobre onde o dado está e quem pode vê-lo.

**O que isso custa.** As análises não aparecem sozinhas em outro computador, e limpar os
dados do navegador as apaga. A exportação em JSON é a forma de guardar uma cópia e de
levar uma análise de uma máquina para outra.

## Cada arquivo é identificado do zero

Nome, cor e categoria dos códigos valem só para aquela análise. Abrir um segundo arquivo
exige identificar de novo, mesmo que seja do mesmo experimento.

**Por quê.** O mesmo número significa coisas diferentes em programas diferentes, e às
vezes entre versões do mesmo programa. Herdar a identificação do arquivo anterior
produziria uma análise errada sem nenhum aviso — o pior tipo de erro em uma medida.

**O que isso custa.** Trabalho repetido quando se importa uma série de sessões do mesmo
protocolo.

## Categorias próprias convivem com as cinco prontas

As cinco categorias padrão são fixas; as suas são criadas além delas e valem para aquela
análise.

**Por quê.** Só o conjunto fixo não daria conta do vocabulário de cada laboratório. Só
categorias livres tirariam o esqueleto estável da linha do tempo e o destino garantido
dos eventos que perdem a categoria. As prontas dão a estrutura, as suas dão a precisão.

**O que isso custa.** Renomear uma categoria precisa levar junto todos os eventos dela, e
por isso é feito em uma ação só, não campo a campo.

## A duração é medida do primeiro ao último evento

E não pela duração declarada no cabeçalho do arquivo.

**Por quê.** O cabeçalho descreve o que o programa pretendia fazer; os eventos descrevem
o que foi registrado. Uma sessão interrompida, ou um registro que começou antes do
primeiro evento, faria a taxa por minuto discordar da linha do tempo logo abaixo dela.

**O que isso custa.** Uma sessão em que nada ocorreu nos últimos minutos aparece mais
curta do que foi. A janela de tempo permite recortar explicitamente o trecho desejado.

## A janela de tempo conta a partir do início da sessão

"De 9 a 12 minutos" são os minutos 9 a 12 de registro, não horários do relógio.

**Por quê.** É assim que a pergunta é feita: *o que aconteceu entre o minuto 9 e o 12?*.
Contar a partir do primeiro evento também torna o mesmo recorte comparável entre sessões
que começaram em momentos diferentes.

**O que isso custa.** A janela não tem significado em outra sessão, e por isso é
reiniciada quando você troca de sessão.

## Um lugar só para recortar a sessão

A janela de tempo, o isolamento de eventos, o modo de contagem e o desenho da sessão
ficam no mesmo painel. O que a linha do tempo mostra é exatamente a janela do filtro: não
há um zoom que valha só para o desenho.

**Por quê.** Com controles espalhados, dá para chegar a estados contraditórios sem
perceber — um zoom mostrando dez minutos enquanto os cartões somam a hora inteira, ou um
seletor de categoria na tabela discordando dos eventos marcados acima. O número na tela
precisa corresponder ao que está desenhado logo ao lado dele.

**O que isso custa.** Não dá para "só dar uma olhada de perto" sem mexer no recorte: dar
zoom muda o que está sendo contado. Em troca, o que você vê é sempre o que está em
análise — e o resumo no alto do painel diz quantos eventos são.

## Isolar e contabilizar são dois controles

Escolher **o que aparece** na linha do tempo é separado de escolher **o que entra na
conta**.

**Por quê.** São duas perguntas legítimas e diferentes: *quantas respostas houve entre 9
e 12 minutos?* e *o que mais aconteceu em volta dessas respostas?*. Um controle único
obrigaria a ficar alternando filtros para comparar as duas coisas.

**O que isso custa.** Um conceito a mais para aprender. Por isso o resumo do filtro fica
sempre visível no topo do painel, mesmo com ele fechado.

## Pares sem correspondência são descartados

Nas análises de tempo entre dois eventos, uma origem sem o destino correspondente sai do
cálculo em vez de entrar como zero.

**Por quê.** Uma resposta que nunca foi seguida de reforço não teve latência zero — não
teve latência. Contá-la como zero rebaixaria a média e faria parecer que o desempenho
melhorou justamente nas tentativas em que nada aconteceu.

**O que isso custa.** A amostra fica menor que o número de ocorrências da origem. Por
isso o tamanho da amostra é mostrado sempre ao lado do resultado.

## A regressão trabalha com blocos de tempo

A sessão é dividida em blocos de tamanho fixo e cada bloco vira uma observação.

**Por quê.** Um evento isolado não traz vários preditores ao mesmo tempo. Sem blocos não
existe o conjunto de observações comparáveis de que uma regressão múltipla precisa.

**O que isso custa.** O resultado depende da largura do bloco, que passa a ser uma
escolha do analista. Por isso ela é guardada junto do modelo, e dois modelos com blocos
diferentes não devem ser comparados diretamente.

## O último bloco incompleto é descartado

**Por quê.** Um bloco pela metade teve metade do tempo para acumular respostas. Mantê-lo
o faria parecer um bloco de baixa taxa, quando na verdade foi um bloco de menos
oportunidade — um viés sistemático, sempre no fim da sessão.

**O que isso custa.** Um pedaço do fim da sessão fica de fora do modelo. Escolher um
bloco que divida a duração de forma mais exata reduz a sobra.

## Categorias vazias continuam na linha do tempo

A faixa de uma categoria sem nenhum evento continua desenhada.

**Por quê.** Ausência é resultado. Uma sessão sem nenhum reforço precisa mostrar a faixa
de reforço vazia, e não simplesmente não mostrá-la — é a diferença entre "não ocorreu" e
"não foi registrado".

**O que isso custa.** Um pouco de espaço vertical quando há muitas categorias criadas.
