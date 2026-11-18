using Xunit;

namespace Testes.Unitarios;

// Testes unitários do Sistema de Gerenciamento de Personagens de RPG (TrabalhoPOO2).
// Padrão usado em todos: Arrange (preparar) / Act (executar) / Assert (verificar).
public class TestesUnitarios
{
    [Fact(DisplayName = "CT01 - Item com valor negativo é rejeitado")]
    public void CT01_ItemComValorNegativo_LancaExcecao()
    {
        // Act
        var erro = Assert.Throws<ArgumentException>(
            () => new ItemConsumivel("Antídoto", 0.2, -5m, "Cura veneno", 1));

        // Assert
        Assert.Equal("Valor não pode ser negativo", erro.Message);
    }

    [Fact(DisplayName = "CT02 - Item com nome em branco é rejeitado")]
    public void CT02_ItemComNomeEmBranco_LancaExcecao()
    {
        var erro = Assert.Throws<ArgumentException>(
            () => new ItemArma("   ", 2.0, 10m, "Corte", 3));

        Assert.Equal("Nome do item não pode ser vazio", erro.Message);
    }

    [Fact(DisplayName = "CT03 - Inventário com capacidade zero é rejeitado")]
    public void CT03_InventarioComCapacidadeZero_LancaExcecao()
    {
        var erro = Assert.Throws<ArgumentException>(() => new Inventario(0));

        Assert.Equal("Capacidade deve ser maior que zero", erro.Message);
    }

    [Fact(DisplayName = "CT04 - Consumível perde a carga ao ser usado e recusa uso sem cargas")]
    public void CT04_ConsumivelSemCargas_NaoPodeSerUsado()
    {
        // Arrange
        var pocao = new ItemConsumivel("Poção Pequena", 0.3, 10m, "Restaura 10 HP", 1);

        // Act
        bool primeiroUso = pocao.Usar();
        bool segundoUso = pocao.Usar();

        // Assert
        Assert.True(primeiroUso);
        Assert.False(segundoUso);
        Assert.Equal(0, pocao.Cargas);
    }

    [Fact(DisplayName = "CT05 - Busca por raridade ignora maiúsculas e minúsculas")]
    public void CT05_BuscaPorRaridade_IgnoraMaiusculas()
    {
        // Arrange
        var inventario = new Inventario(50);
        inventario.AdicionarItem(new ItemConsumivel("Poção Rara", 0.5, 50m, "Restaura 40 HP", 1, "Raro"));
        inventario.AdicionarItem(new ItemArma("Adaga", 1.0, 20m, "Perfuração", 2));
        inventario.AdicionarItem(new ItemEquipamento("Elmo Rúnico", 2.0, 80m, "Cabeça", 3, 0, "Raro"));

        // Act
        var resultado = inventario.BuscarPorRaridade("raro");

        // Assert
        Assert.Equal(2, resultado.Count);
        Assert.All(resultado, item => Assert.Equal("Raro", item.Raridade));
    }

    [Fact(DisplayName = "CT06 - Mago nível 1 nasce com mana máxima de 83")]
    public void CT06_MagoNivel1_ManaMaximaCorreta()
    {
        // Arrange / Act
        var mago = new MagoFactory().CriarPersonagem("Merlin", "Humano", "Neutro Bom", 1);

        // Assert: Inteligência 17 x 4 + nível 1 x 15 = 83
        Assert.Equal("Mago", mago.Classe);
        Assert.Equal(17, mago.Inteligencia);
        Assert.Equal(83, mago.ManaMaxima);
        Assert.Equal(83, mago.ManaAtual);
    }

    [Fact(DisplayName = "CT07 - XP zero ou negativo é rejeitado e o personagem não muda")]
    public void CT07_XpZeroOuNegativo_LancaExcecao()
    {
        var guerreiro = new Guerreiro("Boromir", "Humano", "Leal Bom");

        var erroZero = Assert.Throws<ArgumentException>(() => guerreiro.AdicionarExperiencia(0));
        var erroNegativo = Assert.Throws<ArgumentException>(() => guerreiro.AdicionarExperiencia(-50));

        Assert.Equal("XP deve ser positivo", erroZero.Message);
        Assert.Equal("XP deve ser positivo", erroNegativo.Message);
        Assert.Equal(1, guerreiro.Nivel);
        Assert.Equal(0, guerreiro.Experiencia);
    }

    [Fact(DisplayName = "CT08 - 1000 XP de uma vez sobe vários níveis (nível 5, sobra 188 XP)")]
    public void CT08_MuitoXp_SobeVariosNiveis()
    {
        // Arrange
        var bardo = new Bardo("Jaskier", "Humano", "Caótico Bom");

        // Act: limites 100 + 150 + 225 + 337 = 812 XP até o nível 5
        bardo.AdicionarExperiencia(1000);

        // Assert
        Assert.Equal(5, bardo.Nivel);
        Assert.Equal(188, bardo.Experiencia);
        Assert.Equal(506, bardo.ExperienciaProximoNivel);
    }

    [Fact(DisplayName = "CT09 - Ao subir para o nível 2 o Guerreiro aprende 'Pele Endurecida'")]
    public void CT09_SubirNivel_LiberaHabilidadeDoNovoNivel()
    {
        // Arrange: no nível 1 a habilidade de nível 2 é recusada
        var guerreiro = new Guerreiro("Aragorn", "Humano", "Leal Bom", 1);
        Assert.DoesNotContain(guerreiro.Habilidades, h => h.Nome == "Pele Endurecida");

        // Act
        guerreiro.AdicionarExperiencia(100);

        // Assert
        Assert.Equal(2, guerreiro.Nivel);
        Assert.Contains(guerreiro.Habilidades, h => h.Nome == "Pele Endurecida");
    }

    [Fact(DisplayName = "CT10 - Usar munição com quantidade negativa é recusado")]
    public void CT10_UsarMunicaoNegativa_EhRecusado()
    {
        // Arrange: 20 flechas de 0,1 kg
        var flechas = new ItemMunicao("Flechas", 0.1, 2m, 20, "Flecha");

        // Act
        bool usou = flechas.Usar(-5);

        // Assert
        Assert.False(usou);
        Assert.Equal(20, flechas.Quantidade);
    }
}
