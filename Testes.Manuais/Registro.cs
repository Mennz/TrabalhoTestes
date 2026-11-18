using System.Globalization;
using System.Runtime.InteropServices;
using System.Text;

namespace Testes.Manuais;

// Registro dos testes funcionais manuais (CT21 a CT30).
// Abre o sistema de console original (Program.Main), digita exatamente as entradas do
// procedimento de cada caso de teste e grava tudo o que apareceu na tela em
// evidencias/manuais/CTxx.txt (o "print" do console, com o que o ator digitou).
public static class Registro
{
    public static int Main(string[] args)
    {
        if (args.Length < 2 || !Roteiros.Todos.TryGetValue(args[0], out var entradas))
        {
            Console.Error.WriteLine("Uso: Testes.Manuais <CT21..CT30> <arquivo-de-saida>");
            return 1;
        }

        CultureInfo.CurrentCulture = CultureInfo.DefaultThreadCurrentCulture = new CultureInfo("pt-BR");
        ConsoleReal.Garantir();

        // Cada caso começa com o sistema "zerado": pasta nova, sem personagens.json
        var pasta = Path.Combine(Path.GetTempPath(), "rpg-" + args[0] + "-" + Guid.NewGuid().ToString("N")[..6]);
        Directory.CreateDirectory(pasta);
        Directory.SetCurrentDirectory(pasta);

        var tela = new StringWriter();
        Console.SetOut(tela);
        Console.SetIn(new Teclado(entradas, tela));

        global::Program.Main();

        File.WriteAllText(args[1], tela.ToString(), new UTF8Encoding(false));
        return 0;
    }
}

// Simula o teclado: devolve as entradas do roteiro e as mostra na tela, como num terminal.
public class Teclado : TextReader
{
    private readonly Queue<string> linhas;
    private readonly TextWriter tela;
    private int extras;

    public Teclado(IEnumerable<string> linhas, TextWriter tela)
    {
        this.linhas = new Queue<string>(linhas);
        this.tela = tela;
    }

    public override string ReadLine()
    {
        string linha;
        if (linhas.Count > 0) linha = linhas.Dequeue();
        else if (++extras <= 20) linha = "0"; // fim do roteiro: sai dos menus
        else throw new InvalidOperationException("Roteiro terminou");
        tela.WriteLine(linha);
        return linha;
    }
}

// Console.Clear() do sistema precisa de uma janela de console de verdade.
internal static class ConsoleReal
{
    [DllImport("kernel32.dll")] private static extern IntPtr GetConsoleWindow();
    [DllImport("kernel32.dll")] private static extern bool AllocConsole();
    [DllImport("user32.dll")] private static extern bool ShowWindow(IntPtr h, int c);
    [DllImport("kernel32.dll", SetLastError = true)] private static extern bool SetStdHandle(int n, IntPtr h);
    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    private static extern IntPtr CreateFileW(string nome, uint acesso, uint compart, IntPtr seg, uint disp, uint flags, IntPtr modelo);

    public static void Garantir()
    {
        if (GetConsoleWindow() == IntPtr.Zero)
        {
            AllocConsole();
            ShowWindow(GetConsoleWindow(), 0);
        }
        var saida = CreateFileW("CONOUT$", 0xC0000000, 3, IntPtr.Zero, 3, 0, IntPtr.Zero);
        SetStdHandle(-11, saida);
    }
}

public static class Roteiros
{
    // Cadastro completo usado como pré-condição em vários casos
    private static string[] Criar(string nome, string raca, string alinh, string classe) => new[]
    {
        "1", nome, raca, alinh, "1", classe, "1,80", "80", "Preto", "Castanhos", "20/05/1998", "", ""
    };

    private static string[] Junta(params string[][] partes) => partes.SelectMany(p => p).ToArray();

    public static readonly Dictionary<string, string[]> Todos = new()
    {
        // CT21 - Criar Druida com todos os dados e conferir os itens iniciais
        ["CT21"] = Junta(
            new[] { "1", "Radagast", "Humano", "Neutro Bom", "1", "3", "1,75", "70", "Castanho", "Verdes", "15/03/1995", "Guardião da floresta", "" },
            new[] { "5", "1", "", "0", "0" }),

        // CT22 - Classe inexistente (opção 9)
        ["CT22"] = new[] { "1", "Legolas", "Elfo", "Caótico Bom", "1", "9", "", "0" },

        // CT23 - Texto no lugar do número no menu principal
        ["CT23"] = new[] { "abc", "", "0" },

        // CT24 - Selecionar personagem com número que não existe
        ["CT24"] = Junta(Criar("Dandelion", "Humano", "Caótico Bom", "4"), new[] { "3", "5", "", "0" }),

        // CT25 - Editar características e conferir no status
        ["CT25"] = Junta(Criar("Boromir", "Humano", "Leal Bom", "1"),
            new[] { "4", "5", "1,90", "95", "Grisalho", "Cinzentos", "Veterano de guerra", "", "1", "", "0", "0" }),

        // CT26 - Buscar itens por raridade "Raro" depois de criar os itens de exemplo
        ["CT26"] = Junta(Criar("Eowyn", "Humana", "Neutro Bom", "1"),
            new[] { "5", "8", "", "4", "3", "Raro", "", "0", "0" }),

        // CT27 - Gerenciar personagem/inventário sem nenhum personagem selecionado
        ["CT27"] = new[] { "4", "5", "0" },

        // CT28 - Texto inválido dentro do menu de inventário
        ["CT28"] = Junta(Criar("Tauriel", "Elfa", "Caótico Bom", "1"), new[] { "5", "x", "", "0" }),

        // CT29 - Data de nascimento inválida (31/02) durante o cadastro
        ["CT29"] = new[] { "1", "Gimli", "Anão", "Leal Neutro", "1", "1", "1,40", "90", "Ruivo", "Castanhos", "31/02/1990", "", "2", "", "0" },

        // CT30 - Desequipar sem nenhum item equipado
        ["CT30"] = Junta(Criar("Saruman", "Maia", "Neutro Mau", "2"), new[] { "5", "6", "", "0", "0" }),
    };
}
