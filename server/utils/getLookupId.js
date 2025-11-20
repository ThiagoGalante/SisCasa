// Função auxiliar para buscar o ID de uma tabela de lookup.
// Ex: getLookupId('RACA', 'DESC_RAC', 'Branca') -> retorna o COD_RAC
const getLookupId = async (client, tableName, columnName, value) => {
  if (!value) return null;
  // Trata a exceção para a tabela GRAU_PARENTESCO, cuja PK é COD_GPA
  const idColumn = tableName === 'GRAU_PARENTESCO' ? 'cod_gpa' : `cod_${tableName.toLowerCase().substring(0, 3)}`;
  const query = `SELECT ${idColumn} FROM ${tableName} WHERE ${columnName} ILIKE $1`;
  const result = await client.query(query, [value]);
  if (result.rows.length > 0) {
    return result.rows[0][idColumn];
  }
  // Opcional: Inserir o novo valor se não existir.
  // Por simplicidade, aqui apenas retornamos null se não encontrado.
  // Para produção, você pode querer uma lógica mais robusta.
  console.warn(`Valor '${value}' não encontrado na tabela '${tableName}'.`);
  return null;
};

module.exports = getLookupId;

