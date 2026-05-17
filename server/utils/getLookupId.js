const getLookupId = async (client, tableName, columnName, value) => {
  if (!value) return null;
  // Trata exceção para GRAU_PARENTESCO, cuja PK é COD_GPA (não segue o padrão cod_xxx)
  const idColumn = tableName === 'GRAU_PARENTESCO' ? 'cod_gpa' : `cod_${tableName.toLowerCase().substring(0, 3)}`;
  const query = `SELECT ${idColumn} FROM ${tableName} WHERE ${columnName} ILIKE $1`;
  const result = await client.query(query, [value]);
  if (result.rows.length > 0) {
    return result.rows[0][idColumn];
  }
  console.warn(`Valor '${value}' não encontrado na tabela '${tableName}'.`);
  return null;
};

module.exports = getLookupId;
