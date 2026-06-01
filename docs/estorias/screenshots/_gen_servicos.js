/* Renderização fiel (CSS real) da tela de listagem de Serviços de Apoio — v0. */
const fs = require('fs');
const path = require('path');

const vars = `:root{--color-primary:#008871;--color-primary-dark:#04674f;--color-primary-hover:#00735f;
  --color-text-muted:#6b7280;--color-danger:#dc3545;}`;
const css = fs.readFileSync(path.join(__dirname, '../../../client/src/components/ServicosApoio.css'), 'utf8');

const linhas = [
  ['Ana Maryshka Vila Huayhua', 'Refeição', '30/05/2026', 'Almoço servido'],
  ['Sonia Gregoria Huayhua', 'Lavanderia', '29/05/2026', '—'],
  ['Wara Clara Gomes', 'Banho', '29/05/2026', 'Família hospedada'],
  ['Belen Jhasmin Gomes', 'Transporte', '28/05/2026', 'Ida ao hospital'],
].map(([b, t, d, o]) => `<tr><td>${b}</td><td>${t}</td><td>${d}</td><td>${o}</td>
  <td class="acoes"><a class="link-editar" href="#">Editar</a><button class="link-excluir">Excluir</button></td></tr>`).join('');

const html = `<!doctype html><html lang="pt-br"><head><meta charset="utf-8">
<style>${vars} body{background:#eef1f4;margin:0;padding:24px;font-family:Arial,sans-serif;}${css}</style></head>
<body>
<div class="servicos-container">
  <div class="header-servicos"><h1>Serviços de Apoio</h1><button class="btn-primario">+ Novo Atendimento</button></div>
  <section class="historico-container">
    <h2>Atendimentos <span class="total-badge">(4)</span></h2>
    <div class="filtros">
      <input type="text" placeholder="Filtrar por beneficiário...">
      <select><option>Todos os tipos</option><option>Refeição</option><option>Banho</option></select>
      <label>De:<input type="date"></label>
      <label>Até:<input type="date"></label>
      <button class="btn-limpar">Limpar filtros</button>
    </div>
    <table class="tabela-historico">
      <thead><tr><th>Beneficiário</th><th>Tipo de Serviço</th><th>Data</th><th>Observação</th><th>Ações</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>
    <div class="paginacao"><button disabled>‹ Anterior</button><span>Página 1 de 1</span><button disabled>Próxima ›</button></div>
  </section>
</div>
</body></html>`;

fs.writeFileSync(path.join(__dirname, 'servicos-apoio.html'), html);
console.log('gerado servicos-apoio.html');
