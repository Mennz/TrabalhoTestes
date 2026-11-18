using OpenQA.Selenium;
using OpenQA.Selenium.Chrome;
using OpenQA.Selenium.Support.UI;
using Sistema.Web;
using Microsoft.AspNetCore.Builder;
using Xunit;
using Xunit.Abstractions;
using Xunit.Sdk;

[assembly: CollectionBehavior(DisableTestParallelization = true)]

namespace Testes.Selenium;

// Sobe o site e abre o Chrome uma vez para toda a suíte.
public class SiteFixture : IDisposable
{
    public const string Url = "http://localhost:5091";
    public WebApplication Site { get; }
    public IWebDriver Navegador { get; }

    public SiteFixture()
    {
        Site = SiteRpg.Criar(Url);
        Site.StartAsync().GetAwaiter().GetResult();

        var opcoes = new ChromeOptions();
        if (Environment.GetEnvironmentVariable("SELENIUM_HEADLESS") == "1")
            opcoes.AddArgument("--headless=new");
        opcoes.AddArgument("--window-size=1300,1000");
        Navegador = new ChromeDriver(opcoes);
        Navegador.Manage().Timeouts().ImplicitWait = TimeSpan.FromSeconds(3);
    }

    public void Dispose()
    {
        Navegador.Quit();
        Site.StopAsync().GetAwaiter().GetResult();
    }
}

// Executa os testes em ordem alfabética (CT11, CT12, ...), para facilitar o vídeo.
public class OrdemAlfabetica : ITestCaseOrderer
{
    public IEnumerable<TTestCase> OrderTestCases<TTestCase>(IEnumerable<TTestCase> casos) where TTestCase : ITestCase
        => casos.OrderBy(c => c.TestMethod.Method.Name);
}

[TestCaseOrderer("Testes.Selenium.OrdemAlfabetica", "Testes.Selenium")]
public class TestesFuncionaisSelenium : IClassFixture<SiteFixture>
{
    private readonly IWebDriver nav;
    private static readonly int PausaMs =
        int.TryParse(Environment.GetEnvironmentVariable("SELENIUM_PAUSA_MS"), out var ms) ? ms : 0;

    public TestesFuncionaisSelenium(SiteFixture fixture)
    {
        nav = fixture.Navegador;
        // Pré-condição de todos os testes: site aberto e sem personagens
        nav.Navigate().GoToUrl(SiteFixture.Url + "/reset");
        Pausa();
    }

    // ---------- ações da página ----------
    private void Pausa() { if (PausaMs > 0) Thread.Sleep(PausaMs); }

    private void Digitar(string id, string texto)
    {
        var campo = nav.FindElement(By.Id(id));
        campo.Clear();
        campo.SendKeys(texto);
    }

    private void Escolher(string id, string valorOuTexto)
    {
        var select = new SelectElement(nav.FindElement(By.Id(id)));
        try { select.SelectByValue(valorOuTexto); } catch (NoSuchElementException) { select.SelectByText(valorOuTexto); }
    }

    private void Clicar(string id) { Pausa(); nav.FindElement(By.Id(id)).Click(); Pausa(); }

    private void CriarPersonagem(string nome, string raca, string alinhamento, string nivel, string classe)
    {
        Digitar("nome", nome);
        Digitar("raca", raca);
        Digitar("alinhamento", alinhamento);
        Digitar("nivel", nivel);
        Escolher("classe", classe);
        Clicar("btnCriar");
    }

    private void AdicionarItem(string tipo, string nome, string peso, string valor, string raridade, string extra1, string extra2)
    {
        Escolher("tipoItem", tipo);
        Digitar("itemNome", nome);
        Digitar("itemPeso", peso);
        Digitar("itemValor", valor);
        Digitar("itemRaridade", raridade);
        Digitar("itemExtra1", extra1);
        Digitar("itemExtra2", extra2);
        Clicar("btnAdicionarItem");
    }

    private string Texto(string id) => nav.FindElement(By.Id(id)).Text;
    private List<string> Textos(string css) => nav.FindElements(By.CssSelector(css)).Select(e => e.Text).ToList();

    // Salva o print da tela em evidencias/selenium/CTxx.png
    private void Print(string ct)
    {
        var pasta = AcharPastaEvidencias();
        ((ITakesScreenshot)nav).GetScreenshot().SaveAsFile(Path.Combine(pasta, ct + ".png"));
    }

    private static string AcharPastaEvidencias()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir != null && !File.Exists(Path.Combine(dir.FullName, "ProjetoTestesTMS.sln"))) dir = dir.Parent;
        var pasta = Path.Combine(dir?.FullName ?? AppContext.BaseDirectory, "evidencias", "selenium");
        Directory.CreateDirectory(pasta);
        return pasta;
    }

    // ---------- casos de teste ----------

    [Fact(DisplayName = "CT11 - Criar personagem Mago válido")]
    public void CT11_CriarMagoValido()
    {
        CriarPersonagem("Merlin", "Humano", "Neutro Bom", "1", "2");
        Print("CT11");

        Assert.Contains("Personagem Merlin criado com sucesso!", Texto("mensagem"));
        Assert.Contains(Textos("li.personagem"), t => t.StartsWith("Merlin - Mago Nível 1 (Humano)"));
        Assert.Equal("Merlin", Texto("fichaNome"));
    }

    [Fact(DisplayName = "CT12 - Criar personagem sem raça mostra erro")]
    public void CT12_CriarSemRaca()
    {
        CriarPersonagem("Legolas", "", "Caótico Bom", "1", "1");
        Print("CT12");

        Assert.Contains("Raça não pode ser vazia", Texto("mensagem"));
        Assert.Equal("0", Texto("qtdPersonagens"));
    }

    [Fact(DisplayName = "CT13 - Nível 100 (limite superior) é aceito")]
    public void CT13_Nivel100Aceito()
    {
        CriarPersonagem("Elrond", "Elfo", "Neutro Bom", "100", "3");
        Print("CT13");

        Assert.Contains("Personagem Elrond criado com sucesso!", Texto("mensagem"));
        Assert.Equal("100", Texto("fichaNivel"));
    }

    [Fact(DisplayName = "CT14 - Bardo recebe os itens iniciais da classe")]
    public void CT14_BardoItensIniciais()
    {
        CriarPersonagem("Jaskier", "Humano", "Caótico Bom", "1", "4");
        Print("CT14");

        var nomes = Textos("#inventario tr.item td:first-child");
        Assert.Equal(new[] { "Alaúde", "Pó de Fada" }, nomes);
        Assert.Equal("2", Texto("qtdItens"));
    }

    [Fact(DisplayName = "CT15 - Adicionar munição calcula peso e valor pela quantidade")]
    public void CT15_AdicionarMunicao()
    {
        CriarPersonagem("Robin", "Humano", "Neutro Bom", "1", "1");
        AdicionarItem("4", "Virotes", "0,1", "2", "Comum", "Virote", "20");
        Print("CT15");

        Assert.Contains("Item adicionado com sucesso!", Texto("mensagem"));
        var linha = nav.FindElements(By.CssSelector("#inventario tr.item")).Single(l => l.Text.StartsWith("Virotes"));
        Assert.Contains("2,0", linha.Text);   // 20 x 0,1 kg
        Assert.Contains("40,00", linha.Text); // 20 x 2
    }

    [Fact(DisplayName = "CT16 - Buscar item por tipo 'Arma'")]
    public void CT16_BuscarPorTipo()
    {
        CriarPersonagem("Conan", "Humano", "Caótico Neutro", "1", "1");
        Escolher("buscaCampo", "tipo");
        Digitar("buscaTexto", "Arma");
        Clicar("btnBuscar");
        Print("CT16");

        Assert.Equal("1", Texto("qtdResultados"));
        Assert.Equal(new[] { "Espada Longa (Arma)" }, Textos("li.resultado"));
    }

    [Fact(DisplayName = "CT17 - Ordenar inventário por nome (A-Z)")]
    public void CT17_OrdenarPorNome()
    {
        CriarPersonagem("Xena", "Humano", "Neutro Bom", "1", "1");
        Escolher("ordem", "nome");
        Clicar("btnOrdenar");
        Print("CT17");

        Assert.Contains("Inventário ordenado!", Texto("mensagem"));
        var nomes = Textos("#inventario tr.item td:first-child");
        Assert.Equal(new[] { "Armadura de Couro", "Espada Longa", "Poção de Cura" }, nomes);
    }

    [Fact(DisplayName = "CT18 - Equipar armadura aumenta a vida máxima (55 para 70)")]
    public void CT18_EquiparArmaduraAumentaVida()
    {
        CriarPersonagem("Brienne", "Humana", "Leal Bom", "1", "1");
        Assert.Equal("55", Texto("vidaMaxima"));

        Escolher("equipar", "Armadura de Couro");
        Clicar("btnEquipar");
        Print("CT18");

        Assert.Contains("Armadura de Couro equipado no slot Torso", Texto("mensagem"));
        Assert.Equal("70", Texto("vidaMaxima")); // defesa 3 x 5 HP
        Assert.Contains("Torso: Armadura de Couro", Textos("li.equipado"));
    }

    [Fact(DisplayName = "CT19 - Adicionar 0 XP mostra erro")]
    public void CT19_XpZero()
    {
        CriarPersonagem("Frodo", "Hobbit", "Leal Bom", "1", "4");
        Digitar("xp", "0");
        Clicar("btnXp");
        Print("CT19");

        Assert.Contains("XP deve ser positivo", Texto("mensagem"));
        Assert.Equal("1", Texto("fichaNivel"));
        Assert.Equal("0", Texto("fichaXp"));
    }

    [Fact(DisplayName = "CT20 - Ao subir para o nível 2 a habilidade 'Escudo Arcano' é liberada")]
    public void CT20_SubirNivelLiberaHabilidade()
    {
        CriarPersonagem("Gandalf", "Maia", "Neutro Bom", "1", "2");
        Digitar("xp", "100");
        Clicar("btnXp");
        Print("CT20");

        Assert.Equal("2", Texto("fichaNivel"));
        Assert.Contains("Escudo Arcano", Textos("li.habilidade"));
    }
}
