import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { authenticatedFetch } from '../utils/api';
import './FormularioDoacao.css';

const ErrorMessage = ({ error }) =>
  error ? <span className="form-error">{error.message}</span> : null;

const TIPO_DOC_OPTIONS = ['Alimentos', 'Roupas', 'Dinheiro', 'Outros'];
const TIPO_DOA_OPTIONS = [
  { value: 'PF', label: 'Pessoa Física' },
  { value: 'PJ', label: 'Pessoa Jurídica' },
];

const FormularioDoacao = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [modoDoador, setModoDoador] = useState('busca');
  const [buscaDoador, setBuscaDoador] = useState('');
  const [sugestoes, setSugestoes] = useState([]);
  const [doadorSelecionado, setDoadorSelecionado] = useState(null);
  const [doadorError, setDoadorError] = useState('');

  const [itens, setItens] = useState([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const debounceRef = useRef(null);
  const dropdownRef = useRef(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      dtDoc: '',
      tipoDoc: 'Alimentos',
      descricaoDoc: '',
      obsDoc: '',
      nomeDoa: '',
      emailDoa: '',
      foneDoa: '',
      cpfCnpj: '',
      tipoDoa: 'PF',
      itens: [{ codIte: '', qtd: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'itens' });
  const tipoDoc = watch('tipoDoc');

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setSugestoes([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const itensRes = await authenticatedFetch('/api/cestas/itens');
        if (!itensRes.ok) throw new Error('Falha ao carregar itens');
        const itensData = await itensRes.json();
        setItens(itensData);

        if (isEdit) {
          const docRes = await authenticatedFetch(`/api/doacoes/${id}`);
          if (!docRes.ok) throw new Error('Falha ao carregar doação para edição');
          const doc = await docRes.json();

          setDoadorSelecionado({
            codDoa: doc.codDoa,
            nomeDoa: doc.nomeDoa,
            tipoDoa: doc.tipoDoa,
          });

          reset({
            dtDoc: doc.dtDoc ? doc.dtDoc.substring(0, 10) : '',
            tipoDoc: doc.tipoDoc || 'Alimentos',
            descricaoDoc: doc.descricaoDoc || '',
            obsDoc: doc.obsDoc || '',
            nomeDoa: '',
            emailDoa: '',
            foneDoa: '',
            cpfCnpj: '',
            tipoDoa: 'PF',
            itens:
              doc.itens && doc.itens.length > 0
                ? doc.itens.map((it) => ({
                    codIte: String(it.codIte),
                    qtd: String(it.qtd),
                  }))
                : [{ codIte: '', qtd: '' }],
          });
        }
      } catch (err) {
        console.error(err);
        alert('Erro ao carregar dados: ' + err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit, reset]);

  const buscarDoadores = useCallback(
    (q) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!q || q.trim().length < 2) {
        setSugestoes([]);
        return;
      }
      debounceRef.current = setTimeout(async () => {
        try {
          const res = await authenticatedFetch(
            `/api/doadores/busca?nome=${encodeURIComponent(q.trim())}`
          );
          if (!res.ok) return;
          const data = await res.json();
          setSugestoes(data);
        } catch (err) {
          console.error('Erro na busca de doadores:', err);
        }
      }, 300);
    },
    []
  );

  const handleBuscaChange = (e) => {
    const q = e.target.value;
    setBuscaDoador(q);
    buscarDoadores(q);
  };

  const selecionarDoador = (doador) => {
    setDoadorSelecionado(doador);
    setBuscaDoador('');
    setSugestoes([]);
    setDoadorError('');
  };

  const limparDoador = () => {
    setDoadorSelecionado(null);
    setBuscaDoador('');
    setSugestoes([]);
  };

  const irParaNovo = () => {
    setModoDoador('novo');
    setDoadorSelecionado(null);
    setBuscaDoador('');
    setSugestoes([]);
    setDoadorError('');
  };

  const voltarParaBusca = () => {
    setModoDoador('busca');
    setDoadorSelecionado(null);
    setValue('nomeDoa', '');
    setValue('emailDoa', '');
    setValue('foneDoa', '');
    setValue('cpfCnpj', '');
    setValue('tipoDoa', 'PF');
  };

  const onSubmit = async (data) => {
    if (modoDoador === 'busca' && !doadorSelecionado) {
      setDoadorError('Selecione um doador ou cadastre um novo.');
      return;
    }
    setDoadorError('');

    const payload = {
      doador: doadorSelecionado
        ? { codDoa: doadorSelecionado.codDoa }
        : {
            nomeDoa: data.nomeDoa,
            emailDoa: data.emailDoa || undefined,
            foneDoa: data.foneDoa || undefined,
            cpfCnpj: data.cpfCnpj || undefined,
            tipoDoa: data.tipoDoa,
          },
      dtDoc: data.dtDoc,
      tipoDoc: data.tipoDoc,
      descricaoDoc: data.descricaoDoc || undefined,
      obsDoc: data.obsDoc || undefined,
      itens:
        data.tipoDoc === 'Alimentos'
          ? data.itens.map((it) => ({
              codIte: parseInt(it.codIte, 10),
              qtd: parseInt(it.qtd, 10),
            }))
          : undefined,
    };

    setSubmitting(true);
    try {
      const url = isEdit ? `/api/doacoes/${id}` : '/api/doacoes';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await authenticatedFetch(url, {
        method,
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao salvar');
      alert(isEdit ? 'Doação atualizada com sucesso!' : 'Doação registrada com sucesso!');
      navigate('/doacoes');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="doacao-form-container"><p>Carregando...</p></div>;

  return (
    <div className="doacao-form-container">
      <h1>{isEdit ? `Editar Doação #${id}` : 'Nova Doação'}</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="doacao-form">

        <div className="doador-section">
          <p className="doador-section-title">Doador *</p>

          {isEdit && doadorSelecionado && (
            <div className="doador-selecionado">
              <span>{doadorSelecionado.nomeDoa}</span>
              <span className="doador-selecionado-sub">
                {doadorSelecionado.tipoDoa === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}
              </span>
            </div>
          )}

          {!isEdit && (
            <>
              {modoDoador === 'busca' && (
                <>
                  {doadorSelecionado ? (
                    <div className="doador-selecionado">
                      <span>{doadorSelecionado.nomeDoa}</span>
                      <span className="doador-selecionado-sub">
                        {doadorSelecionado.tipoDoa === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}
                      </span>
                      <button
                        type="button"
                        className="btn-limpar-doador"
                        onClick={limparDoador}
                        title="Remover seleção"
                        disabled={submitting}
                      >
                        &times;
                      </button>
                    </div>
                  ) : (
                    <div className="autocomplete-wrapper" ref={dropdownRef}>
                      <input
                        type="text"
                        className="autocomplete-input"
                        placeholder="Digite o nome do doador..."
                        value={buscaDoador}
                        onChange={handleBuscaChange}
                        disabled={submitting}
                        autoComplete="off"
                      />
                      {sugestoes.length > 0 && (
                        <div className="autocomplete-dropdown">
                          {sugestoes.map((s) => (
                            <div
                              key={s.codDoa}
                              className="autocomplete-item"
                              onMouseDown={() => selecionarDoador(s)}
                            >
                              <div>{s.nomeDoa}</div>
                              <div className="autocomplete-item-sub">
                                {s.tipoDoa === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {buscaDoador.trim().length >= 2 && sugestoes.length === 0 && (
                        <div className="autocomplete-dropdown">
                          <div className="autocomplete-vazio">Nenhum doador encontrado.</div>
                        </div>
                      )}
                    </div>
                  )}
                  {doadorError && <span className="form-error">{doadorError}</span>}
                  <button
                    type="button"
                    className="btn-novo-doador"
                    onClick={irParaNovo}
                    disabled={submitting}
                  >
                    + Cadastrar novo doador
                  </button>
                </>
              )}

              {modoDoador === 'novo' && (
                <>
                  <button
                    type="button"
                    className="btn-voltar-busca"
                    onClick={voltarParaBusca}
                    disabled={submitting}
                  >
                    &larr; Voltar à busca
                  </button>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="nomeDoa">Nome *</label>
                      <input
                        id="nomeDoa"
                        type="text"
                        disabled={submitting}
                        {...register('nomeDoa', { required: 'Nome do doador é obrigatório' })}
                      />
                      <ErrorMessage error={errors.nomeDoa} />
                    </div>

                    <div className="form-group">
                      <label htmlFor="tipoDoa">Tipo</label>
                      <select
                        id="tipoDoa"
                        disabled={submitting}
                        {...register('tipoDoa')}
                      >
                        {TIPO_DOA_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="emailDoa">E-mail</label>
                      <input
                        id="emailDoa"
                        type="email"
                        disabled={submitting}
                        {...register('emailDoa', {
                          pattern: {
                            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                            message: 'E-mail inválido',
                          },
                        })}
                      />
                      <ErrorMessage error={errors.emailDoa} />
                    </div>

                    <div className="form-group">
                      <label htmlFor="foneDoa">Telefone</label>
                      <input
                        id="foneDoa"
                        type="text"
                        placeholder="(11) 99999-9999"
                        disabled={submitting}
                        {...register('foneDoa')}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="cpfCnpj">CPF / CNPJ</label>
                      <input
                        id="cpfCnpj"
                        type="text"
                        placeholder="Somente números"
                        disabled={submitting}
                        {...register('cpfCnpj')}
                      />
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="dtDoc">Data da doação *</label>
            <input
              id="dtDoc"
              type="date"
              disabled={submitting}
              {...register('dtDoc', {
                required: 'Informe a data',
                pattern: { value: /^\d{4}-\d{2}-\d{2}$/, message: 'Formato YYYY-MM-DD' },
              })}
            />
            <ErrorMessage error={errors.dtDoc} />
          </div>

          <div className="form-group">
            <label htmlFor="tipoDoc">Tipo de doação *</label>
            <select
              id="tipoDoc"
              disabled={submitting}
              {...register('tipoDoc', { required: 'Selecione o tipo' })}
            >
              {TIPO_DOC_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <ErrorMessage error={errors.tipoDoc} />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="descricaoDoc">Descrição</label>
          <input
            id="descricaoDoc"
            type="text"
            placeholder="Opcional — descrição breve"
            maxLength={200}
            disabled={submitting}
            {...register('descricaoDoc', {
              maxLength: { value: 200, message: 'Máximo 200 caracteres' },
            })}
          />
          <ErrorMessage error={errors.descricaoDoc} />
        </div>

        <div className="form-group">
          <label htmlFor="obsDoc">Observação</label>
          <textarea
            id="obsDoc"
            rows={3}
            maxLength={500}
            placeholder="Opcional — máx. 500 caracteres"
            disabled={submitting}
            {...register('obsDoc', {
              maxLength: { value: 500, message: 'Máximo 500 caracteres' },
            })}
          />
          <ErrorMessage error={errors.obsDoc} />
        </div>

        {tipoDoc === 'Alimentos' && (
          <fieldset className="itens-fieldset">
            <legend>Itens doados *</legend>

            {fields.length === 0 && (
              <p className="vazio">Nenhum item — adicione pelo menos um.</p>
            )}

            {fields.map((field, idx) => (
              <div key={field.id} className="item-row">
                <div className="form-group flex-2">
                  <label>Item</label>
                  <select
                    disabled={submitting}
                    {...register(`itens.${idx}.codIte`, {
                      required: 'Item obrigatório',
                      validate: (v) => parseInt(v, 10) > 0 || 'Selecione um item',
                    })}
                  >
                    <option value="">— Selecione —</option>
                    {itens.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.descricao}{it.unidade ? ` (${it.unidade})` : ''}
                      </option>
                    ))}
                  </select>
                  <ErrorMessage error={errors.itens?.[idx]?.codIte} />
                </div>

                <div className="form-group flex-1">
                  <label>Quantidade</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    disabled={submitting}
                    {...register(`itens.${idx}.qtd`, {
                      required: 'Qtd obrigatória',
                      validate: (v) => {
                        const n = parseInt(v, 10);
                        return (Number.isInteger(n) && n > 0) || 'Inteiro positivo';
                      },
                    })}
                  />
                  <ErrorMessage error={errors.itens?.[idx]?.qtd} />
                </div>

                <button
                  type="button"
                  className="btn-remover"
                  onClick={() => remove(idx)}
                  disabled={submitting || fields.length <= 1}
                  title="Remover item"
                >
                  &times;
                </button>
              </div>
            ))}

            <button
              type="button"
              className="btn-add-item"
              onClick={() => append({ codIte: '', qtd: '' })}
              disabled={submitting}
            >
              + Adicionar item
            </button>
          </fieldset>
        )}

        <div className="form-actions">
          <button
            type="button"
            className="btn-cancelar"
            onClick={() => navigate('/doacoes')}
            disabled={submitting}
          >
            Cancelar
          </button>
          <button type="submit" className="btn-salvar" disabled={submitting}>
            {submitting ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Registrar doação'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FormularioDoacao;
