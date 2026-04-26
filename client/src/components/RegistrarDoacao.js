import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { authenticatedFetch } from '../utils/api';
import './RegistrarDoacao.css';

const RegistrarDoacao = () => {
  const navigate = useNavigate();
  const [itens, setItens] = useState([]);
  const [loadingItens, setLoadingItens] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: { itemId: '', quantidade: '', observacao: '' },
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await authenticatedFetch('/api/cestas/itens');
        if (!res.ok) throw new Error('Falha ao carregar itens');
        setItens(await res.json());
      } catch (err) {
        console.error(err);
        alert('Erro ao carregar itens: ' + err.message);
      } finally {
        setLoadingItens(false);
      }
    })();
  }, []);

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const payload = {
        itemId: parseInt(data.itemId, 10),
        quantidade: parseInt(data.quantidade, 10),
        observacao: data.observacao || undefined,
      };
      const res = await authenticatedFetch('/api/cestas/estoque/entrada', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao registrar doação');
      alert(`Doação registrada! Estoque atual do item: ${json.qtdEstAtual}`);
      reset();
      navigate('/cestas-basicas');
    } catch (err) {
      console.error(err);
      alert('Erro ao registrar doação: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="doacao-container">
      <h1>Registrar Doação no Estoque</h1>
      <p className="doacao-subtitle">
        Cada doação incrementa o estoque do item selecionado e gera um registro de auditoria.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="doacao-form">
        <div className="form-group">
          <label htmlFor="itemId">Item *</label>
          <select
            id="itemId"
            disabled={loadingItens || submitting}
            {...register('itemId', {
              required: 'Selecione um item',
              validate: (v) => parseInt(v, 10) > 0 || 'Selecione um item',
            })}
          >
            <option value="">— Selecione —</option>
            {itens.map((it) => (
              <option key={it.id} value={it.id}>
                {it.descricao} {it.unidade ? `(${it.unidade})` : ''}
              </option>
            ))}
          </select>
          {errors.itemId && <span className="form-error">{errors.itemId.message}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="quantidade">Quantidade *</label>
          <input
            id="quantidade"
            type="number"
            min="1"
            step="1"
            disabled={submitting}
            {...register('quantidade', {
              required: 'Informe a quantidade',
              valueAsNumber: false,
              validate: (v) => {
                const n = parseInt(v, 10);
                return (Number.isInteger(n) && n > 0) || 'Quantidade deve ser inteiro positivo';
              },
            })}
          />
          {errors.quantidade && <span className="form-error">{errors.quantidade.message}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="observacao">Observação</label>
          <textarea
            id="observacao"
            rows={3}
            maxLength={500}
            placeholder="Ex.: Doação Igreja XYZ"
            disabled={submitting}
            {...register('observacao', {
              maxLength: { value: 500, message: 'Máximo 500 caracteres' },
            })}
          />
          {errors.observacao && <span className="form-error">{errors.observacao.message}</span>}
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
          <button type="submit" className="btn-salvar" disabled={submitting || loadingItens}>
            {submitting ? 'Salvando...' : 'Salvar doação'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RegistrarDoacao;
