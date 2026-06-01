/* Gera os HTMLs antes/depois do FormularioBeneficiarios usando o CSS real do projeto.
   Renderização fiel do layout (não é captura do app em produção). */
const fs = require('fs');
const path = require('path');

const css = fs.readFileSync(
  path.join(__dirname, '../../../client/src/components/FormularioBeneficiarios.css'),
  'utf8'
);

const extra = `
  body { background:#eef1f4; margin:0; padding:24px; }
  .novo input, .novo select, .novo textarea { border-color:#008871 !important; background:#f0fbf8; }
  .novo label::after { content:" ✦ novo"; color:#008871; font-weight:700; font-size:.7rem; }
  .badge { display:inline-block; background:#008871; color:#fff; font-size:.7rem; font-weight:700;
           padding:2px 8px; border-radius:10px; margin-left:8px; vertical-align:middle; }
  .proj-box { display:flex; flex-wrap:wrap; gap:12px; padding:8px 0; }
  .proj-box label { display:flex; align-items:center; gap:6px; font-weight:500; color:#333; }
  .foto-prev { width:140px; height:90px; background:#dfeee9; border:1px dashed #008871;
               border-radius:8px; display:flex; align-items:center; justify-content:center;
               color:#008871; font-size:.8rem; margin-top:8px; }
  .legenda { max-width:1000px; margin:0 auto 12px; font-family:Arial,sans-serif; color:#555; font-size:.85rem; }
`;

const row = (fields) => `<div class="form-row">${fields}</div>`;
const f = (label, kind = 'input', opts = {}) => {
  const cls = `form-field ${opts.size || 'field-md'} ${opts.novo ? 'novo' : ''}`;
  let ctrl;
  if (kind === 'select') ctrl = `<select><option>${opts.ph || 'Selecione'}</option></select>`;
  else if (kind === 'textarea') ctrl = `<textarea></textarea>`;
  else if (kind === 'file') ctrl = `<input type="file">`;
  else ctrl = `<input ${opts.ro ? 'readonly style="background:#e9ecef"' : ''} value="${opts.val || ''}">`;
  return `<div class="${cls}"><label>${label}</label>${ctrl}</div>`;
};

const respTable = `
  <div class="section-table">
    <h3>Responsáveis</h3>
    <div class="table-header"><span class="col-nome">Nome</span><span class="col-parentesco">Parentesco</span><span class="col-endereco">Endereço</span><span class="col-fone">Fone</span><span class="col-acao">Ação</span></div>
    <div class="table-row"><div class="col-nome"><input value="Sonia Gregoria"></div><div class="col-parentesco"><select><option>MÃE</option></select></div><div class="col-endereco"><input></div><div class="col-fone"><input></div><div class="col-acao"><button class="btn-delete">🗑</button></div></div>
    <button class="btn-add">+ Adicionar Responsável</button>
  </div>`;

function page(titulo, legenda, corpo) {
  return `<!doctype html><html lang="pt-br"><head><meta charset="utf-8"><style>${css}${extra}</style></head>
  <body><div class="legenda">${legenda}</div>
  <div class="form-container"><h2 class="title">${titulo}</h2><form>${corpo}</form></div></body></html>`;
}

/* ----- ANTES ----- */
const antes = page(
  'Cadastrar Beneficiário',
  'SisCasa — Módulo de Beneficiários (ANTES). Renderização do formulário com o CSS real do projeto.',
  [
    row(f('Nro. Cad.', 'input', { ro: true, val: '20260002' }) + f('Data Cad.', 'input') + f('Tipo de Benefício', 'select')),
    row(f('Nome', 'input', { size: 'field-lg', val: 'Ana Maryshka Vila Huayhua' }) + f('Data Nasc.', 'input') + f('Email', 'input')),
    row(f('Endereço', 'input', { size: 'field-lg', val: 'Rua Adolfo Lutz, 19' }) + f('UF', 'select', { size: 'field-sm' }) + f('Cidade', 'select') + f('CEP', 'input')),
    row(f('Sexo', 'select') + f('Raça', 'select') + f('Religião', 'select') + f('Fumante', 'select', { size: 'field-sm' })),
    row(f('CPF', 'input') + f('RG', 'input', { val: '14483738' }) + f('Fone', 'input') + f('Profissão', 'input')),
    row(f('Hospital', 'select', { size: 'field-lg' }) + f('Mat. Hospital', 'input')),
    row(f('Patologia', 'input', { size: 'field-lg' }) + f('Med. em Uso', 'input', { size: 'field-lg' })),
    row(f('Observação', 'textarea', { size: 'field-lg' })),
    respTable,
  ].join('')
);

/* ----- DEPOIS ----- */
const depois = page(
  'Cadastrar Beneficiário <span class="badge">feedback do PO</span>',
  'SisCasa — Módulo de Beneficiários (DEPOIS). Campos marcados com ✦ foram adicionados conforme o feedback do PO.',
  [
    row(f('Nro. Cad.', 'input', { ro: true, val: '20260002' }) + f('Data Cad.', 'input') + f('Tipo de Benefício', 'select')),
    row(f('Nome', 'input', { size: 'field-lg', val: 'Ana Maryshka Vila Huayhua' }) + f('Data Nasc.', 'input') + f('Email', 'input')),
    row(f('Endereço', 'input', { size: 'field-lg', val: 'Rua Adolfo Lutz, 19' }) + f('UF', 'select', { size: 'field-sm' }) + f('Cidade', 'select') + f('CEP', 'input')),
    row(f('Bairro', 'input', { novo: true, val: 'Cezar de Souza' }) + f('Contato de Emergência', 'input', { novo: true, val: 'Sonia Gregoria' }) + f('Fone de Emergência', 'input', { novo: true })),
    row(f('Sexo', 'select') + f('Raça', 'select') + f('Religião', 'select') + f('Fumante', 'select', { size: 'field-sm' })),
    row(f('CPF', 'input') + f('RG', 'input', { val: '14483738' }) + f('Fone', 'input') + f('Profissão', 'input')),
    row(f('Hospital', 'select', { size: 'field-lg' }) + f('Mat. Hospital', 'input')),
    row(f('Patologia', 'input', { size: 'field-lg' }) + f('Med. em Uso', 'input', { size: 'field-lg' })),
    row(f('Médico', 'input', { novo: true, val: 'Dra. House' }) + f('Restrição Alimentar', 'input', { novo: true, size: 'field-lg', val: 'Sem lactose' }) + f('Restrição Médica', 'input', { novo: true, size: 'field-lg', val: 'Alergia a dipirona' })),
    row(f('Observação', 'textarea', { size: 'field-lg' })),
    `<div class="form-row"><div class="form-field field-lg novo"><label>Foto</label><input type="file"><div class="foto-prev">pré-visualização da foto</div></div></div>`,
    `<div class="section-table"><h3>Projetos <span class="badge">novo</span></h3><div class="proj-box"><label><input type="checkbox" checked> Hospedaria</label><label><input type="checkbox"> Tempo de Aconchego</label><label><input type="checkbox" checked> De Volta para Casa</label><label><input type="checkbox"> Acolhimento da Criança</label></div></div>`,
    respTable,
  ].join('')
);

fs.writeFileSync(path.join(__dirname, 'antes.html'), antes);
fs.writeFileSync(path.join(__dirname, 'depois.html'), depois);
console.log('HTMLs gerados: antes.html, depois.html');
