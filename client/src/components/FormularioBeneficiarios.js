import React, { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useParams, useNavigate } from "react-router-dom"; // Importar hooks
import { authenticatedFetch } from "../utils/api";
import "./FormularioBeneficiarios.css";

const FormularioBeneficiarios = () => {
  const { id } = useParams(); // Obter o ID da URL
  const navigate = useNavigate(); // Hook para navegar
  const isEditing = !!id; // Modo de edição se o ID existir

  const { register, handleSubmit, control, reset, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      responsaveis: [{ nome: "", parentesco: "", endereco: "", fone: "" }],
      familia: [{ nome: "", parentesco: "", endereco: "", fone: "" }],
    },
  });

  const { fields: responsaveisFields, append: addResponsavel, remove: removeResponsavel } =
    useFieldArray({ control, name: "responsaveis" });

  const { fields: familiaFields, append: addFamilia, remove: removeFamilia } =
    useFieldArray({ control, name: "familia" });

  const selectedUf = watch("uf"); // "Escuta" as mudanças no campo UF

  const [opcoes, setOpcoes] = useState({
    tiposBeneficio: [],
    ufs: [],
    racas: [],
    religioes: [],
    hospitais: [],
    grausParentesco: [],
  });
  const [cidadesFiltradas, setCidadesFiltradas] = useState([]);

  useEffect(() => {
    // Carrega as opções dos selects (cidades, raças, etc.)
    const carregarOpcoes = async () => {
      try {
        const [
          tiposBeneficioRes,
          ufRes,
          racasRes,
          religioesRes,
          hospitaisRes,
          grausParentescoRes,
        ] = await Promise.all([
          fetch("/api/tipos-beneficio").catch(() => ({ json: async () => [] })),
          fetch("/api/ufs").catch(() => ({ json: async () => [] })),
          fetch("/api/racas").catch(() => ({ json: async () => [] })),
          fetch("/api/religioes").catch(() => ({ json: async () => [] })),
          fetch("/api/hospitais").catch(() => ({ json: async () => [] })),
          fetch("/api/graus-parentesco").catch(() => ({ json: async () => [] })),
        ]);
        setOpcoes({
          tiposBeneficio: await tiposBeneficioRes.json(),
          ufs: await ufRes.json(),
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
          const response = await authenticatedFetch(`/api/beneficiarios/${id}`);
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

          // Se houver uma UF nos dados, busca as cidades correspondentes
          if (formattedData.uf) {
            const cidadesResponse = await fetch(`/api/cidades/${formattedData.uf}`);
            setCidadesFiltradas(await cidadesResponse.json());
          }

          reset(formattedData); // Popula o formulário com os dados
        } catch (error) {
          console.error("Erro ao buscar beneficiário:", error);
          alert("Falha ao carregar dados do beneficiário.");
          navigate("/beneficiarios"); // Redireciona se não encontrar
        }
      };
      fetchBeneficiario();
    } else {
      // Se for um novo cadastro, busca o próximo número de cadastro
      const fetchProximoNroCadastro = async () => {
        try {
          const response = await authenticatedFetch('/api/beneficiarios/proximo-nro-cadastro');
          const data = await response.json();
          // Usa o setValue para atualizar o campo do formulário
          setValue('nro_cad', data.proximoNroCadastro);
        } catch (error) {
          console.error("Erro ao buscar próximo número de cadastro:", error);
        }
      };
      fetchProximoNroCadastro();
    }
  }, [id, isEditing, reset, navigate, setValue]);

  // Efeito para buscar cidades quando a UF muda
  useEffect(() => {
    const fetchCidades = async () => {
      if (selectedUf) {
        try {
          const response = await fetch(`/api/cidades/${selectedUf}`);
          const data = await response.json();
          setCidadesFiltradas(data);
          // Limpa o campo cidade se a UF for alterada
          if (!isEditing) { // Evita limpar ao carregar dados de edição
            setValue('cidade', '');
          }
        } catch (error) {
          console.error("Erro ao buscar cidades:", error);
          setCidadesFiltradas([]);
        }
      } else {
        // Se nenhuma UF for selecionada, limpa a lista de cidades
        setCidadesFiltradas([]);
      }
    };
    fetchCidades();
  }, [selectedUf, setValue, isEditing]);

  const onSubmit = async (data) => {
    // Validação para Responsáveis e Composição Familiar
    const validarPessoasRelacionadas = (pessoas, nomeSecao) => {
      for (const pessoa of pessoas) {
        // Verifica se a linha foi preenchida parcialmente
        const isRowPartiallyFilled = Object.values(pessoa).some(value => value && String(value).trim() !== '');

        if (isRowPartiallyFilled) {
          const nomeValido = pessoa.nome && pessoa.nome.trim() !== '';
          const parentescoValido = pessoa.parentesco && pessoa.parentesco.trim() !== '';

          if (!nomeValido || !parentescoValido) {
            alert(`Na seção '${nomeSecao}', todas as linhas preenchidas devem ter 'Nome' e 'Grau de Parentesco' definidos.`);
            return false; // Indica falha na validação
          }
        }
      }
      return true; // Indica sucesso na validação
    };

    if (!validarPessoasRelacionadas(data.responsaveis, 'Responsáveis')) {
      return; // Bloqueia o envio
    }

    if (!validarPessoasRelacionadas(data.familia, 'Composição Familiar')) {
      return; // Bloqueia o envio
    }

    // Validação para menor de idade
    if (data.data_nasc) {
      const hoje = new Date();
      const nascimento = new Date(data.data_nasc);
      let idade = hoje.getFullYear() - nascimento.getFullYear();
      const mes = hoje.getMonth() - nascimento.getMonth();
      if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
        idade--;
      }

      if (idade < 18) {
        // Verifica se há pelo menos um responsável com nome preenchido
        const temResponsavelValido = data.responsaveis.some(resp => resp && resp.nome && resp.nome.trim() !== '');
        if (!temResponsavelValido) {
          alert("Beneficiário é menor de idade. É obrigatório cadastrar pelo menos um responsável.");
          return; // Bloqueia o envio do formulário
        }
      }
    }

    // Se houver erros de validação padrão, não prosseguir
    if (Object.keys(errors).length > 0) {
      return;
    }

    const url = isEditing ? `/api/beneficiarios/${id}` : "/api/beneficiarios";
    const method = isEditing ? "PUT" : "POST";

    try {
      const res = await authenticatedFetch(url, {
        method,
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

  // Componente para exibir erros de validação
  const ErrorMessage = ({ field }) => errors[field] && <span className="error-message">{errors[field].message}</span>;

  return (
    <div className="form-container">
      <div className="form-header">
        <button type="button" className="btn-save" onClick={() => navigate('/beneficiarios')} style={{ marginRight: 'auto' }}>
          &larr; Voltar
        </button>
      </div>
      <h2 className="title">{isEditing ? "Editar Beneficiário" : "Cadastrar Beneficiário"}</h2>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Linha 1: Nro, Data, Tipo */}
        <div className="form-row">
          <div className="form-field field-md">
            <label>Nro. Cad.</label>
            <input {...register("nro_cad")} readOnly style={{ backgroundColor: '#e9ecef', cursor: 'not-allowed' }}/>
          </div>
          <div className="form-field field-md">
            <label>Data Cad.</label>
            <input type="date" {...register("data_cad", { required: "Data de cadastro é obrigatória." })} />
            <ErrorMessage field="data_cad" />
          </div>
          <div className="form-field field-md">
            <label>Tipo de Benefício</label>
            <select {...register("tipo_beneficio", { required: "Selecione um tipo de benefício." })}>
              <option value="">Selecione o tipo</option>
              {opcoes.tiposBeneficio.map((o) => (
                <option key={o.id ?? o.nome} value={o.id ?? o.nome}>
                  {o.nome}
                </option>
              ))}
            </select>
            <ErrorMessage field="tipo_beneficio" />
          </div>
        </div>

        {/* Nome | Data de Nascimento | Email */}
        <div className="form-row">
          <div className="form-field field-lg">
            <label>Nome</label>
            <input {...register("nome", { required: "N  ome é obrigatório." })} />
            <ErrorMessage field="nome" />
          </div>
          <div className="form-field field-md">
            <label>Data Nasc.</label>
            <input type="date" {...register("data_nasc", { required: "Data de nascimento é obrigatória." })} />
            <ErrorMessage field="data_nasc" />
          </div>
          <div className="form-field field-md">
            <label>Email</label>
            <input type="email" {...register("email")} />
          </div>
        </div>

        {/* Endereço | UF | Cidade | CEP */}
        <div className="form-row">
          <div className="form-field field-lg">
            <label>Endereço</label>
            <input {...register("endereco")} />
          </div>
          <div className="form-field field-sm">
            <label>UF</label>
            <select {...register("uf")}>
              <option value="">Selecione a UF</option>
              {opcoes.ufs.map((o) => (
                <option key={o.nome} value={o.nome}>
                  {o.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field field-md">
            <label>Cidade</label>
            <select 
              {...register("cidade")} 
              disabled={!selectedUf}
              style={!selectedUf ? { backgroundColor: '#e9ecef', cursor: 'not-allowed' } : {}}
            >
              <option value="">{selectedUf ? 'Selecione a cidade' : 'Selecione a UF primeiro'}</option>
              {cidadesFiltradas.map((o) => (
                <option key={o.id} value={o.nome}>
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
            + Adicionar Responsável
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
            + Adicionar Membro
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
