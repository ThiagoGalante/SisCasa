import React, { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useParams, useNavigate } from "react-router-dom";
import { authenticatedFetch } from "../utils/api";
import { supabase } from "../lib/supabaseClient";
import "./FormularioBeneficiarios.css";

const FormularioBeneficiarios = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

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

  const selectedUf = watch("uf");

  const [opcoes, setOpcoes] = useState({
    tiposBeneficio: [],
    ufs: [],
    racas: [],
    religioes: [],
    hospitais: [],
    grausParentesco: [],
    projetos: [],
  });
  const [cidadesFiltradas, setCidadesFiltradas] = useState([]);
  const [projetosSel, setProjetosSel] = useState([]);
  const [fotoUrl, setFotoUrl] = useState('');
  const [fotoUploading, setFotoUploading] = useState(false);

  useEffect(() => {
    const carregarOpcoes = async () => {
      try {
        const [
          tiposBeneficioRes,
          ufRes,
          racasRes,
          religioesRes,
          hospitaisRes,
          grausParentescoRes,
          projetosRes,
        ] = await Promise.all([
          fetch("/api/tipos-beneficio").catch(() => ({ json: async () => [] })),
          fetch("/api/ufs").catch(() => ({ json: async () => [] })),
          fetch("/api/racas").catch(() => ({ json: async () => [] })),
          fetch("/api/religioes").catch(() => ({ json: async () => [] })),
          fetch("/api/hospitais").catch(() => ({ json: async () => [] })),
          fetch("/api/graus-parentesco").catch(() => ({ json: async () => [] })),
          fetch("/api/projetos").catch(() => ({ json: async () => [] })),
        ]);
        setOpcoes({
          tiposBeneficio: await tiposBeneficioRes.json(),
          ufs: await ufRes.json(),
          racas: await racasRes.json(),
          religioes: await religioesRes.json(),
          hospitais: await hospitaisRes.json(),
          grausParentesco: await grausParentescoRes.json(),
          projetos: await projetosRes.json(),
        });
      } catch (err) {
        console.warn("Erro ao carregar opções (ignorável em dev):", err);
      }
    };
    carregarOpcoes();

    if (isEditing) {
      const fetchBeneficiario = async () => {
        try {
          const response = await authenticatedFetch(`/api/beneficiarios/${id}`);
          if (!response.ok) {
            throw new Error("Beneficiário não encontrado");
          }
          const data = await response.json();

          const formattedData = {
            ...data,
            data_cad: data.data_cad ? new Date(data.data_cad).toISOString().split('T')[0] : '',
            data_nasc: data.data_nasc ? new Date(data.data_nasc).toISOString().split('T')[0] : '',
          };

          if (formattedData.uf) {
            const cidadesResponse = await fetch(`/api/cidades/${formattedData.uf}`);
            setCidadesFiltradas(await cidadesResponse.json());
          }

          reset(formattedData);
          setProjetosSel(Array.isArray(data.projetos) ? data.projetos : []);
          setFotoUrl(data.foto_url || '');
        } catch (error) {
          console.error("Erro ao buscar beneficiário:", error);
          alert("Falha ao carregar dados do beneficiário.");
          navigate("/beneficiarios");
        }
      };
      fetchBeneficiario();
    } else {
      const fetchProximoNroCadastro = async () => {
        try {
          const response = await authenticatedFetch('/api/beneficiarios/proximo-nro-cadastro');
          const data = await response.json();
          setValue('nro_cad', data.proximoNroCadastro);
        } catch (error) {
          console.error("Erro ao buscar próximo número de cadastro:", error);
        }
      };
      fetchProximoNroCadastro();
    }
  }, [id, isEditing, reset, navigate, setValue]);

  useEffect(() => {
    const fetchCidades = async () => {
      if (selectedUf) {
        try {
          const response = await fetch(`/api/cidades/${selectedUf}`);
          const data = await response.json();
          setCidadesFiltradas(data);
          if (!isEditing) { // Evita limpar ao carregar dados de edição
            setValue('cidade', '');
          }
        } catch (error) {
          console.error("Erro ao buscar cidades:", error);
          setCidadesFiltradas([]);
        }
      } else {
        setCidadesFiltradas([]);
      }
    };
    fetchCidades();
  }, [selectedUf, setValue, isEditing]);

  const onSubmit = async (data) => {
    const validarPessoasRelacionadas = (pessoas, nomeSecao) => {
      for (const pessoa of pessoas) {
        const isRowPartiallyFilled = Object.values(pessoa).some(value => value && String(value).trim() !== '');

        if (isRowPartiallyFilled) {
          const nomeValido = pessoa.nome && pessoa.nome.trim() !== '';
          const parentescoValido = pessoa.parentesco && pessoa.parentesco.trim() !== '';

          if (!nomeValido || !parentescoValido) {
            alert(`Na seção '${nomeSecao}', todas as linhas preenchidas devem ter 'Nome' e 'Grau de Parentesco' definidos.`);
            return false;
          }
        }
      }
      return true;
    };

    if (!validarPessoasRelacionadas(data.responsaveis, 'Responsáveis')) {
      return;
    }

    if (!validarPessoasRelacionadas(data.familia, 'Composição Familiar')) {
      return;
    }

    if (data.data_nasc) {
      const hoje = new Date();
      const nascimento = new Date(data.data_nasc);
      let idade = hoje.getFullYear() - nascimento.getFullYear();
      const mes = hoje.getMonth() - nascimento.getMonth();
      if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
        idade--;
      }

      if (idade < 18) {
        const temResponsavelValido = data.responsaveis.some(resp => resp && resp.nome && resp.nome.trim() !== '');
        if (!temResponsavelValido) {
          alert("Beneficiário é menor de idade. É obrigatório cadastrar pelo menos um responsável.");
          return;
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      return;
    }

    const url = isEditing ? `/api/beneficiarios/${id}` : "/api/beneficiarios";
    const method = isEditing ? "PUT" : "POST";

    try {
      const payload = { ...data, projetos: projetosSel, foto_url: fotoUrl };
      const res = await authenticatedFetch(url, {
        method,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Erro ao salvar");
      }

      alert(`Beneficiário ${isEditing ? 'atualizado' : 'salvo'} com sucesso!`);

      if (isEditing) {
        navigate("/beneficiarios");
      } else {
        reset();
      }

    } catch (err) {
      console.error("Falha ao submeter o formulário:", err);
      alert(`Falha ao salvar: ${err.message}`);
    }
  };

  const handleFotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `beneficiario-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('fotos-beneficiarios')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('fotos-beneficiarios').getPublicUrl(path);
      setFotoUrl(pub.publicUrl);
    } catch (err) {
      console.error('Erro ao enviar foto:', err);
      alert('Falha ao enviar a foto: ' + (err.message || err));
    } finally {
      setFotoUploading(false);
    }
  };

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

        <div className="form-row">
          <div className="form-field field-md">
            <label>Bairro</label>
            <input {...register("bairro")} />
          </div>
          <div className="form-field field-md">
            <label>Contato de Emergência</label>
            <input {...register("contato_emg")} />
          </div>
          <div className="form-field field-md">
            <label>Fone de Emergência</label>
            <input {...register("fone_emg")} />
          </div>
        </div>

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

        <div className="form-row">
          <div className="form-field field-md">
            <label>Médico</label>
            <input {...register("medico")} />
          </div>
          <div className="form-field field-lg">
            <label>Restrição Alimentar</label>
            <input {...register("restr_alim")} />
          </div>
          <div className="form-field field-lg">
            <label>Restrição Médica</label>
            <input {...register("restr_med")} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field field-lg">
            <label>Observação</label>
            <textarea {...register("observacao")} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field field-lg">
            <label>Foto</label>
            <input type="file" accept="image/*" onChange={handleFotoChange} disabled={fotoUploading} />
            {fotoUploading && <span className="error-message">Enviando foto...</span>}
            {fotoUrl && (
              <img
                src={fotoUrl}
                alt="Foto do beneficiário"
                style={{ maxWidth: '160px', marginTop: '8px', borderRadius: '8px', display: 'block' }}
              />
            )}
          </div>
        </div>

        <div className="section-table">
          <h3>Projetos</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', padding: '8px 0' }}>
            {opcoes.projetos.length === 0 && <p>Nenhum projeto cadastrado.</p>}
            {opcoes.projetos.map((p) => (
              <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="checkbox"
                  checked={projetosSel.includes(p.id)}
                  onChange={(e) =>
                    setProjetosSel((prev) =>
                      e.target.checked ? [...prev, p.id] : prev.filter((x) => x !== p.id)
                    )
                  }
                />
                {p.nome}
              </label>
            ))}
          </div>
        </div>

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

        <div className="section-table secao-familiar">
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
