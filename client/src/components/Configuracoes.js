import React, { useEffect, useState, useCallback } from "react";
import { authenticatedFetch } from "../utils/api";
import "./Configuracoes.css";

// US14 — Módulo de Configurações: gestão das tabelas de apoio.
// Cada recurso mapeia uma rota /api/config/:recurso (CRUD genérico no backend).
const RECURSOS = [
  { chave: "hospitais", titulo: "Hospitais", rotulo: "Nome do hospital" },
  { chave: "ufs", titulo: "UF", rotulo: "Nome da UF" },
  { chave: "religioes", titulo: "Religião", rotulo: "Descrição da religião" },
  { chave: "racas", titulo: "Raça/Cor", rotulo: "Descrição da raça/cor" },
];

const Configuracoes = () => {
  const [recursoAtivo, setRecursoAtivo] = useState(RECURSOS[0].chave);
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [novoNome, setNovoNome] = useState("");
  const [editando, setEditando] = useState(null); // { id, nome }

  const recurso = RECURSOS.find((r) => r.chave === recursoAtivo);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      const res = await authenticatedFetch(`/api/config/${recursoAtivo}`);
      if (!res.ok) throw new Error("Falha ao carregar registros.");
      setItens(await res.json());
    } catch (e) {
      setErro(e.message || "Erro ao carregar.");
      setItens([]);
    } finally {
      setCarregando(false);
    }
  }, [recursoAtivo]);

  useEffect(() => {
    carregar();
    setEditando(null);
    setNovoNome("");
  }, [carregar]);

  const criar = async (e) => {
    e.preventDefault();
    if (!novoNome.trim()) return;
    try {
      const res = await authenticatedFetch(`/api/config/${recursoAtivo}`, {
        method: "POST",
        body: JSON.stringify({ nome: novoNome.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Falha ao criar.");
      }
      setNovoNome("");
      carregar();
    } catch (e) {
      alert(e.message);
    }
  };

  const salvarEdicao = async (id) => {
    if (!editando?.nome.trim()) return;
    try {
      const res = await authenticatedFetch(`/api/config/${recursoAtivo}/${id}`, {
        method: "PUT",
        body: JSON.stringify({ nome: editando.nome.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Falha ao atualizar.");
      }
      setEditando(null);
      carregar();
    } catch (e) {
      alert(e.message);
    }
  };

  const excluir = async (id) => {
    if (!window.confirm("Confirma a exclusão deste registro?")) return;
    try {
      const res = await authenticatedFetch(`/api/config/${recursoAtivo}/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Falha ao excluir.");
      }
      carregar();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="config-container">
      <h2 className="title">⚙️ Configurações — Tabelas de Apoio</h2>
      <p className="config-intro">
        Gerencie os dados de domínio do sistema. Alterações refletem nos formulários de cadastro.
      </p>

      <div className="config-tabs">
        {RECURSOS.map((r) => (
          <button
            key={r.chave}
            className={`config-tab ${r.chave === recursoAtivo ? "ativa" : ""}`}
            onClick={() => setRecursoAtivo(r.chave)}
          >
            {r.titulo}
          </button>
        ))}
      </div>

      <form className="config-novo" onSubmit={criar}>
        <input
          type="text"
          placeholder={recurso.rotulo}
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          aria-label={recurso.rotulo}
        />
        <button type="submit" className="btn-save">+ Adicionar</button>
      </form>

      {erro && <p className="config-erro">{erro}</p>}
      {carregando ? (
        <p>Carregando…</p>
      ) : (
        <table className="config-tabela">
          <thead>
            <tr>
              <th style={{ width: "80px" }}>ID</th>
              <th>{recurso.titulo}</th>
              <th style={{ width: "180px" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {itens.length === 0 && (
              <tr><td colSpan="3" className="config-vazio">Nenhum registro.</td></tr>
            )}
            {itens.map((it) => (
              <tr key={it.id}>
                <td>{it.id}</td>
                <td>
                  {editando?.id === it.id ? (
                    <input
                      type="text"
                      value={editando.nome}
                      onChange={(e) => setEditando({ id: it.id, nome: e.target.value })}
                    />
                  ) : (
                    it.nome
                  )}
                </td>
                <td>
                  {editando?.id === it.id ? (
                    <>
                      <button className="btn-add" onClick={() => salvarEdicao(it.id)}>Salvar</button>
                      <button className="btn-clear" onClick={() => setEditando(null)}>Cancelar</button>
                    </>
                  ) : (
                    <>
                      <button className="btn-edit" onClick={() => setEditando({ id: it.id, nome: it.nome })}>Editar</button>
                      <button className="btn-delete" onClick={() => excluir(it.id)}>Excluir</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Configuracoes;
