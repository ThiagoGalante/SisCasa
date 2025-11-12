const getLookupId = require('../../utils/getLookupId');

describe('getLookupId', () => {
  let mockClient;

  beforeEach(() => {
    mockClient = {
      query: jest.fn()
    };
  });

  describe('CT-CB-001: Cobertura da Função getLookupId', () => {
    test('Caminho 1: Valor encontrado na tabela', async () => {
      mockClient.query.mockResolvedValue({
        rows: [{ cod_rac: 1 }]
      });

      const result = await getLookupId(mockClient, 'RACA', 'DESC_RAC', 'Branca');
      
      expect(result).toBe(1);
      expect(mockClient.query).toHaveBeenCalledWith(
        "SELECT cod_rac FROM RACA WHERE DESC_RAC ILIKE $1",
        ['Branca']
      );
    });

    test('Caminho 2: Valor não encontrado (retorna null)', async () => {
      mockClient.query.mockResolvedValue({
        rows: []
      });

      const result = await getLookupId(mockClient, 'RACA', 'DESC_RAC', 'Inexistente');
      
      expect(result).toBeNull();
      expect(mockClient.query).toHaveBeenCalled();
    });

    test('Caminho 3: Valor nulo (retorna null imediatamente)', async () => {
      const result = await getLookupId(mockClient, 'RACA', 'DESC_RAC', null);
      
      expect(result).toBeNull();
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    test('Caminho 4: Tabela GRAU_PARENTESCO (exceção de ID column)', async () => {
      mockClient.query.mockResolvedValue({
        rows: [{ cod_gpa: 5 }]
      });

      const result = await getLookupId(mockClient, 'GRAU_PARENTESCO', 'DESC_GPA', 'Pai');
      
      expect(result).toBe(5);
      expect(mockClient.query).toHaveBeenCalledWith(
        "SELECT cod_gpa FROM GRAU_PARENTESCO WHERE DESC_GPA ILIKE $1",
        ['Pai']
      );
    });

    test('Valor vazio (string vazia) retorna null', async () => {
      const result = await getLookupId(mockClient, 'RACA', 'DESC_RAC', '');
      
      expect(result).toBeNull();
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    test('Case-insensitive search funciona', async () => {
      mockClient.query.mockResolvedValue({
        rows: [{ cod_rac: 2 }]
      });

      await getLookupId(mockClient, 'RACA', 'DESC_RAC', 'BRANCA');
      
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        ['BRANCA']
      );
    });
  });
});

