using System.Globalization;
using System.Net;
using System.Reflection;
using System.Text;

namespace Sistema.Web;

// Tela web mínima para o Selenium. O sistema original é de console, e o Selenium só
// testa páginas web. Cada ação chama as MESMAS classes do sistema (GerenciadorPersonagens,
// fábricas, Inventario, Personagem) e mostra a mensagem que o sistema escreveria no console.
public static class Inicio
{
    public static void Main(string[] args)
    {
        var url = args.Length > 0 ? args[0] : "http://localhost:5080";
        Console.WriteLine($"Site do RPG em {url}");
        SiteRpg.Criar(url).Run();
    }
}

public static class SiteRpg
{
    private static readonly object Trava = new();
    private static readonly CultureInfo PtBr = new("pt-BR");

    private static GerenciadorPersonagens G => GerenciadorPersonagens.Instancia;

    public static WebApplication Criar(string url)
    {
        CultureInfo.DefaultThreadCurrentCulture = PtBr;
        CultureInfo.DefaultThreadCurrentUICulture = PtBr;

        var builder = WebApplication.CreateBuilder();
        builder.Logging.ClearProviders();
        builder.WebHost.UseUrls(url);
        var app = builder.Build();

        app.MapGet("/", () => Pagina(""));

        app.MapGet("/reset", () =>
        {
            lock (Trava) { G.Personagens.Clear(); G.PersonagemAtual = null; }
            return Results.Redirect("/");
        });

        app.MapPost("/criar", async (HttpRequest req) =>
        {
            var f = await req.ReadFormAsync();
            string msg = Executar(() =>
            {
                PersonagemFactory fabrica = f["classe"].ToString() switch
                {
                    "1" => new GuerreiroFactory(),
                    "2" => new MagoFactory(),
                    "3" => new DruidaFactory(),
                    "4" => new BardoFactory(),
                    _ => throw new PersonagemException("Classe inválida")
                };
                int nivel = int.Parse(f["nivel"]);
                var p = G.CriarPersonagem(fabrica, f["nome"], f["raca"], f["alinhamento"], nivel);
                if (p != null)
                {
                    // Reaproveita o método do próprio sistema que dá os itens iniciais da classe
                    typeof(Menu).GetMethod("AdicionarItensIniciais", BindingFlags.NonPublic | BindingFlags.Instance)!
                        .Invoke(new Menu(), new object[] { p });
                    G.PersonagemAtual = p;
                }
            });
            return Pagina(msg);
        });

        app.MapGet("/selecionar/{i:int}", (int i) =>
        {
            lock (Trava) { if (i >= 0 && i < G.Personagens.Count) G.PersonagemAtual = G.Personagens[i]; }
            return Pagina("");
        });

        app.MapPost("/xp", async (HttpRequest req) =>
        {
            var f = await req.ReadFormAsync();
            return Pagina(Executar(() => G.PersonagemAtual.AdicionarExperiencia(int.Parse(f["xp"]))));
        });

        app.MapPost("/item", async (HttpRequest req) =>
        {
            var f = await req.ReadFormAsync();
            string msg = Executar(() =>
            {
                string nome = f["itemNome"];
                double peso = Numero(f["itemPeso"]);
                decimal valor = (decimal)Numero(f["itemValor"]);
                string raridade = string.IsNullOrWhiteSpace(f["itemRaridade"]) ? "Comum" : f["itemRaridade"].ToString();
                string extra1 = f["itemExtra1"];
                int extra2 = string.IsNullOrWhiteSpace(f["itemExtra2"]) ? 0 : int.Parse(f["itemExtra2"]);
                IItemInventario item = f["tipoItem"].ToString() switch
                {
                    "1" => new ItemArma(nome, peso, valor, extra1, extra2, 1, raridade),
                    "2" => new ItemEquipamento(nome, peso, valor, extra1, extra2, 0, raridade),
                    "3" => new ItemConsumivel(nome, peso, valor, extra1, extra2, raridade),
                    "4" => new ItemMunicao(nome, peso, valor, extra2, extra1, raridade),
                    _ => throw new InventarioException("Tipo de item inválido")
                };
                if (G.PersonagemAtual.Inventario.AdicionarItem(item))
                    Console.WriteLine("✅ Item adicionado com sucesso!");
            });
            return Pagina(msg);
        });

        app.MapPost("/remover", async (HttpRequest req) =>
        {
            var f = await req.ReadFormAsync();
            return Pagina(Executar(() =>
            {
                if (G.PersonagemAtual.Inventario.RemoverItem(f["removerNome"]))
                    Console.WriteLine("✅ Item removido com sucesso!");
            }));
        });

        app.MapPost("/buscar", async (HttpRequest req) =>
        {
            var f = await req.ReadFormAsync();
            List<IItemInventario> achados = new();
            string msg = Executar(() =>
            {
                var inv = G.PersonagemAtual.Inventario;
                string texto = f["buscaTexto"];
                achados = f["buscaCampo"].ToString() switch
                {
                    "tipo" => inv.BuscarPorTipo(texto),
                    "raridade" => inv.BuscarPorRaridade(texto),
                    _ => inv.BuscarItem(texto) is { } i ? new List<IItemInventario> { i } : new()
                };
                Console.WriteLine($"🔎 Resultados: {achados.Count} item(s) encontrado(s)");
            });
            return Pagina(msg, achados);
        });

        app.MapPost("/ordenar", async (HttpRequest req) =>
        {
            var f = await req.ReadFormAsync();
            return Pagina(Executar(() =>
            {
                var inv = G.PersonagemAtual.Inventario;
                switch (f["ordem"].ToString())
                {
                    case "peso": inv.OrdenarPorPeso(); break;
                    case "valor": inv.OrdenarPorValor(); break;
                    default: inv.OrdenarPorNome(); break;
                }
                Console.WriteLine("✅ Inventário ordenado!");
            }));
        });

        app.MapPost("/equipar", async (HttpRequest req) =>
        {
            var f = await req.ReadFormAsync();
            return Pagina(Executar(() =>
            {
                var item = G.PersonagemAtual.Inventario.GetItens().OfType<ItemEquipamento>()
                    .FirstOrDefault(i => i.Nome == f["equipar"]);
                if (item == null) Console.WriteLine("❌ Escolha inválida!");
                else G.PersonagemAtual.EquiparItem(item);
            }));
        });

        app.MapPost("/desequipar", async (HttpRequest req) =>
        {
            var f = await req.ReadFormAsync();
            return Pagina(Executar(() => G.PersonagemAtual.DesequiparItem(f["desequipar"])));
        });

        return app;
    }

    private static double Numero(string texto) =>
        double.Parse((texto ?? "0").Replace(',', '.'), CultureInfo.InvariantCulture);

    // Executa a ação do sistema e devolve o que ele escreveu no console.
    private static string Executar(Action acao)
    {
        lock (Trava)
        {
            var antigo = Console.Out;
            var saida = new StringWriter();
            Console.SetOut(saida);
            try { acao(); }
            catch (Exception ex) { saida.WriteLine($"❌ {ex.Message}"); }
            finally { Console.SetOut(antigo); }
            return saida.ToString().Trim();
        }
    }

    private static string H(object o) => WebUtility.HtmlEncode(Convert.ToString(o, PtBr) ?? "");

    private static IResult Pagina(string mensagem, List<IItemInventario> busca = null)
    {
        var s = new StringBuilder();
        s.Append("""
<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>RPG - Personagens</title>
<style>
body{font-family:Segoe UI,Arial,sans-serif;margin:20px;background:#f4f5f7;color:#222}
h1{font-size:22px} h2{font-size:17px;margin:14px 0 6px}
section{background:#fff;border:1px solid #ddd;border-radius:6px;padding:10px 14px;margin-bottom:12px}
#mensagem{white-space:pre-wrap;background:#1e1e1e;color:#e6e6e6;padding:8px 12px;border-radius:6px;min-height:20px;font-family:Consolas,monospace}
table{border-collapse:collapse} td,th{border:1px solid #ccc;padding:3px 8px;font-size:14px}
input,select,button{margin:2px 4px 2px 0;padding:3px 6px}
</style></head><body>
<h1>Sistema de Gerenciamento de Personagens de RPG</h1>
""");
        s.Append($"<div id=\"mensagem\">{H(mensagem)}</div>");

        s.Append("""
<section><h2>Criar personagem</h2>
<form method="post" action="/criar">
Nome <input id="nome" name="nome"> Raça <input id="raca" name="raca">
Alinhamento <input id="alinhamento" name="alinhamento"> Nível <input id="nivel" name="nivel" value="1" size="4">
Classe <select id="classe" name="classe"><option value="1">Guerreiro</option><option value="2">Mago</option><option value="3">Druida</option><option value="4">Bardo</option></select>
<button id="btnCriar">Criar</button></form></section>
""");

        s.Append($"<section><h2>Personagens cadastrados: <span id=\"qtdPersonagens\">{G.Personagens.Count}</span></h2><ul id=\"lista\">");
        for (int i = 0; i < G.Personagens.Count; i++)
        {
            var p = G.Personagens[i];
            s.Append($"<li class=\"personagem\">{H(p.Nome)} - {H(p.Classe)} Nível {p.Nivel} ({H(p.Raca)}) <a href=\"/selecionar/{i}\">Selecionar</a></li>");
        }
        s.Append("</ul></section>");

        var a = G.PersonagemAtual;
        if (a != null)
        {
            var inv = a.Inventario;
            s.Append($"""
<section id="ficha"><h2>Ficha: <span id="fichaNome">{H(a.Nome)}</span> - {H(a.Classe)} nível <span id="fichaNivel">{a.Nivel}</span></h2>
XP: <span id="fichaXp">{a.Experiencia}</span> / <span id="fichaXpProximo">{a.ExperienciaProximoNivel}</span> |
Vida máxima: <span id="vidaMaxima">{a.VidaMaxima}</span> | Mana máxima: <span id="manaMaxima">{a.ManaMaxima}</span> |
Força: <span id="forca">{a.Forca}</span>
<form method="post" action="/xp">XP <input id="xp" name="xp" size="6"><button id="btnXp">Adicionar XP</button></form>
<h2>Habilidades</h2><ul id="habilidades">
""");
            foreach (var h in a.Habilidades) s.Append($"<li class=\"habilidade\">{H(h.Nome)}</li>");
            s.Append("</ul><h2>Equipamentos</h2><ul id=\"equipamentos\">");
            foreach (var kv in a.Equipamentos.Where(kv => kv.Value != null))
                s.Append($"<li class=\"equipado\">{H(kv.Key)}: {H(kv.Value.Nome)}</li>");
            s.Append("</ul></section>");

            s.Append($"""
<section><h2>Inventário</h2>
Peso: <span id="pesoTotal">{inv.PesoAtual.ToString("F1", PtBr)}</span> / {inv.CapacidadeMaxima.ToString("F1", PtBr)} kg |
Itens: <span id="qtdItens">{inv.QuantidadeItens}</span> | Valor total: <span id="valorTotal">{inv.ValorTotal.ToString("F2", PtBr)}</span>
<table id="inventario"><tr><th>Nome</th><th>Tipo</th><th>Peso (kg)</th><th>Valor</th><th>Raridade</th></tr>
""");
            foreach (var i in inv.GetItens())
                s.Append($"<tr class=\"item\"><td>{H(i.Nome)}</td><td>{H(i.Tipo)}</td><td>{i.Peso.ToString("F1", PtBr)}</td><td>{i.Valor.ToString("F2", PtBr)}</td><td>{H(i.Raridade)}</td></tr>");
            s.Append("</table>");

            s.Append("""
<h2>Adicionar item</h2><form method="post" action="/item">
Tipo <select id="tipoItem" name="tipoItem"><option value="1">Arma</option><option value="2">Equipamento</option><option value="3">Consumível</option><option value="4">Munição</option></select>
Nome <input id="itemNome" name="itemNome"> Peso <input id="itemPeso" name="itemPeso" size="5"> Valor <input id="itemValor" name="itemValor" size="5">
Raridade <input id="itemRaridade" name="itemRaridade" size="8"><br>
Dano / Slot / Efeito / Tipo de munição <input id="itemExtra1" name="itemExtra1">
Bônus / Cargas / Quantidade <input id="itemExtra2" name="itemExtra2" size="5">
<button id="btnAdicionarItem">Adicionar</button></form>
<h2>Remover item</h2><form method="post" action="/remover">Nome <input id="removerNome" name="removerNome"><button id="btnRemover">Remover</button></form>
<h2>Buscar item</h2><form method="post" action="/buscar">
<select id="buscaCampo" name="buscaCampo"><option value="nome">Nome</option><option value="tipo">Tipo</option><option value="raridade">Raridade</option></select>
<input id="buscaTexto" name="buscaTexto"><button id="btnBuscar">Buscar</button></form>
<h2>Ordenar</h2><form method="post" action="/ordenar">
<select id="ordem" name="ordem"><option value="nome">Nome (A-Z)</option><option value="peso">Peso</option><option value="valor">Valor (maior primeiro)</option></select>
<button id="btnOrdenar">Ordenar</button></form>
<h2>Equipar / desequipar</h2><form method="post" action="/equipar"><select id="equipar" name="equipar">
""");
            foreach (var e in inv.GetItens().OfType<ItemEquipamento>())
                s.Append($"<option>{H(e.Nome)}</option>");
            s.Append("</select><button id=\"btnEquipar\">Equipar</button></form><form method=\"post\" action=\"/desequipar\"><select id=\"desequipar\" name=\"desequipar\">");
            foreach (var slot in a.Equipamentos.Keys) s.Append($"<option>{H(slot)}</option>");
            s.Append("</select><button id=\"btnDesequipar\">Desequipar</button></form></section>");
        }

        if (busca != null)
        {
            s.Append($"<section><h2>Resultado da busca: <span id=\"qtdResultados\">{busca.Count}</span></h2><ul id=\"resultadoBusca\">");
            foreach (var i in busca) s.Append($"<li class=\"resultado\">{H(i.Nome)} ({H(i.Tipo)})</li>");
            s.Append("</ul></section>");
        }

        s.Append("</body></html>");
        return Results.Content(s.ToString(), "text/html; charset=utf-8");
    }
}
