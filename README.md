# Projeto de Testes – Sistema de Personagens de RPG

Trabalho de **Teste e Manutenção de Software** (Sistemas de Informação – PUC Minas).

Sistema testado: **Sistema de Gerenciamento de Personagens de RPG** (Trabalho Interdisciplinar de POO, C# / .NET 8).
Repositório original do sistema: https://github.com/ThiagoBotelho12/TrabalhoPOO2

Repositório dos testes: https://github.com/Mennz/TrabalhoTestes

O plano de testes completo (30 casos, prints, refatoração e relatório de defeitos) está em [`docs/Plano_de_Testes.pdf`](docs/Plano_de_Testes.pdf).

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `TrabalhoPOO2/` | Sistema original (console). O segundo commit contém a refatoração de 2 métodos |
| `Testes.Unitarios/` | **10 testes unitários** com xUnit (CT01 a CT10) |
| `Sistema.Web/` | Tela web mínima que chama as mesmas classes do sistema (o Selenium só testa páginas web) |
| `Testes.Selenium/` | **Suíte de 10 testes funcionais automatizados** com Selenium WebDriver + Chrome (CT11 a CT20) |
| `Testes.Manuais/` | Roteiros dos **10 testes funcionais manuais** (CT21 a CT30) e registro dos prints do console |
| `evidencias/` | Saída dos testes unitários, prints do Selenium (`.png`) e prints do console dos testes manuais |
| `docs/` | Plano de testes em PDF e o gerador do documento |

## Como executar

Pré-requisitos: .NET SDK 8 e Google Chrome (o Selenium baixa o ChromeDriver sozinho).

| Ação | Comando | Atalho (duplo clique) |
|---|---|---|
| Testes unitários | `dotnet test Testes.Unitarios` | `rodar_testes_unitarios.cmd` |
| Testes Selenium | `dotnet test Testes.Selenium` | `rodar_testes_selenium.cmd` |
| Sistema (testes manuais) | `dotnet run --project TrabalhoPOO2` | `rodar_sistema_console.cmd` |

Variáveis opcionais do Selenium: `SELENIUM_PAUSA_MS=1200` deixa cada ação mais lenta (bom para o vídeo) e `SELENIUM_HEADLESS=1` roda sem abrir a janela.

## Resultado

| Categoria | Casos | Aprovados | Reprovados |
|---|---|---|---|
| Unitários | 10 | 8 (9 após a refatoração) | CT09 (DEF-01), CT10 (DEF-02, corrigido) |
| Selenium | 10 | 9 | CT20 (DEF-01) |
| Manuais | 10 | 7 (8 após a refatoração) | CT27 (DEF-04), CT28 (DEF-05), CT29 (DEF-06, corrigido) |

## Defeitos encontrados

| ID | Defeito | Situação |
|---|---|---|
| DEF-01 | Habilidades de nível superior nunca são liberadas ao subir de nível | Aberto |
| DEF-02 | `ItemMunicao.Usar` aceita quantidade negativa e aumenta a munição | Corrigido (refatoração 2) |
| DEF-03 | XP do próximo nível estoura o `int` em níveis altos (mostra -2147483648 no nível 100) | Aberto |
| DEF-04 | Opções 4 e 5 sem personagem selecionado não dão retorno ao usuário | Aberto |
| DEF-05 | Texto inválido num submenu joga o usuário de volta ao menu principal | Aberto |
| DEF-06 | Data de nascimento inválida deixa personagem cadastrado pela metade | Corrigido (refatoração 1) |

## Refatoração de 2 métodos

1. `Menu.CriarPersonagem`: dividido em `LerDadosBasicos`, `EscolherClasse`, `ConcluirCadastro` e `LerCaracteristicas`; desfaz o cadastro se a configuração adicional falhar.
2. `ItemMunicao.Usar`: validação extraída para `QuantidadeValida` e cálculo para `RecalcularPesoEValor`, usando peso e valor unitários.

Compare o antes e o depois no histórico de commits.
