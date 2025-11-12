const app = require('./app');
const pool = require('./db');

const port = 5000; // Porta que o servidor irá escutar

console.log('Conectando ao banco de dados...');
pool.connect((err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados', err.stack);
  } else {
    console.log('Conexão com o banco de dados estabelecida com sucesso!');
  }
});

// --- Inicia o servidor ---
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});