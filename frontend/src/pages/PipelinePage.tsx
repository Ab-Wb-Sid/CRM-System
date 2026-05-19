// ═══════════════════════════════════════════════════════
//  Pipeline Page — Kanban Board View
// ═══════════════════════════════════════════════════════
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Filter } from 'lucide-react';
import { KanbanBoard } from '../components/kanban/KanbanBoard';
import { GlassCard } from '../components/ui/GlassCard';
import {
  useCreateOpportunityMutation,
  useDeleteOpportunityMutation,
  useGetOpportunitiesQuery,
  useUpdateOpportunityMutation,
} from '../store/api/crmApi';
import { useAppDispatch } from '../store';
import { addNotification } from '../store/slices/uiSlice';
import type { Opportunity } from '../types';

export const PipelinePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { data: opps = [] } = useGetOpportunitiesQuery();
  const [createOpportunity] = useCreateOpportunityMutation();
  const [updateOpportunity] = useUpdateOpportunityMutation();
  const [deleteOpportunity] = useDeleteOpportunityMutation();
  const [activeOnly, setActiveOnly] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Opportunity | null>(null);
  const [dealTitle, setDealTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [dealValue, setDealValue] = useState('0');
  const [probability, setProbability] = useState('25');

  const openAddDeal = () => {
    setEditingDeal(null);
    setDealTitle('');
    setClientName('');
    setDealValue('0');
    setProbability('25');
    setAddOpen(true);
  };

  const openEditDeal = (deal: Opportunity) => {
    setEditingDeal(deal);
    setDealTitle(deal.title);
    setClientName(deal.clientName);
    setDealValue(String(deal.expectedValue));
    setProbability(String(deal.probability));
    setAddOpen(true);
  };

  const saveDeal = async () => {
    if (!dealTitle.trim() || !clientName.trim()) {
      dispatch(addNotification({
        type: 'warning',
        title: 'Missing deal details',
        message: 'Deal name and client name are required.',
      }));
      return;
    }

    const payload = {
      title: dealTitle.trim(),
      client_name: clientName.trim(),
      expected_value: Number(dealValue) || 0,
      probability: Number(probability) || 0,
    };

    if (editingDeal) {
      await updateOpportunity({ id: editingDeal.id, ...payload }).unwrap();
      dispatch(addNotification({ type: 'success', title: 'Deal updated', message: `${payload.title} was saved to the database.` }));
    } else {
      await createOpportunity(payload).unwrap();
      dispatch(addNotification({ type: 'success', title: 'Deal created', message: `${payload.title} was inserted into the database.` }));
    }

    setAddOpen(false);
  };

  const totalPipeline = opps
    .filter(o => o.stage !== 'Closed Won' && o.stage !== 'Closed Lost')
    .reduce((s, o) => s + o.expectedValue, 0);

  const wonValue = opps
    .filter(o => o.stage === 'Closed Won')
    .reduce((s, o) => s + o.expectedValue, 0);

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* Summary Row */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-4"
        style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}
      >
        {[
          { label: 'Total Pipeline', value: `$${(totalPipeline / 1000).toFixed(0)}K`, accent: 'var(--color-neon-blue)' },
          { label: 'Closed Won', value: `$${(wonValue / 1000).toFixed(0)}K`, accent: 'var(--color-neon-green)' },
          { label: 'Total Deals', value: opps.length, accent: 'var(--color-neon-purple)' },
          { label: 'Active Deals', value: opps.filter(o => !['Closed Won','Closed Lost'].includes(o.stage)).length, accent: 'var(--color-neon-amber)' },
        ].map(({ label, value, accent }) => (
          <GlassCard key={label} style={{ padding: '14px 18px' }}>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: accent }}>{value}</p>
          </GlassCard>
        ))}
      </motion.div>

      {/* Toolbar */}
      <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
          Drag & drop cards to advance deals through the pipeline
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveOnly(v => !v)}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 cursor-pointer transition-all"
            style={{
              fontSize: 12, color: activeOnly ? '#000' : 'var(--color-text-secondary)',
              background: activeOnly ? 'var(--color-neon-amber)' : 'rgba(255,255,255,0.05)',
              border: activeOnly ? 'none' : '1px solid var(--color-border)',
            }}
          >
            <Filter size={13} /> {activeOnly ? 'Active only' : 'Filter'}
          </button>
          <button
            onClick={openAddDeal}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 cursor-pointer"
            style={{
              fontSize: 12, fontWeight: 600, color: '#000',
              background: 'var(--color-neon-blue)',
              border: 'none',
            }}
          >
            <Plus size={13} /> Add Deal
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <KanbanBoard
          activeOnly={activeOnly}
          onEditOpportunity={openEditDeal}
          onDeleteOpportunity={async (deal) => {
            await deleteOpportunity(deal.id).unwrap();
            dispatch(addNotification({ type: 'success', title: 'Deal deleted', message: `${deal.title} was removed from the database.` }));
          }}
        />
      </motion.div>

      {addOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setAddOpen(false)}
        >
          <div className="glass-card rounded-xl" style={{ width: 380, padding: 20 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>{editingDeal ? 'Edit Deal' : 'Add Deal'}</h2>
            <input
              autoFocus
              value={dealTitle}
              onChange={e => setDealTitle(e.target.value)}
              placeholder="Deal name"
              style={{ width: '100%', marginBottom: 12 }}
            />
            <input
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              placeholder="Client name"
              style={{ width: '100%', marginBottom: 12 }}
            />
            <div className="flex gap-2" style={{ marginBottom: 12 }}>
              <input
                type="number"
                min={0}
                value={dealValue}
                onChange={e => setDealValue(e.target.value)}
                placeholder="Deal value"
                style={{ width: '50%' }}
              />
              <input
                type="number"
                min={0}
                max={100}
                value={probability}
                onChange={e => setProbability(e.target.value)}
                placeholder="Probability"
                style={{ width: '50%' }}
              />
            </div>
            <div className="flex justify-between">
              <button
                onClick={() => setAddOpen(false)}
                className="rounded-lg px-3 py-1.5 cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={saveDeal}
                className="rounded-lg px-3 py-1.5 cursor-pointer"
                style={{ background: 'var(--color-neon-blue)', border: 'none', color: '#000', fontWeight: 700 }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
