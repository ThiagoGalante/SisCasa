import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { authenticatedFetch } from '../utils/api';
import './FormularioCestaBasica.css';

const ErrorMessage = ({ error }) => (error ? <span className="form-error">{error.message}</span> : null);

const FormularioCestaBasica = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [beneficiarios, setBeneficiarios] = useState([]);
  const [itens, setItens] = useState([]);
  const [estoque, setEstoque] = useState({}); // { [itemId]: qtdEst }
  const [oldItensQty, setOldItensQty] = useState({}); // edição: { [itemId]: qtdOriginal }
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const {
    register, handleSubmit, control, reset, watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      numcadBen: '',
      dtCes: '',
      obsCes: '',
      itens: [{ itemId: '', quantidade: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'itens' });
  const watchedItens = watch('itens');

  useEffect(() => {
    (async () => {
      try {
        const [benRes, itensRes, estRes] = await Promise.all([
          authenticatedFetch('/api/beneficiarios'),
          authenticatedFetch('/api/cestas/itens'),
          authenticatedFetch('/api/cestas/estoque'),
        ]);
        if (!benRes.ok) throw new Error('Falha ao carregar beneficiários');
        if (!itensRes.ok) throw new Error('Falha ao carregar itens');
        if (!estRes.ok) throw new Error('Falha ao carregar estoque');

        const [bens, its, est] = await Promise.all([benRes.json(), itensRes.json(), estRes.json()]);
        setBeneficiarios(bens);
        setItens(its);
        const estMap = {};
        for (const e of est) estMap[e.id] = e.qtdEst;
        setEstoque(estMap);

        if (isEdit) {
          const cestaRes = await authenticatedFetch(`/api/cestas/${id}`);
          if (!cestaRes.ok) throw new Error('Falha ao carregar cesta para edição');
          const cesta = await cestaRes.json();
          const oldMap = {};
          for (const it of cesta.itens) oldMap[it.itemId] = it.quantidade;
          setOldItensQty(oldMap);
          reset({
            numcadBen: String(cesta.beneficiarioId),
            dtCes: cesta.dtCes ? cesta.dtCes.substring(0, 10) : '',
            obsCes: cesta.obsCes || '',
            itens: cesta.itens.length > 0
              ? cesta.itens.map((it) => ({ itemId: String(it.itemId), quantidade: String(it.quantidade) }))
              : [{ itemId: '', quantidade: '' }],
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

  // Estoque "efetivo" disponível para cada item: estoque atual + qtd originalmente alocada para essa cesta (que será estornada ao salvar).
  const estoqueDisponivel = (itemId) => {
    const id = parseInt(itemId, 10);
    if (!id) return null;
    const atual = estoque[id] ?? 0;
    const original = isEdit ? (oldItensQty[id] ?? 0) : 0;
    return atual + original;
  };

  const onSubmit = async (data) => {
    // Validação adicional client-side: itens duplicados e qtd vs estoque
    const ids = data.itens.map((it) => parseInt(it.itemId, 10));
    if (new Set(ids).size !== ids.length) {
      alert('Cada item pode aparecer apenas uma vez por cesta.');
      return;
    }
    for (const it of data.itens) {
      const itemId = parseInt(it.itemId, 10);
      const qtd = parseInt(it.quantidade, 10);
      const disp = estoqueDisponivel(itemId);
      if (disp !== null && qtd > disp) {
        const item = itens.find((i) => i.id === itemId);
        alert(`Estoque insuficiente para "${item?.descricao || itemId}". Disponível: ${disp}, solicitado: ${qtd}.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        numcadBen: parseInt(data.numcadBen, 10),
        dtCes: data.dtCes,
        obsCes: data.obsCes || undefined,
        itens: data.itens.map((it) => ({
          itemId: parseInt(it.itemId, 10),
          quantidade: parseInt(it.quantidade, 10),
        })),
      };
      const url = isEdit ? `/api/cestas/${id}` : '/api/cestas';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await authenticatedFetch(url, { method, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao salvar');
      alert(isEdit ? 'Cesta atualizada com sucesso!' : 'Entrega de cesta registrada com sucesso!');
      navigate('/cestas-basicas');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="cesta-form-container"><p>Carregando...</p></div>;

  return (
    <div className="cesta-form-container">
      <h1>{isEdit ? `Editar Entrega de Cesta #${id}` : 'Nova Entrega de Cesta'}</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="cesta-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="numcadBen">Beneficiário *</label>
            <select
              id="numcadBen"
              disabled={submitting}
              {...register('numcadBen', {
                required: 'Selecione um beneficiário',
                validate: (v) => parseInt(v, 10) > 0 || 'Selecione um beneficiário',
              })}
            >
              <option value="">— Selecione —</option>
              {beneficiarios.map((b) => (
                <option key={b.numeroCadastro || b.id} value={b.numeroCadastro || b.id}>
                  {b.nome}{b.cpf ? ` (CPF ${b.cpf})` : ''}
                </option>
              ))}
            </select>
            <ErrorMessage error={errors.numcadBen} />
          </div>

          <div className="form-group">
            <label htmlFor="dtCes">Data da entrega *</label>
            <input
              id="dtCes"
              type="date"
              disabled={submitting}
              {...register('dtCes', {
                required: 'Informe a data',
                pattern: { value: /^\d{4}-\d{2}-\d{2}$/, message: 'Formato YYYY-MM-DD' },
              })}
            />
            <ErrorMessage error={errors.dtCes} />
          </div>
        </div>

        <fieldset className="itens-fieldset">
          <legend>Itens da cesta *</legend>
          {fields.length === 0 && (
            <p className="vazio">Nenhum item — adicione pelo menos um.</p>
          )}
          {fields.map((field, idx) => {
            const itemIdSelecionado = parseInt(watchedItens?.[idx]?.itemId, 10);
            const disp = estoqueDisponivel(itemIdSelecionado);
            const qtdAtual = parseInt(watchedItens?.[idx]?.quantidade, 10);
            const excedeu = disp !== null && Number.isInteger(qtdAtual) && qtdAtual > disp;
            return (
              <div key={field.id} className="item-row">
                <div className="form-group flex-2">
                  <label>Item</label>
                  <select
                    disabled={submitting}
                    {...register(`itens.${idx}.itemId`, {
                      required: 'Item obrigatório',
                      validate: (v) => parseInt(v, 10) > 0 || 'Selecione um item',
                    })}
                  >
                    <option value="">— Selecione —</option>
                    {itens.map((it) => {
                      const stockHint = estoque[it.id] ?? 0;
                      return (
                        <option key={it.id} value={it.id}>
                          {it.descricao}{it.unidade ? ` (${it.unidade})` : ''} — estoque: {stockHint}
                        </option>
                      );
                    })}
                  </select>
                  <ErrorMessage error={errors.itens?.[idx]?.itemId} />
                </div>

                <div className="form-group flex-1">
                  <label>Quantidade</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    disabled={submitting}
                    {...register(`itens.${idx}.quantidade`, {
                      required: 'Qtd obrigatória',
                      validate: (v) => {
                        const n = parseInt(v, 10);
                        return (Number.isInteger(n) && n > 0) || 'Inteiro positivo';
                      },
                    })}
                  />
                  <ErrorMessage error={errors.itens?.[idx]?.quantidade} />
                  {excedeu && (
                    <span className="form-error">Estoque disponível: {disp}</span>
                  )}
                </div>

                <button
                  type="button"
                  className="btn-remover"
                  onClick={() => remove(idx)}
                  disabled={submitting || fields.length <= 1}
                  title="Remover item"
                >
                  🗑
                </button>
              </div>
            );
          })}
          <button
            type="button"
            className="btn-add-item"
            onClick={() => append({ itemId: '', quantidade: '' })}
            disabled={submitting}
          >
            + Adicionar item
          </button>
        </fieldset>

        <div className="form-group">
          <label htmlFor="obsCes">Observação</label>
          <textarea
            id="obsCes"
            rows={3}
            maxLength={500}
            placeholder="Opcional — máx. 500 caracteres"
            disabled={submitting}
            {...register('obsCes', {
              maxLength: { value: 500, message: 'Máximo 500 caracteres' },
            })}
          />
          <ErrorMessage error={errors.obsCes} />
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn-cancelar"
            onClick={() => navigate('/cestas-basicas')}
            disabled={submitting}
          >
            Cancelar
          </button>
          <button type="submit" className="btn-salvar" disabled={submitting}>
            {submitting ? 'Salvando...' : (isEdit ? 'Salvar alterações' : 'Registrar entrega')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FormularioCestaBasica;
