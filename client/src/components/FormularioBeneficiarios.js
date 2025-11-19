import React, { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useParams, useNavigate } from "react-router-dom"; // Importar hooks
import "./FormularioBeneficiarios.css";

const FormularioBeneficiarios = () => {
  const { id } = useParams(); // Obter o ID da URL
  const navigate = useNavigate(); // Hook para navegar
  const isEditing = !!id; // Modo de edição se o ID existir

  const { register, handleSubmit, control, reset } = useForm({
    defaultValues: {
      responsaveis: [{ nome: "", parentesco: "", endereco: "", fone: "" }],
      familia: [{ nome: "", parentesco: "", endereco: "", fone: "" }],
    },
  });

  const { fields: responsaveisFields, append: addResponsavel, remove: removeResponsavel } =
    useFieldArray({ control, name: "responsaveis" });

  const { fields: familiaFields, append: addFamilia, remove: removeFamilia } =
    useFieldArray({ control, name: "familia" });

  const [opcoes, setOpcoes] = useState({
    tiposBeneficio: [],
    cidades: [],
    racas: [],
    religioes: [],
    hospitais: [],
    grausParentesco: [],
  });

  useEffect(() => {
    // Carrega as opções dos selects (cidades, raças, etc.)
    const carregarOpcoes = async () => {
      try {
        const [
          tiposBeneficioRes,
          cidadesRes,
          racasRes,
          religioesRes,
          hospitaisRes,
          grausParentescoRes,
        ] = await Promise.all([
          fetch("/api/tipos-beneficio").catch(() => ({ json: async () => [] })),
          fetch("/api/cidades").catch(() => ({ json: async () => [] })),
          fetch("/api/racas").catch(() => ({ json: async () => [] })),
          fetch("/api/religioes").catch(() => ({ json: async () => [] })),
          fetch("/api/hospitais").catch(() => ({ json: async () => [] })),
          fetch("/api/graus-parentesco").catch(() => ({ json: async () => [] })),
        ]);
        setOpcoes({
          tiposBeneficio: await tiposBeneficioRes.json(),
          cidades: await cidadesRes.json(),
          racas: await racasRes.json(),
          religioes: await religioesRes.json(),
          hospitais: await hospitaisRes.json(),
          grausParentesco: await grausParentescoRes.json(),
        });
      } catch (err) {
        console.warn("Erro ao carregar opções (ignorável em dev):", err);
      }
    };
    carregarOpcoes();

    // Se estiver no modo de edição, busca os dados do beneficiário
    if (isEditing) {
      const fetchBeneficiario = async () => {
        try {
          const response = await fetch(`/api/beneficiarios/${id}`);
          if (!response.ok) {
            throw new Error("Beneficiário não encontrado");
          }
          const data = await response.json();
          
          // Formata as datas para o formato YYYY-MM-DD antes de popular o formulário
          const formattedData = {
            ...data,
            data_cad: data.data_cad ? new Date(data.data_cad).toISOString().split('T')[0] : '',
            data_nasc: data.data_nasc ? new Date(data.data_nasc).toISOString().split('T')[0] : '',
          };

          reset(formattedData); // Popula o formulário com os dados
        } catch (error) {
          console.error("Erro ao buscar beneficiário:", error);
          alert("Falha ao carregar dados do beneficiário.");
          navigate("/beneficiarios"); // Redireciona se não encontrar
        }
      };
      fetchBeneficiario();
    }
  }, [id, isEditing, reset, navigate]);

  const onSubmit = async (data) => {
    const url = isEditing ? `/api/beneficiarios/${id}` : "/api/beneficiarios";
    const method = isEditing ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Erro ao salvar");
      }

      alert(`Beneficiário ${isEditing ? 'atualizado' : 'salvo'} com sucesso!`);
      
      if (isEditing) {
        navigate("/beneficiarios"); // Volta para a lista após editar
      } else {
        reset(); // Limpa o formulário após criar um novo
      }

    } catch (err) {
      console.error("Falha ao submeter o formulário:", err);
      alert(`Falha ao salvar: ${err.message}`);
    }
  };

  return (
    <div className="form-container">
      <div className="form-header">
        <button type="button" className="btn-back" onClick={() => navigate('/beneficiarios')}>
          &larr; Voltar para a Lista
        </button>
      </div>
      <h2 className="title">{isEditing ? "Editar Beneficiário" : "Cadastrar Beneficiário"}</h2>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Linha 1: Nro, Data, Tipo */}
        <div className="form-row">
          <div className="form-field field-md">
            <label>Nro. Cad.</label>
            <input {...register("nro_cad")} />
          </div>
          <div className="form-field field-md">
            <label>Data Cad.</label>
            <input type="date" {...register("data_cad")} />
          </div>
          <div className="form-field field-md">
            <label>Tipo de Benefício</label>
            <select {...register("tipo_beneficio")}>
              <option value="">Selecione o tipo</option>
              {opcoes.tiposBeneficio.map((o) => (
                <option key={o.id ?? o.nome} value={o.id ?? o.nome}>
                  {o.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Nome | Data de Nascimento | Email */}
        <div className="form-row">
          <div className="form-field field-lg">
            <label>Nome</label>
            <input {...register("nome")} />
          </div>
          <div className="form-field field-md">
            <label>Data Nasc.</label>
            <input type="date" {...register("data_nasc")} />
          </div>
          <div className="form-field field-md">
            <label>Email</label>
            <input type="email" {...register("email")} />
          </div>
        </div>

        {/* Endereço | Cidade | CEP */}
        <div className="form-row">
          <div className="form-field field-lg">
            <label>Endereço</label>
            <input {...register("endereco")} />
          </div>
          <div className="form-field field-md">
            <label>Cidade</label>
            <select {...register("cidade")}>
              <option value="">Selecione a cidade</option>
              {opcoes.cidades.map((o) => (
                <option key={o.nome} value={o.nome}>
                  {o.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field field-md">
            <label>CEP</label>
            <input {...register("cep")} />
          </div>
        </div>

        {/* Sexo | Raça | Religião | Fumante */}
        <div className="form-row">
          <div className="form-field field-md">
            <label>Sexo</label>
            <select {...register("sexo")}>
              <option value="">Selecione</option>
              <option>Masculino</option>
              <option>Feminino</option>
            </select>
          </div>
          <div className="form-field field-md">
            <label>Raça</label>
            <select {...register("raca")}>
              <option value="">Selecione</option>
              {opcoes.racas.map((o) => <option key={o.nome} value={o.nome}>{o.nome}</option>)}
            </select>
          </div>
          <div className="form-field field-md">
            <label>Religião</label>
            <select {...register("religiao")}>
              <option value="">Selecione</option>
              {opcoes.religioes.map((o) => <option key={o.nome} value={o.nome}>{o.nome}</option>)}
            </select>
          </div>
          <div className="form-field field-sm">
            <label>Fumante</label>
            <select {...register("fumante")}>
              <option value="">Selecione</option>
              <option value="sim">Sim</option>
              <option value="nao">Não</option>
            </select>
          </div>
        </div>

        {/* CPF | RG | Fone | Profissao*/}
        <div className="form-row">
          <div className="form-field field-md">
            <label>CPF</label>
            <input {...register("cpf")} />
          </div>
          <div className="form-field field-md">
            <label>RG</label>
            <input {...register("rg")} />
          </div>
          <div className="form-field field-md">
            <label>Fone</label>
            <input {...register("fone")} />
          </div>          
          <div className="form-field field-md">
            <label>Profissão</label>
            <input {...register("profissao")} />
          </div>
        </div>

        {/* Hospital | Mat. Hospital */}
        <div className="form-row">
          <div className="form-field field-lg">
            <label>Hospital</label>
            <select {...register("hospital")}>
              <option value="">Selecione o hospital</option>
              {opcoes.hospitais.map((o) => <option key={o.nome} value={o.nome}>{o.nome}</option>)}
            </select>
          </div>
          <div className="form-field field-md">
            <label>Mat. Hospital</label>
            <input {...register("mat_hospital")} />
          </div>
        </div>

        {/* Patologia | Medicacao */}
        <div className="form-row">
          <div className="form-field field-lg">
            <label>Patologia</label>
            <input {...register("patologia")} />
          </div>
          <div className="form-field field-lg">
            <label>Med. em Uso</label>
            <input {...register("medicacao")} />
          </div>
        </div>

        {/* Observação */}
        <div className="form-row">
          <div className="form-field field-lg">
            <label>Observação</label>
            <textarea {...register("observacao")} />
          </div>
        </div>

        {/* ===== Responsáveis (lista dinâmica, layout em grid flex) ===== */}
        <div className="section-table">
          <h3>Responsáveis</h3>

          <div className="table-header">
            <span className="col-nome">Nome</span>
            <span className="col-parentesco">Parentesco</span>
            <span className="col-endereco">Endereço</span>
            <span className="col-fone">Fone</span>
            <span className="col-acao">Ação</span>
          </div>

          {responsaveisFields.map((item, idx) => (
            <div className="table-row" key={item.id}>
              <div className="col-nome">
                <input {...register(`responsaveis.${idx}.nome`)} />
              </div>
              <div className="col-parentesco">
                <select {...register(`responsaveis.${idx}.parentesco`)}>
                  <option value="">Selecione</option>
                  {opcoes.grausParentesco.map((g) => <option key={g.nome} value={g.nome}>{g.nome}</option>)}
                </select>
              </div>
              <div className="col-endereco">
                <input {...register(`responsaveis.${idx}.endereco`)} />
              </div>
              <div className="col-fone">
                <input {...register(`responsaveis.${idx}.fone`)} />
              </div>
              <div className="col-acao">
                <button type="button" className="btn-delete" onClick={() => removeResponsavel(idx)} title="Remover">
                  🗑
                </button>
              </div>
            </div>
          ))}

          <button type="button" className="btn-add" onClick={() => addResponsavel({ nome: "", parentesco: "", endereco: "", fone: "" })}>
            Adicionar Responsável
          </button>
        </div>

        {/* ===== Composição Familiar ===== */}
        <div className="section-table">
          <h3>Composição Familiar</h3>

          <div className="table-header">
            <span className="col-nome">Nome</span>
            <span className="col-parentesco">Parentesco</span>
            <span className="col-endereco">Endereço</span>
            <span className="col-fone">Fone</span>
            <span className="col-acao">Ação</span>
          </div>

          {familiaFields.map((item, idx) => (
            <div className="table-row" key={item.id}>
              <div className="col-nome">
                <input {...register(`familia.${idx}.nome`)} />
              </div>
              <div className="col-parentesco">
                <select {...register(`familia.${idx}.parentesco`)}>
                  <option value="">Selecione</option>
                  {opcoes.grausParentesco.map((g) => <option key={g.nome} value={g.nome}>{g.nome}</option>)}
                </select>
              </div>
              <div className="col-endereco">
                <input {...register(`familia.${idx}.endereco`)} />
              </div>
              <div className="col-fone">
                <input {...register(`familia.${idx}.fone`)} />
              </div>
              <div className="col-acao">
                <button type="button" className="btn-delete" onClick={() => removeFamilia(idx)} title="Remover">
                  🗑
                </button>
              </div>
            </div>
          ))}

          <button type="button" className="btn-add" onClick={() => addFamilia({ nome: "", parentesco: "", endereco: "", fone: "" })}>
            Adicionar Membro
          </button>
        </div>

        {/* Ações finais */}
        <div className="form-actions">
          <button type="button" className="btn-clear" onClick={() => reset()}>
            Limpar
          </button>
          <button type="submit" className="btn-save">
            {isEditing ? "Atualizar" : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FormularioBeneficiarios;
