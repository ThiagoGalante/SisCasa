const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const supabase = require('../supabaseClient');
const pool = require('../db');

function parseArgs(argv) {
  const out = {};
  for (const arg of argv) {
    const m = arg.match(/^--([^=]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

async function findAuthUserByEmail(email) {
  const target = email.toLowerCase();
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const users = data?.users || [];
    const hit = users.find(u => (u.email || '').toLowerCase() === target);
    if (hit) return hit;
    if (users.length < 200) return null;
    page += 1;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const email = args.email || process.env.ADMIN_EMAIL || 'admin@siscasa.local';
  const nome = args.nome || process.env.ADMIN_NOME || 'Administrador';
  let password = args.password || process.env.ADMIN_PASSWORD || '';
  let generated = false;
  if (!password) {
    password = crypto.randomBytes(12).toString('base64url');
    generated = true;
  }

  let authUser = await findAuthUserByEmail(email);
  if (authUser) {
    console.log(`[seed-admin] Auth user already exists for ${email} (id=${authUser.id}) — skipping createUser`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome_completo: nome },
    });
    if (error) throw error;
    authUser = data.user;
    console.log(`[seed-admin] Created auth user ${email} (id=${authUser.id})`);
    if (generated) {
      const banner = '='.repeat(60);
      console.log(`\n${banner}\nSAVE THIS PASSWORD — it will not be shown again:\n  ${password}\n${banner}\n`);
    }
  }

  const result = await pool.query(
    `INSERT INTO USUARIOS (SUPABASE_USER_ID, EMAIL, NOME_COMPLETO, ATIVO)
     VALUES ($1, $2, $3, TRUE)
     ON CONFLICT (SUPABASE_USER_ID) DO NOTHING
     RETURNING ID_USUARIO`,
    [authUser.id, email, nome]
  );
  if (result.rowCount > 0) {
    console.log(`[seed-admin] Inserted USUARIOS row id=${result.rows[0].id_usuario}`);
  } else {
    console.log(`[seed-admin] USUARIOS row already exists for supabase_user_id=${authUser.id} — skipping insert`);
  }
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('[seed-admin] FAILED:', err.message || err);
    process.exit(1);
  })
  .finally(() => pool.end().catch(() => {}));
