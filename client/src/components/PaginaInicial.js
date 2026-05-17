import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './PaginaInicial.css';

const STATS = [
  { valor: '40.092', label: 'Atendimentos em 2025' },
  { valor: '600',    label: 'Pessoas hospedadas' },
  { valor: '17.357', label: 'Refeições servidas' },
  { valor: '596',    label: 'Cestas distribuídas' },
];

const PROGRAMAS = [
  {
    titulo: 'Hospedaria',
    descricao: 'Moradia para famílias do interior acompanhando crianças em tratamento em São Paulo.',
    icone: '🏠',
    rota: null,
  },
  {
    titulo: 'Tempo de Aconchego',
    descricao: 'Refeições, lavanderia, banho e descanso para famílias que aguardam atendimento.',
    icone: '☕',
    rota: null,
  },
  {
    titulo: 'De Volta para Casa',
    descricao: 'Distribuição de cestas básicas e itens de necessidade para famílias assistidas.',
    icone: '🧺',
    rota: '/cestas-basicas',
  },
  {
    titulo: 'Acolhimento da Criança',
    descricao: 'Atividades lúdicas, contação de histórias e recreação para as crianças atendidas.',
    icone: '🎨',
    rota: null,
  },
];

const ATALHOS = [
  { titulo: 'Beneficiários',  descricao: 'Gerenciar cadastro de beneficiários',  icone: '👥', rota: '/beneficiarios' },
  { titulo: 'Cestas Básicas', descricao: 'Controle de estoque e distribuição',   icone: '📦', rota: '/cestas-basicas' },
  { titulo: 'Doações',        descricao: 'Registrar e consultar doações',         icone: '❤️', rota: '/doacoes' },
];

export default function PaginaInicial() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const primeiroNome = user?.user_metadata?.nome_completo?.split(' ')[0]
    ?? user?.email?.split('@')[0]
    ?? 'usuário';

  return (
    <div className="pi-container">
      {/* Hero */}
      <section className="pi-hero">
        <div className="pi-hero-content">
          <div className="pi-hero-header">
            <img src="/logo-casa.png" alt="Logo Casa do Aconchego" className="pi-hero-logo" />
            <h1>Casa do Aconchego</h1>
          </div>
          <p className="pi-hero-sub">
            Bem-vindo(a), <strong>{primeiroNome}</strong>. Este é o sistema de gestão da Casa do Aconchego —
            organização dedicada ao cuidado de crianças em tratamento e suas famílias desde 2008.
          </p>
        </div>
      </section>

      {/* Acesso rápido */}
      <section className="pi-section">
        <h2 className="pi-section-title">Acesso Rápido</h2>
        <div className="pi-atalhos-grid">
          {ATALHOS.map((a) => (
            <button key={a.rota} className="pi-atalho-card" onClick={() => navigate(a.rota)}>
              <span className="pi-atalho-icone">{a.icone}</span>
              <span className="pi-atalho-titulo">{a.titulo}</span>
              <span className="pi-atalho-desc">{a.descricao}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Impacto 2025 */}
      <section className="pi-section">
        <h2 className="pi-section-title">Impacto em 2025</h2>
        <div className="pi-stats-grid">
          {STATS.map((s) => (
            <div key={s.label} className="pi-stat-card">
              <span className="pi-stat-valor">{s.valor}</span>
              <span className="pi-stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Programas */}
      <section className="pi-section">
        <h2 className="pi-section-title">Nossos Programas</h2>
        <div className="pi-programas-grid">
          {PROGRAMAS.map((p) => (
            <div
              key={p.titulo}
              className={`pi-programa-card${p.rota ? ' pi-programa-card--link' : ''}`}
              onClick={p.rota ? () => navigate(p.rota) : undefined}
            >
              <span className="pi-programa-icone">{p.icone}</span>
              <div>
                <h3 className="pi-programa-titulo">{p.titulo}</h3>
                <p className="pi-programa-desc">{p.descricao}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Missão e Visão */}
      <section className="pi-section pi-missao-section">
        <div className="pi-missao-grid">
          <div className="pi-missao-card">
            <h3>Missão</h3>
            <p>
              Oferecer cuidado extra-hospitalar a crianças com doenças graves em tratamento no
              Instituto da Criança (ICR) e no ITACI, junto a seus cuidadores — fornecendo moradia,
              refeições e atividades de apoio social, espiritual e psicológico.
            </p>
          </div>
          <div className="pi-missao-card">
            <h3>Visão</h3>
            <p>
              Ser referência no cuidado extra-hospitalar de populações vulneráveis no ICR e no ITACI,
              promovendo ações que desenvolvam resiliência, reduzam o abandono do tratamento e
              melhorem os resultados.
            </p>
          </div>
        </div>
      </section>

      {/* Contato */}
      <section className="pi-section">
        <h2 className="pi-section-title">Contato</h2>
        <div className="pi-contato-grid">
          <div className="pi-contato-item">
            <span className="pi-contato-icone">📍</span>
            <div>
              <strong>Endereço</strong>
              <p>R. Veríssimo Glória, 126 — Sumaré, São Paulo / SP, 01251-140</p>
            </div>
          </div>
          <div className="pi-contato-item">
            <span className="pi-contato-icone">📞</span>
            <div>
              <strong>Telefones</strong>
              <p>(11) 2507-9294 &nbsp;|&nbsp; (11) 99310-4374</p>
            </div>
          </div>
          <div className="pi-contato-item">
            <span className="pi-contato-icone">🕐</span>
            <div>
              <strong>Horário de Funcionamento</strong>
              <p>Segunda a sexta — 8h às 15h</p>
            </div>
          </div>
          <div className="pi-contato-item">
            <span className="pi-contato-icone">🌐</span>
            <div>
              <strong>Redes Sociais</strong>
              <p>
                <a href="https://www.instagram.com/casadoaconchego/" target="_blank" rel="noreferrer">Instagram</a>
                {' · '}
                <a href="https://www.facebook.com/iba.aconchego/" target="_blank" rel="noreferrer">Facebook</a>
                {' · '}
                <a href="https://www.youtube.com/@casadoaconchego" target="_blank" rel="noreferrer">YouTube</a>
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="pi-footer">
        <p>Fundada em 19 de agosto de 2008 · Certificada CEBAS 2023 · Registrada CMDCA/SP 2024</p>
      </footer>
    </div>
  );
}
