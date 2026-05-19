// ═══════════════════════════════════════════════════════
//  KanbanColumn — Droppable stage column
// ═══════════════════════════════════════════════════════
import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanCard } from './KanbanCard';
import type { Opportunity, OpportunityStage } from '../../types';

interface KanbanColumnProps {
  stage: OpportunityStage;
  opportunities: Opportunity[];
  onEditOpportunity?: (opportunity: Opportunity) => void;
  onDeleteOpportunity?: (opportunity: Opportunity) => void;
}

const STAGE_META: Record<OpportunityStage, { color: string; accent: string }> = {
  'Lead':        { color: 'var(--color-text-muted)',   accent: 'rgba(255,255,255,0.04)' },
  'Qualified':   { color: 'var(--color-neon-blue)',    accent: 'rgba(10,132,255,0.06)' },
  'Proposal':    { color: 'var(--color-neon-purple)',  accent: 'rgba(191,90,242,0.06)' },
  'Negotiation': { color: 'var(--color-neon-amber)',   accent: 'rgba(255,159,10,0.06)' },
  'Closed Won':  { color: 'var(--color-neon-green)',   accent: 'rgba(0,255,135,0.06)' },
  'Closed Lost': { color: 'var(--color-neon-red)',     accent: 'rgba(255,69,58,0.06)' },
};

function totalValue(opps: Opportunity[]) {
  const total = opps.reduce((s, o) => s + o.expectedValue, 0);
  return total >= 1_000_000
    ? `$${(total / 1_000_000).toFixed(1)}M`
    : `$${(total / 1_000).toFixed(0)}K`;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  stage,
  opportunities,
  onEditOpportunity,
  onDeleteOpportunity,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const meta = STAGE_META[stage];

  return (
    <div
      style={{
        minWidth: 240,
        maxWidth: 260,
        flex: '1 1 240px',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
      }}
    >
      {/* Column Header */}
      <div
        className="rounded-xl flex items-center justify-between"
        style={{
          padding: '10px 14px',
          marginBottom: 8,
          background: meta.accent,
          border: `1px solid ${meta.color}25`,
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="rounded-full"
            style={{
              width: 7, height: 7,
              background: meta.color,
              boxShadow: `0 0 6px ${meta.color}`,
            }}
          />
          <span style={{ fontSize: 12, fontWeight: 700, color: meta.color, letterSpacing: '0.02em' }}>
            {stage}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {opportunities.length > 0 && (
            <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
              {totalValue(opportunities)}
            </span>
          )}
          <span
            className="flex items-center justify-center rounded-full font-bold"
            style={{
              width: 18, height: 18, fontSize: 10,
              background: `${meta.color}25`,
              color: meta.color,
            }}
          >
            {opportunities.length}
          </span>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        ref={setNodeRef}
        className="flex flex-col gap-2 rounded-xl flex-1"
        style={{
          minHeight: 200,
          padding: '8px 0',
          transition: 'background 0.15s',
          background: isOver ? `${meta.color}08` : 'transparent',
        }}
      >
        <SortableContext
          items={opportunities.map(o => o.id)}
          strategy={verticalListSortingStrategy}
        >
          {opportunities.map(opp => (
            <KanbanCard
              key={opp.id}
              opportunity={opp}
              onEdit={onEditOpportunity}
              onDelete={onDeleteOpportunity}
            />
          ))}
        </SortableContext>

        {opportunities.length === 0 && (
          <div
            className="flex items-center justify-center rounded-xl"
            style={{
              height: 80, fontSize: 11,
              color: 'var(--color-text-muted)',
              border: `2px dashed ${isOver ? meta.color + '60' : 'rgba(255,255,255,0.06)'}`,
              transition: 'border-color 0.15s',
            }}
          >
            {isOver ? 'Drop here' : 'No deals'}
          </div>
        )}
      </div>
    </div>
  );
};
