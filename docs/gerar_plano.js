// Gera docs/plano.html a partir das evidências; depois o Chrome imprime em PDF.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const RAIZ = path.resolve(__dirname, '..');
const GITHUB = process.env.GITHUB_TESTES || 'https://github.com/Mennz/TrabalhoTestes';
const VIDEO = process.env.VIDEO_LINK || 'Arquivo .mp4 enviado junto com este plano na entrega do Canvas';
const ALUNO = 'Davi Mendoza'; const INTEGRANTES = 'Bernardo Reis, Carlos Diniz, Davi Mendoza e Luan Santos';
const DATA = '17/11/2026';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const ler = p => fs.readFileSync(path.join(RAIZ, p), 'utf8').replace(/\r/g, '');

// ---------- trechos de saída ----------
function trecho(texto, inicio, fim, extra = 0) {
  const l = texto.split('\n');
  const a = l.findIndex(x => x.includes(inicio));
  if (a < 0) return `[trecho não encontrado: ${inicio}]`;
  let b = l.findIndex((x, i) => i >= a && x.includes(fim));
  if (b < 0) b = l.length - 1;
  return l.slice(a, Math.min(l.length, b + 1 + extra)).join('\n');
}
const terminal = (txt, titulo) =>
  `<div class="print"><div class="barra">${esc(titulo)}</div><pre>${esc(txt)}</pre></div>`;

function metodo(texto, assinatura) {
  const l = texto.replace(/\r/g, '').split('\n');
  const a = l.findIndex(x => x.includes(assinatura));
  let nivel = 0, comecou = false, b = a;
  for (let i = a; i < l.length; i++) {
    for (const c of l[i]) { if (c === '{') { nivel++; comecou = true; } if (c === '}') nivel--; }
    if (comecou && nivel === 0) { b = i; break; }
    if (!comecou && l[i].trim().endsWith(';')) { b = i; break; }
  }
  return l.slice(a, b + 1).join('\n');
}
const codigo = (txt, titulo) =>
  `<div class="print codigo"><div class="barra">${esc(titulo)}</div><pre>${esc(txt.replace(/^ {4}/gm, ''))}</pre></div>`;

// ---------- evidências ----------
const unitAntes = ler('evidencias/unitarios/execucao_antes_refatoracao.txt');
const unitDepois = ler('evidencias/unitarios/execucao_depois_refatoracao.txt');
const selenium = ler('evidencias/selenium/execucao.txt');
const resumo = (t, filtro) => t.split('\n')
  .filter(x => /^\s+(Aprovado|Com falha) CT/.test(x) || /Total de testes|Aprovados:|Com falha:/.test(x))
  .filter(x => !filtro || x.includes(filtro) || /Total|Aprovados:|Com falha:/.test(x))
  .map(x => x.replace(/\s+\[[^\]]*\]$/, '').trimEnd())
  .sort((x, y) => (x.match(/CT\d+/) || ['ZZ'])[0].localeCompare((y.match(/CT\d+/) || ['ZZ'])[0]))
  .join('\n');
const linhaUnit = (t, ct) => {
  const l = t.split('\n');
  const i = l.findIndex(x => /^\s+(Aprovado|Com falha) /.test(x) && x.includes(ct + ' '));
  if (i < 0) return '';
  const fim = l.slice(i + 1).findIndex(x => /^\s+(Aprovado|Com falha) |\[xUnit|Rastreamento/.test(x));
  return l.slice(i, fim < 0 ? i + 1 : i + 1 + fim).map(x => x.replace(/\s+\[[^\]]*\]$/, '')).join('\n');
};
const manual = ct => ler(`evidencias/manuais/${ct}.txt`);

const antes = execSync('git show 5b63674:TrabalhoPOO2/Program.cs', { cwd: RAIZ }).toString();
const depois = ler('TrabalhoPOO2/Program.cs');

// ---------- casos de teste ----------
const U = 'Automatizada (teste unitário – xUnit)';
const S = 'Automatizada (teste funcional – Selenium WebDriver)';
const M = 'Manual (console, com print da tela)';
const preU = 'Projeto Testes.Unitarios referenciando o projeto TrabalhoPOO2; execução com dotnet test';
const preS = 'Site aberto e sem personagens cadastrados (a suíte acessa /reset antes de cada teste)';
const preM = 'Sistema aberto com dotnet run, no menu principal, sem arquivo personagens.json';

const unit = [
  { ct: 'CT01', t: 'Rejeitar item com valor negativo', pre: preU,
    p: ['O teste cria um ItemConsumivel "Antídoto" com valor -5.', 'O construtor de Item valida os dados.', 'O sistema lança ArgumentException.'],
    d: 'Nome "Antídoto", peso 0,2 kg, valor -5, efeito "Cura veneno", 1 carga',
    e: 'ArgumentException com a mensagem "Valor não pode ser negativo"', r: 'Exceção lançada com a mensagem esperada. Aprovado.', pr: 'Média' },
  { ct: 'CT02', t: 'Rejeitar item com nome em branco', pre: preU,
    p: ['O teste cria uma ItemArma com nome formado só por espaços.', 'O construtor valida o nome.', 'O sistema lança ArgumentException.'],
    d: 'Nome "   ", peso 2,0 kg, valor 10, dano "Corte", ataque +3',
    e: 'ArgumentException com a mensagem "Nome do item não pode ser vazio"', r: 'Exceção lançada com a mensagem esperada. Aprovado.', pr: 'Média' },
  { ct: 'CT03', t: 'Rejeitar inventário com capacidade zero', pre: preU,
    p: ['O teste cria um Inventario com capacidade 0.', 'O construtor valida a capacidade.', 'O sistema lança ArgumentException.'],
    d: 'Capacidade máxima = 0 kg (valor-limite inválido)',
    e: 'ArgumentException com a mensagem "Capacidade deve ser maior que zero"', r: 'Exceção lançada com a mensagem esperada. Aprovado.', pr: 'Média' },
  { ct: 'CT04', t: 'Consumível perde carga e recusa uso sem cargas', pre: preU,
    p: ['O teste cria uma "Poção Pequena" com 1 carga.', 'O teste chama Usar() duas vezes.', 'O sistema aceita o 1º uso e recusa o 2º.'],
    d: 'Poção Pequena, 0,3 kg, valor 10, 1 carga',
    e: '1º Usar() = true, 2º Usar() = false, Cargas = 0', r: 'true, false e Cargas = 0. Aprovado.', pr: 'Média' },
  { ct: 'CT05', t: 'Busca por raridade ignora maiúsculas/minúsculas', pre: 'Inventário de 50 kg com 3 itens: 2 "Raro" e 1 "Comum"',
    p: ['O teste adiciona os 3 itens ao inventário.', 'O teste chama BuscarPorRaridade("raro") em minúsculas.', 'O sistema devolve os itens raros.'],
    d: 'Poção Rara (Raro), Adaga (Comum), Elmo Rúnico (Raro); texto buscado "raro"',
    e: '2 itens encontrados, todos com raridade "Raro"', r: '2 itens raros encontrados. Aprovado.', pr: 'Baixa' },
  { ct: 'CT06', t: 'Mago nível 1 nasce com mana máxima de 83', pre: preU,
    p: ['O teste cria um Mago pela MagoFactory.', 'O sistema calcula os atributos e a mana (Inteligência × 4 + Nível × 15).', 'O teste confere classe, inteligência e mana.'],
    d: 'Nome "Merlin", raça Humano, alinhamento Neutro Bom, nível 1',
    e: 'Classe "Mago", Inteligência 17, ManaMaxima 83 e ManaAtual 83', r: 'Valores conforme o esperado. Aprovado.', pr: 'Média' },
  { ct: 'CT07', t: 'XP zero ou negativo é rejeitado', pre: 'Guerreiro "Boromir" nível 1 com 0 XP',
    p: ['O teste chama AdicionarExperiencia(0).', 'O teste chama AdicionarExperiencia(-50).', 'O sistema rejeita as duas chamadas sem alterar o personagem.'],
    d: 'XP = 0 e XP = -50 (valores-limite)',
    e: 'ArgumentException "XP deve ser positivo" nas duas chamadas; nível 1 e 0 XP', r: 'Duas exceções com a mensagem esperada; personagem inalterado. Aprovado.', pr: 'Média' },
  { ct: 'CT08', t: '1000 XP de uma vez sobe vários níveis', pre: 'Bardo "Jaskier" nível 1 com 0 XP',
    p: ['O teste chama AdicionarExperiencia(1000).', 'O sistema sobe de nível enquanto o XP alcança o limite (100, 150, 225, 337).', 'O teste confere nível, XP restante e próximo limite.'],
    d: '1000 XP',
    e: 'Nível 5, Experiencia 188 e ExperienciaProximoNivel 506', r: 'Nível 5, 188 XP e próximo limite 506. Aprovado.', pr: 'Alta' },
  { ct: 'CT09', t: 'Subir para o nível 2 libera a habilidade "Pele Endurecida"', pre: 'Guerreiro "Aragorn" nível 1 (sem a habilidade de nível 2)',
    p: ['O teste confere que "Pele Endurecida" ainda não foi aprendida.', 'O teste adiciona 100 XP.', 'O sistema sobe o Guerreiro para o nível 2.', 'O teste procura "Pele Endurecida" na lista de habilidades.'],
    d: '100 XP (limite do nível 1)',
    e: 'Nível 2 e a lista de habilidades contém "Pele Endurecida"', r: 'Nível 2, mas a habilidade não aparece: "Assert.Contains() Failure: Filter not matched in collection". Reprovado (DEF-01).', pr: 'Alta' },
  { ct: 'CT10', t: 'Usar munição com quantidade negativa é recusado', pre: '20 flechas de 0,1 kg e valor 2 cada',
    p: ['O teste cria a munição com 20 unidades.', 'O teste chama Usar(-5).', 'O sistema deve recusar e manter a quantidade.'],
    d: 'Quantidade a usar = -5',
    e: 'Usar(-5) retorna false e a quantidade continua 20', r: 'Antes da refatoração: retornou true e a quantidade subiu para 25 ("Assert.False() Failure – Expected: False, Actual: True"). Reprovado (DEF-02). Após a refatoração 2: aprovado.', pr: 'Média' },
];

const sel = [
  { ct: 'CT11', t: 'Criar personagem Mago válido', pre: preS,
    p: ['O ator preenche nome, raça, alinhamento e nível.', 'O ator escolhe a classe Mago.', 'O ator clica em "Criar".', 'O sistema cria o personagem, mostra a ficha e o nome na lista.'],
    d: 'Merlin; Humano; Neutro Bom; nível 1; Mago',
    e: 'Mensagem "Personagem Merlin criado com sucesso!", lista com "Merlin - Mago Nível 1 (Humano)" e ficha aberta', r: 'Conforme o esperado. Aprovado.', pr: 'Alta' },
  { ct: 'CT12', t: 'Criar personagem sem raça', pre: preS,
    p: ['O ator preenche nome, alinhamento e nível, deixando a raça vazia.', 'O ator clica em "Criar".', 'O sistema valida os dados e mostra o erro.'],
    d: 'Legolas; raça vazia; Caótico Bom; nível 1; Guerreiro',
    e: 'Mensagem "Raça não pode ser vazia" e 0 personagens cadastrados', r: 'Erro exibido e nenhum personagem criado. Aprovado.', pr: 'Média' },
  { ct: 'CT13', t: 'Nível 100 (limite superior) é aceito', pre: preS,
    p: ['O ator preenche os dados com nível 100.', 'O ator escolhe Druida e clica em "Criar".', 'O sistema cria o personagem no nível 100.'],
    d: 'Elrond; Elfo; Neutro Bom; nível 100; Druida',
    e: 'Personagem criado e ficha com nível 100', r: 'Criado no nível 100. Aprovado. Observação: a ficha mostra "XP: 0 / -2147483648" (DEF-03).', pr: 'Média' },
  { ct: 'CT14', t: 'Bardo recebe os itens iniciais da classe', pre: preS,
    p: ['O ator cria um Bardo.', 'O sistema adiciona os itens iniciais da classe.', 'O ator confere a tabela do inventário.'],
    d: 'Jaskier; Humano; Caótico Bom; nível 1; Bardo',
    e: 'Inventário com "Alaúde" e "Pó de Fada" (2 itens)', r: 'Alaúde e Pó de Fada, 2 itens. Aprovado.', pr: 'Média' },
  { ct: 'CT15', t: 'Adicionar munição calcula peso e valor pela quantidade', pre: 'Guerreiro "Robin" criado e selecionado',
    p: ['O ator escolhe o tipo Munição.', 'O ator informa nome, peso e valor unitários, tipo e quantidade.', 'O ator clica em "Adicionar".', 'O sistema adiciona o item com peso e valor totais.'],
    d: 'Virotes; 0,1 kg; valor 2; raridade Comum; tipo Virote; quantidade 20',
    e: '"Item adicionado com sucesso!" e linha "Virotes" com 2,0 kg e valor 40,00', r: 'Item na tabela com 2,0 kg e 40,00. Aprovado.', pr: 'Média' },
  { ct: 'CT16', t: 'Buscar item por tipo "Arma"', pre: 'Guerreiro "Conan" com os 3 itens iniciais',
    p: ['O ator escolhe buscar por Tipo.', 'O ator digita "Arma" e clica em "Buscar".', 'O sistema lista os itens encontrados.'],
    d: 'Campo: Tipo; texto: Arma',
    e: '1 resultado: "Espada Longa (Arma)"', r: '1 resultado, Espada Longa. Aprovado.', pr: 'Média' },
  { ct: 'CT17', t: 'Ordenar inventário por nome (A-Z)', pre: 'Guerreiro "Xena" com os 3 itens iniciais',
    p: ['O ator escolhe a ordenação "Nome (A-Z)".', 'O ator clica em "Ordenar".', 'O sistema reordena a tabela.'],
    d: 'Ordem: nome',
    e: '"Inventário ordenado!" e a ordem Armadura de Couro, Espada Longa, Poção de Cura', r: 'Ordem conforme o esperado. Aprovado.', pr: 'Baixa' },
  { ct: 'CT18', t: 'Equipar armadura aumenta a vida máxima', pre: 'Guerreiro "Brienne" nível 1 com vida máxima 55',
    p: ['O ator escolhe "Armadura de Couro" na lista de equipáveis.', 'O ator clica em "Equipar".', 'O sistema equipa no slot Torso e recalcula a vida (defesa × 5).'],
    d: 'Armadura de Couro (slot Torso, defesa +3)',
    e: '"Armadura de Couro equipado no slot Torso", vida máxima 70 e "Torso: Armadura de Couro"', r: 'Vida foi de 55 para 70 e o item aparece no slot Torso. Aprovado.', pr: 'Alta' },
  { ct: 'CT19', t: 'Adicionar 0 XP mostra erro', pre: 'Bardo "Frodo" nível 1 com 0 XP',
    p: ['O ator digita 0 no campo XP.', 'O ator clica em "Adicionar XP".', 'O sistema recusa o valor.'],
    d: 'XP = 0',
    e: 'Mensagem "XP deve ser positivo"; continua nível 1 com 0 XP', r: 'Conforme o esperado. Aprovado.', pr: 'Média' },
  { ct: 'CT20', t: 'Subir para o nível 2 libera "Escudo Arcano"', pre: 'Mago "Gandalf" nível 1',
    p: ['O ator digita 100 no campo XP.', 'O ator clica em "Adicionar XP".', 'O sistema sobe o Mago para o nível 2.', 'O ator confere a lista de habilidades.'],
    d: '100 XP',
    e: 'Nível 2 e a lista de habilidades contém "Escudo Arcano"', r: 'Nível 2, mas a lista mostra só Conjuração Elemental e Recuperação Arcana. Reprovado (DEF-01).', pr: 'Alta' },
];

const man = [
  { ct: 'CT21', t: 'Criar personagem Druida com todos os dados', pre: preM,
    p: ['O ator escolhe 1 (Criar novo personagem).', 'O ator informa nome, raça, alinhamento, nível e a classe 3 (Druida).', 'O sistema cria o personagem.', 'O ator informa altura, peso, cabelo, olhos, nascimento e história.', 'O sistema adiciona os itens iniciais e seleciona o personagem.', 'O ator escolhe 5 (Gerenciar inventário) e 1 (Exibir inventário).'],
    d: 'Radagast; Humano; Neutro Bom; 1; 3 (Druida); 1,75; 70; Castanho; Verdes; 15/03/1995; "Guardião da floresta"',
    e: '"Personagem \'Radagast\' criado e selecionado como atual!" e inventário com Foice Natural e Sementes Mágicas (2 itens)', r: 'Conforme o esperado. Aprovado. Observação: no cadastro aparece "❌ Requer nível 2 (atual: 1)" (ligado ao DEF-01).', pr: 'Alta',
    x: [['Nome: Radagast', 'criado e selecionado'], ['=== INVENTÁRIO ===', 'Sementes Mágicas [Comum]', 3]] },
  { ct: 'CT22', t: 'Recusar classe inexistente', pre: preM,
    p: ['O ator escolhe 1.', 'O ator informa os dados e a classe 9.', 'O sistema valida a classe e mostra o erro.'],
    d: 'Legolas; Elfo; Caótico Bom; 1; classe 9',
    e: '"❌ Erro: Classe inválida" e o contador continua em 0', r: 'Conforme o esperado. Aprovado.', pr: 'Média',
    x: [['👤 CRIAR NOVO PERSONAGEM', 'Escolha uma opção: 0']] },
  { ct: 'CT23', t: 'Texto no lugar do número no menu principal', pre: preM,
    p: ['O ator digita "abc" no menu principal.', 'O sistema tenta converter a opção.', 'O sistema mostra o erro e volta ao menu.'],
    d: 'Opção: abc',
    e: '"❌ Opção inválida! Digite um número." e retorno ao menu principal', r: 'Conforme o esperado. Aprovado.', pr: 'Baixa',
    x: [['📋 MENU PRINCIPAL', 'Pressione ENTER']] },
  { ct: 'CT24', t: 'Selecionar personagem com número inexistente', pre: 'Um personagem cadastrado (Dandelion, Bardo)',
    p: ['O ator escolhe 3 (Selecionar personagem atual).', 'O sistema lista os personagens.', 'O ator digita 5.', 'O sistema recusa o número.'],
    d: 'Número do personagem: 5 (só existe o 1)',
    e: '"❌ Número inválido!" e o personagem atual continua Dandelion', r: 'Conforme o esperado. Aprovado.', pr: 'Média',
    x: [['🔍 SELECIONAR PERSONAGEM', 'Pressione ENTER']] },
  { ct: 'CT25', t: 'Editar características do personagem', pre: 'Guerreiro "Boromir" criado e selecionado',
    p: ['O ator escolhe 4 (Gerenciar personagem) e 5 (Editar características).', 'O ator informa os novos dados.', 'O sistema confirma a alteração.', 'O ator escolhe 1 (Exibir status completo).'],
    d: 'Altura 1,90; peso 95; cabelo Grisalho; olhos Cinzentos; história "Veterano de guerra"',
    e: '"✅ Características atualizadas!" e status com 1,90 m, 95,0 kg, Grisalho, Cinzentos e a história', r: 'Conforme o esperado. Aprovado.', pr: 'Média',
    x: [['📝 EDITAR CARACTERÍSTICAS', 'Pressione ENTER'], ['👤 Boromir -', 'Pressione ENTER']] },
  { ct: 'CT26', t: 'Buscar itens por raridade "Raro"', pre: 'Guerreiro "Eowyn" selecionada e itens de exemplo criados (opção 8)',
    p: ['O ator escolhe 5 (Gerenciar inventário) e 8 (Criar itens de exemplo).', 'O ator escolhe 4 (Buscar item) e 3 (Por raridade).', 'O ator digita "Raro".', 'O sistema lista os itens encontrados.'],
    d: 'Raridade: Raro',
    e: '"🔎 Resultados: 1 item(s) encontrado(s)" com a Poção de Cura Maior', r: 'Conforme o esperado. Aprovado.', pr: 'Baixa',
    x: [['🔍 BUSCAR ITEM', 'Pressione ENTER']] },
  { ct: 'CT27', t: 'Gerenciar sem personagem selecionado', pre: preM,
    p: ['O ator escolhe 4 (Gerenciar personagem atual).', 'O ator escolhe 5 (Gerenciar inventário).', 'O sistema deveria avisar que não há personagem selecionado.'],
    d: 'Opções 4 e 5 sem nenhum personagem',
    e: 'Mensagem avisando que é preciso criar ou selecionar um personagem', r: 'Nenhuma mensagem: o menu principal é redesenhado sem retorno ao usuário. Reprovado (DEF-04).', pr: 'Média',
    x: [['Escolha uma opção: 4', 'Escolha uma opção: 5']] },
  { ct: 'CT28', t: 'Texto inválido dentro do menu de inventário', pre: 'Guerreira "Tauriel" criada e selecionada',
    p: ['O ator escolhe 5 (Gerenciar inventário).', 'O ator digita "x".', 'O sistema deveria avisar e continuar no menu de inventário.'],
    d: 'Opção: x',
    e: 'Mensagem de opção inválida e o menu de inventário exibido de novo', r: 'Mostrou "❌ Opção inválida! Digite um número." mas voltou para o MENU PRINCIPAL. Reprovado (DEF-05).', pr: 'Baixa',
    x: [['➡️  Escolha uma opção: x', 'Escolha uma opção: 0']] },
  { ct: 'CT29', t: 'Data de nascimento inválida no cadastro', pre: preM,
    p: ['O ator escolhe 1 e informa os dados básicos (Guerreiro).', 'O ator informa a data 31/02/1990.', 'O sistema recusa a data.', 'O ator escolhe 2 (Listar personagens).'],
    d: 'Gimli; Anão; Leal Neutro; 1; 1 (Guerreiro); 1,40; 90; Ruivo; Castanhos; 31/02/1990',
    e: 'Cadastro recusado: nenhum personagem pela metade na lista (0 cadastrados)', r: 'Erro "String \'31/02/1990\' was not recognized as a valid DateTime.", porém Gimli ficou na lista ("Personagens cadastrados: 1") sem itens e sem ser selecionado. Reprovado (DEF-06). Reteste após a refatoração 1: cadastro cancelado e 0 personagens. Aprovado.', pr: 'Alta',
    x: [['Nome: Gimli', 'Pressione ENTER'], ['📋 LISTA DE PERSONAGENS', 'Pressione ENTER']] },
  { ct: 'CT30', t: 'Desequipar sem nenhum item equipado', pre: 'Mago "Saruman" criado, sem itens equipados',
    p: ['O ator escolhe 5 (Gerenciar inventário).', 'O ator escolhe 6 (Desequipar item).', 'O sistema verifica os slots.'],
    d: 'Nenhum slot com item',
    e: '"❌ Nenhum item equipado."', r: 'Conforme o esperado. Aprovado.', pr: 'Baixa',
    x: [['📦 DESEQUIPAR ITEM', 'Pressione ENTER']] },
];

function tabela(c, tecnica, print) {
  const proc = '<ol>' + c.p.map(x => `<li>${esc(x)}</li>`).join('') + '</ol>';
  const reprovado = /Reprovado/.test(c.r);
  return `<div class="caso"><table class="ct">
<tr><th>Caso de Teste</th><td><b>${c.ct} – ${esc(c.t)}</b></td></tr>
<tr><th>Pré-Condição</th><td>${esc(c.pre)}</td></tr>
<tr><th>Procedimento</th><td>${proc}</td></tr>
<tr><th>Dados de entrada</th><td>${esc(c.d)}</td></tr>
<tr><th>Saída esperada</th><td>${esc(c.e)}</td></tr>
<tr><th>Saída encontrada</th><td class="${reprovado ? 'falha' : 'ok'}">${esc(c.r)}</td></tr>
<tr><th>Prioridade</th><td>${c.pr}</td></tr>
<tr><th>Técnica</th><td>${tecnica}</td></tr>
</table><p class="rot">Print do resultado:</p>${print}</div>`;
}

const casosUnit = unit.map(c => tabela(c, U,
  terminal(linhaUnit(unitAntes, c.ct) + (c.ct === 'CT10' ? '\n\n--- reteste após a refatoração 2 ---\n' + linhaUnit(unitDepois, c.ct) : ''),
    `dotnet test Testes.Unitarios – ${c.ct}`))).join('');
const casosSel = sel.map(c => tabela(c, S,
  `<img class="tela" src="../evidencias/selenium/${c.ct}.png" alt="Print ${c.ct}">`)).join('');
const casosMan = man.map(c => {
  const txt = manual(c.ct);
  let prints = c.x.map((x, i) => terminal(trecho(txt, x[0], x[1], x[2] || 0), `Console – ${c.ct} (${i + 1}/${c.x.length})`)).join('');
  if (c.ct === 'CT29') {
    const re = manual('CT29_reteste');
    prints += terminal(trecho(re, 'Data de nascimento', 'Pressione ENTER') + '\n...\n' + trecho(re, '📋 LISTA DE PERSONAGENS', 'Pressione ENTER'), 'Console – CT29 reteste após a refatoração 1');
  }
  return tabela(c, M, prints);
}).join('');

const lista = arr => '<ul>' + arr.map(c => `<li><b>${c.ct}</b>: ${esc(c.t)}.</li>`).join('') + '</ul>';

const defeitos = [
  ['DEF-01', 'Habilidades de nível superior nunca são liberadas. O construtor tenta adicionar a habilidade de nível 2 no nível 1 (mostra "❌ Requer nível 2") e o SubirNivel não tenta de novo, então o personagem nunca aprende a habilidade.', 'CT09, CT20, CT21', 'Alta', 'Aberto',
    'Guardar a lista de habilidades da classe e criar um método LiberarHabilidades() que adiciona as que têm NivelRequerido ≤ Nivel e ainda não foram aprendidas. Chamar no construtor (sem mensagem de erro) e no SubirNivel.'],
  ['DEF-02', 'ItemMunicao.Usar aceita quantidade negativa ou zero: Usar(-5) retorna true e a quantidade, o peso e o valor AUMENTAM.', 'CT10', 'Média', 'Corrigido (refatoração 2, reteste aprovado)',
    'Validar quantidade > 0 e ≤ estoque; guardar peso e valor unitários e recalcular peso/valor a partir deles.'],
  ['DEF-03', 'Em níveis altos o XP para o próximo nível estoura o tipo int: no nível 100 a ficha mostra "XP: 0 / -2147483648".', 'CT13', 'Média', 'Aberto',
    'Calcular com long/double e limitar o valor; no nível máximo (100) exibir "nível máximo" em vez do próximo limite.'],
  ['DEF-04', 'Opções 4 e 5 do menu principal sem personagem selecionado não dão nenhum retorno ao usuário.', 'CT27', 'Baixa', 'Aberto',
    'No ProcessarOpcaoPrincipal, quando PersonagemAtual for null, exibir "Nenhum personagem selecionado. Crie (1) ou selecione (3) um personagem." e aguardar ENTER.'],
  ['DEF-05', 'Digitar texto em um submenu (inventário ou gerenciar personagem) gera FormatException que só é tratada no menu principal: o usuário é jogado de volta ao menu principal.', 'CT28', 'Baixa', 'Aberto',
    'Reutilizar um método LerOpcao com int.TryParse em todos os submenus e repetir o submenu quando a entrada for inválida.'],
  ['DEF-06', 'Data de nascimento (ou altura/peso) inválida no cadastro deixa o personagem "pela metade": ele fica na lista, sem itens iniciais e sem ser selecionado.', 'CT29', 'Alta', 'Corrigido (refatoração 1, reteste aprovado)',
    'Dividir o CriarPersonagem em etapas e desfazer o cadastro (remover da lista) quando a configuração adicional falhar.'],
];

const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Plano do Projeto de Testes</title>
<style>
@page { size: A4; margin: 18mm 16mm 18mm 16mm; }
body { font-family: Arial, Helvetica, sans-serif; font-size: 10.5pt; color: #111; line-height: 1.35; }
h1 { font-size: 15pt; margin: 18px 0 8px; border-bottom: 1.5px solid #000; padding-bottom: 3px; color: #000; } h1:not(.quebra):first-of-type{} 
h2 { font-size: 12pt; margin: 14px 0 6px; color: #000; font-variant: small-caps; }
h3 { font-size: 11pt; margin: 10px 0 4px; }
.capa { height: 250mm; display: flex; flex-direction: column; justify-content: space-between; text-align: center; page-break-after: always; }
.capa .topo { font-size: 13pt; font-weight: bold; } .capa .meio h1 { border: 0; font-size: 22pt; } .capa .meio p { font-size: 14pt; margin: 6px 0; }
.quebra { page-break-before: always; }
table { border-collapse: collapse; width: 100%; margin: 6px 0; }
td, th { border: 1px solid #555; padding: 4px 6px; vertical-align: top; text-align: left; font-size: 9.5pt; }
th { background: #d9d9d9; }
table.ct th { width: 27%; } table.ct ol { margin: 0; padding-left: 18px; }
td.falha { background: #fde8e8; } td.ok { background: #eaf6ea; }
.caso { page-break-inside: avoid; margin-bottom: 14px; }
.rot { margin: 4px 0 2px; font-weight: bold; font-size: 9.5pt; }
.print { border: 1px solid #333; border-radius: 4px; overflow: hidden; margin: 4px 0 6px; page-break-inside: avoid; }
.print .barra { background: #2d2d30; color: #ccc; font-size: 8pt; padding: 2px 8px; font-family: Consolas, monospace; }
.print pre { margin: 0; background: #0c0c0c; color: #e8e8e8; font-family: Consolas, 'Cascadia Mono', monospace; font-size: 7.6pt; line-height: 1.25; padding: 6px 8px; white-space: pre-wrap; }
.codigo pre { background: #1e1e1e; color: #dcdcdc; font-size: 7.8pt; }
img.tela { width: 100%; border: 1px solid #888; }
.lado { display: flex; gap: 8px; } .lado > div { flex: 1; min-width: 0; }
.nota { font-size: 9pt; color: #333; }
</style></head><body>

<div class="capa">
  <div class="topo"><img src="image1.png" style="width:130px"><br><br>PUC Minas<br><span style="font-weight:normal;font-size:11pt">Sistemas de Informação – Teste e Manutenção de Software</span></div>
  <div class="meio"><h1 style="font-size:28pt;color:#000;border:0">Sistema de Gerenciamento de Personagens de RPG</h1><hr style="border:0;border-top:1.5px solid #000;margin:30px 0 12px"><p style="font-size:17pt">Plano do Projeto de Testes</p><p>Versão: 1.0</p><hr style="border:0;border-top:1.5px solid #000;margin:12px 0"></div>
  <div style="text-align:right">${esc(INTEGRANTES)}<br><br><div style="text-align:center">${DATA}</div></div>
</div>

<h1>Descrição do Documento</h1>
<table><tr><th style="width:20%">OBJETIVO</th><td>Este documento tem como objetivo documentar os testes feitos na aplicação Sistema de Gerenciamento de Personagens de RPG (TrabalhoPOO2).</td></tr>
<tr><th>LOCALIZAÇÃO</th><td>Repositório de testes: ${esc(GITHUB)} (pasta <i>docs</i>). Sistema base (TI): https://github.com/ThiagoBotelho12/TrabalhoPOO2</td></tr></table>

<h2>Histórico de Versões do Documento</h2>
<table><tr><th>VERSÃO</th><th>OBJETIVO</th><th>DATA</th><th>RESPONSÁVEL</th></tr>
<tr><td>1.1</td><td>Preencher o plano de testes</td><td>${DATA}</td><td>${esc(ALUNO)}</td></tr>
<tr><td>1.2</td><td>Preencher Produtos Liberados e Fluxo de Trabalho</td><td>${DATA}</td><td>${esc(ALUNO)}</td></tr>
<tr><td>1.3</td><td>Preencher Necessidades Ambientais</td><td>${DATA}</td><td>${esc(ALUNO)}</td></tr></table>

<h2>Aprovações Internas</h2>
<table><tr><th>PERFIL</th><th>NOME</th><th>DATA</th></tr>
<tr><td>Analista de Sistemas</td><td>${esc(ALUNO)}</td><td>${DATA}</td></tr>
<tr><td>Analista de Qualidade</td><td>${esc(ALUNO)}</td><td>${DATA}</td></tr></table>

<h2>Índice</h2>
<ol><li>Visão geral (Objetivo; Descrição do produto a ser testado)</li><li>Escopo (Planejamento do escopo)</li><li>Itens-alvo dos testes</li><li>Resumo dos testes planejados</li>
<li>Casos de teste: unitários, funcionais automatizados (Selenium) e funcionais manuais</li><li>Refatoração de 2 métodos</li><li>Relatório de defeitos</li><li>Execução, repositório e vídeo</li></ol>

<h1 class="quebra">1. Visão geral</h1>
<h2>1.1 Objetivo</h2>
<p>O documento do plano de testes tem como objetivo relatar os requisitos que serão testados e descrever as técnicas adotadas nesses testes: 10 testes unitários automatizados (xUnit), 10 testes funcionais automatizados (Selenium WebDriver) e 10 testes funcionais manuais com registro de prints, além da refatoração de 2 métodos e do relatório de defeitos.</p>
<p><b>Carga horária estimada:</b> 12 horas (planejamento 2 h; testes unitários 2 h; testes Selenium 3 h; testes manuais 2 h; refatoração e reteste 1 h; relatório e vídeo 2 h).</p>
<p><b>Recursos necessários:</b> computador com Windows 10, .NET SDK 8, Google Chrome, xUnit 2.9, Selenium WebDriver 4.27 (o ChromeDriver é baixado automaticamente pelo Selenium Manager), Git e GitHub, Visual Studio ou Visual Studio Code.</p>
<h2>1.2 Descrição do produto a ser testado</h2>
<p>O Sistema de Gerenciamento de Personagens de RPG é uma aplicação de console em C# (.NET 8), desenvolvida como Trabalho Interdisciplinar de Programação Orientada a Objetos. Ele permite criar personagens de quatro classes (Guerreiro, Mago, Druida e Bardo) por meio do padrão Factory Method, controlar nível, experiência, atributos e habilidades, e gerenciar um inventário com armas, equipamentos, consumíveis e munição (adicionar, remover, buscar, ordenar, equipar e desequipar). Os personagens podem ser salvos e carregados em JSON.</p>
<p><b>GitHub do sistema (TI):</b> https://github.com/ThiagoBotelho12/TrabalhoPOO2<br><b>GitHub dos testes:</b> ${esc(GITHUB)}</p>
<p class="nota">Como o sistema é de console e o Selenium só testa páginas web, o projeto de testes inclui uma tela web mínima (projeto Sistema.Web) que chama as mesmas classes do sistema (GerenciadorPersonagens, fábricas, Inventario, Personagem), sem reescrever nenhuma regra de negócio.</p>

<h1>2. Escopo</h1>
<h2>2.1 Planejamento do escopo</h2>
<p>Os testes ocorrerão nos módulos de <b>criação de personagens</b>, <b>gerenciamento do personagem</b> (experiência, nível, habilidades e características) e <b>inventário</b> (itens, busca, ordenação e equipamentos). Serão empregados testes de unidade (classes Item, ItemConsumivel, ItemMunicao, Inventario, Personagem e fábricas) e testes de sistema (funcionais automatizados e manuais). A persistência em JSON (opções 6 e 7) e os métodos de combate (Atacar e UsarHabilidadeEspecial) não serão testados neste plano.</p>

<h1>3. Itens-alvo dos testes</h1>
<h3>UC1: Criar personagem</h3>
<p><b>01 - Descrição da história/necessidade:</b> Como jogador, quero criar um personagem informando nome, raça, alinhamento, nível e classe, e depois altura, peso, cores de cabelo e olhos, data de nascimento e história.</p>
<p><b>02 - O que deve ser feito:</b> Menu "Criar novo personagem" com a leitura dos dados; criação pela fábrica da classe escolhida; itens iniciais da classe; seleção automática do personagem criado.</p>
<p><b>03 - Regras de negócio:</b> Nome com pelo menos 2 caracteres; raça e alinhamento obrigatórios; nível entre 1 e 100; classe entre 1 e 4.</p>
<h3>UC2: Gerenciar personagem</h3>
<p><b>01 - Descrição:</b> Como jogador, quero ver o status, ganhar experiência, subir de nível, aprender habilidades e editar as características do meu personagem.</p>
<p><b>02 - O que deve ser feito:</b> Exibir status, equipamentos e habilidades; adicionar experiência; editar características; rolar atributos.</p>
<p><b>03 - Regras de negócio:</b> XP deve ser positivo; o limite do nível N é 100 × 1,5^(N-1); ao subir de nível os atributos aumentam e vida e mana são restauradas; habilidades exigem nível mínimo.</p>
<h3>UC3: Gerenciar inventário</h3>
<p><b>01 - Descrição:</b> Como jogador, quero guardar, remover, buscar e ordenar os itens do meu personagem.</p>
<p><b>02 - O que deve ser feito:</b> Adicionar armas, equipamentos, consumíveis e munição; remover por nome; buscar por nome, tipo ou raridade; ordenar por nome, peso ou valor.</p>
<p><b>03 - Regras de negócio:</b> Item com nome, peso maior que zero e valor não negativo; o peso total não pode passar da capacidade (50 + nível × 10 kg); munição tem peso e valor proporcionais à quantidade.</p>
<h3>UC4: Equipar e desequipar</h3>
<p><b>01 - Descrição:</b> Como jogador, quero equipar armas e armaduras nos slots do personagem e tirá-las depois.</p>
<p><b>02 - O que deve ser feito:</b> Listar os itens equipáveis; equipar no slot do item; desequipar devolvendo ao inventário.</p>
<p><b>03 - Regras de negócio:</b> Slots Cabeça, Torso, Mãos, Pés e Arma; requisito de atributo mínimo 10; cada ponto de defesa soma 5 de vida máxima.</p>

<h1>4. Resumo dos testes planejados</h1>
<h3>Testes de unidade (xUnit)</h3>${lista(unit)}
<h3>Testes funcionais (automatizados – Selenium)</h3>${lista(sel)}
<h3>Testes funcionais (manuais)</h3>${lista(man)}
<h3>Resultado geral</h3>
<table><tr><th>Categoria</th><th>Casos</th><th>Aprovados</th><th>Reprovados</th><th>Defeitos</th></tr>
<tr><td>Unitários</td><td>10</td><td>8 (9 após a refatoração)</td><td>2 (CT09, CT10)</td><td>DEF-01, DEF-02</td></tr>
<tr><td>Funcionais automatizados (Selenium)</td><td>10</td><td>9</td><td>1 (CT20)</td><td>DEF-01, DEF-03 (observado no CT13)</td></tr>
<tr><td>Funcionais manuais</td><td>10</td><td>7 (8 após a refatoração)</td><td>3 (CT27, CT28, CT29)</td><td>DEF-04, DEF-05, DEF-06</td></tr></table>

<h1 class="quebra">5. Casos de teste</h1>
<h2>5.1 Testes unitários (CT01 a CT10)</h2>
<p>Projeto <i>Testes.Unitarios</i>, arquivo <i>TestesUnitarios.cs</i>. Todos seguem o padrão Arrange / Act / Assert. Execução: <code>dotnet test Testes.Unitarios</code>.</p>
${terminal(resumo(unitAntes), 'dotnet test Testes.Unitarios – execução no sistema original')}
${casosUnit}

<h2 class="quebra">5.2 Testes funcionais automatizados – Selenium (CT11 a CT20)</h2>
<p>Projeto <i>Testes.Selenium</i>: a suíte sobe a tela web do sistema, abre o Chrome e executa os 10 casos em ordem. Antes de cada caso a suíte zera os dados (/reset). Execução: <code>dotnet test Testes.Selenium</code>. O print de cada caso é salvo automaticamente em <i>evidencias/selenium</i>.</p>
${terminal(resumo(selenium), 'dotnet test Testes.Selenium – suíte de testes funcionais')}
${casosSel}

<h2 class="quebra">5.3 Testes funcionais manuais (CT21 a CT30)</h2>
<p>Executados no sistema de console original (<code>dotnet run --project TrabalhoPOO2</code>), digitando as entradas de cada procedimento. Cada execução começa sem personagens cadastrados. Os prints mostram a tela do console com o que foi digitado; a saída completa de cada caso está em <i>evidencias/manuais</i>.</p>
${casosMan}

<h1 class="quebra">6. Refatoração de 2 métodos</h1>
<table><tr><th>Método</th><th>Problema identificado</th><th>Melhoria aplicada</th></tr>
<tr><td>Menu.CriarPersonagem</td><td>Método longo (≈ 75 linhas) que lê dados, escolhe a classe, cria o personagem e configura as características num bloco só. Se a configuração adicional falha, o personagem já foi cadastrado e fica pela metade (DEF-06).</td><td>Dividido em LerDadosBasicos, EscolherClasse, ConcluirCadastro e LerCaracteristicas, cada um com uma responsabilidade. O ConcluirCadastro desfaz o cadastro quando a configuração falha. Corrige o DEF-06 (reteste do CT29 aprovado).</td></tr>
<tr><td>ItemMunicao.Usar</td><td>Aceitava quantidade negativa ou zero (DEF-02) e recalculava peso e valor com uma fórmula difícil de ler, dividindo pela quantidade antiga.</td><td>Validação extraída para QuantidadeValida (quantidade &gt; 0 e ≤ estoque) e cálculo extraído para RecalcularPesoEValor, usando peso e valor unitários guardados no construtor. Corrige o DEF-02 (reteste do CT10 aprovado).</td></tr></table>

<h2>6.1 Menu.CriarPersonagem</h2>
<p class="rot">Print antes:</p>${codigo(metodo(antes, 'private void CriarPersonagem()'), 'Program.cs – ANTES (commit 5b63674)')}
<p class="rot">Print depois:</p>${codigo(['private void CriarPersonagem()', 'private (string nome, string raca, string alinhamento, int nivel) LerDadosBasicos()', 'private PersonagemFactory EscolherClasse()', 'private void ConcluirCadastro(Personagem personagem)', 'private void LerCaracteristicas(Personagem personagem)'].map(s => metodo(depois, s)).join('\n\n'), 'Program.cs – DEPOIS (commit da refatoração)')}

<h2 class="quebra">6.2 ItemMunicao.Usar</h2>
<p class="rot">Print antes:</p>${codigo(metodo(antes, 'public ItemMunicao(') + '\n\n' + metodo(antes, 'public bool Usar(int quantidade = 1)'), 'Program.cs – ANTES')}
<p class="rot">Print depois:</p>${codigo(metodo(depois, 'public ItemMunicao(') + '\n\n' + metodo(depois, 'public bool Usar(int quantidade = 1)') + '\n\n' + metodo(depois, 'private bool QuantidadeValida') + '\n\n' + metodo(depois, 'private void RecalcularPesoEValor()'), 'Program.cs – DEPOIS')}
<p class="rot">Reteste dos testes unitários após as refatorações:</p>
${terminal(resumo(unitDepois), 'dotnet test Testes.Unitarios – depois da refatoração')}

<h1 class="quebra">7. Relatório de defeitos</h1>
<table><tr><th>ID</th><th>Defeito</th><th>Casos</th><th>Gravidade</th><th>Situação</th><th>Proposta de solução</th></tr>
${defeitos.map(d => `<tr>${d.map(x => `<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</table>

<h1>8. Execução, repositório e vídeo</h1>
<table><tr><th style="width:28%">Repositório dos testes</th><td>${esc(GITHUB)}</td></tr>
<tr><th>Sistema base (TI)</th><td>https://github.com/ThiagoBotelho12/TrabalhoPOO2</td></tr>
<tr><th>Vídeo narrativo</th><td>${esc(VIDEO)}</td></tr>
<tr><th>Testes unitários</th><td><code>dotnet test Testes.Unitarios</code></td></tr>
<tr><th>Testes Selenium</th><td><code>dotnet test Testes.Selenium</code> (o Chrome abre sozinho; <code>SELENIUM_PAUSA_MS=1500</code> deixa mais lento para o vídeo)</td></tr>
<tr><th>Testes manuais</th><td><code>dotnet run --project TrabalhoPOO2</code> e seguir o procedimento de cada caso</td></tr></table>
</body></html>`;

fs.writeFileSync(path.join(__dirname, 'plano.html'), html);
console.log('ok', html.length);
