// ═══════════════════════════════════════════════════════
//  KanbanBoard — DnD Context + Column Orchestration
// ═══════════════════════════════════════════════════════
import React, { useCallback, useEffect } from 'react';
import {
  DndContext, DragOverlay,
  MouseSensor, TouchSensor,
  closestCorners, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { useAppDispatch, useAppSelector } from '../../store';
import { moveCard, syncFromServer } from '../../store/slices/kanbanSlice';
import { useMoveOpportunityMutation, useGetOpportunitiesQuery } from '../../store/api/crmApi';
import type { Opportunity, OpportunityStage } from '../../types';
import { useState } from 'react';

const STAGES: OpportunityStage[] = [
  'Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost',
];

interface KanbanBoardProps {
  activeOnly?: boolean;
  onEditOpportunity?: (opportunity: Opportunity) => void;
  onDeleteOpportunity?: (opportunity: Opportunity) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  activeOnly = false,
  onEditOpportunity,
  onDeleteOpportunity,
}) => {
  const dispatch = useAppDispatch();
  const columns = useAppSelector(s => s.kanban.columns);
  const { data: opportunities = [] } = useGetOpportunitiesQuery();
  const [moveOpportunity] = useMoveOpportunityMutation();
  const [activeOpp, setActiveOpp] = useState<Opportunity | null>(null);

  const oppMap = React.useMemo(
    () => Object.fromEntries(opportunities.map(o => [o.id, o])),
    [opportunities],
  );

  useEffect(() => {
    const nextColumns = {} as Record<OpportunityStage, string[]>;
    for (const stage of STAGES) nextColumns[stage] = [];
    for (const opp of opportunities) {
      nextColumns[opp.stage].push(opp.id);
    }
    dispatch(syncFromServer(nextColumns));
  }, [dispatch, opportunities]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const findStage = useCallback(
    (id: string): OpportunityStage | null => {
      for (const stage of STAGES) {
        if (columns[stage].includes(id)) return stage as OpportunityStage;
      }
      return null;
    },
    [columns],
  );

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveOpp(oppMap[active.id as string] ?? null);
  };

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveOpp(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const fromStage = findStage(activeId);
    if (!fromStage) return;

    // Dropped onto a column (stage name) or another card
    const toStage = (STAGES.includes(overId as OpportunityStage)
      ? overId
      : findStage(overId)) as OpportunityStage | null;

    if (!toStage) return;
    if (fromStage === toStage && activeId === overId) return;

    const toCol = columns[toStage];
    const toIndex = STAGES.includes(overId as OpportunityStage)
      ? toCol.length
      : Math.max(0, toCol.indexOf(overId));

    // Optimistic update
    dispatch(moveCard({ opportunityId: activeId, fromStage, toStage, toIndex }));

    // Persist to server
    try {
      await moveOpportunity({ id: activeId, stage: toStage }).unwrap();
    } catch {
      // Revert is handled by RTK Query cache invalidation + re-fetch
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        className="flex gap-4 overflow-x-auto pb-4"
        style={{ alignItems: 'flex-start' }}
      >
        {STAGES.map(stage => {
          const stageOpps = columns[stage]
            .map(id => oppMap[id])
            .filter((opp): opp is Opportunity => Boolean(opp))
            .filter(opp => !activeOnly || !['Closed Won', 'Closed Lost'].includes(opp.stage));

          return (
            <KanbanColumn
              key={stage}
              stage={stage}
              opportunities={stageOpps}
              onEditOpportunity={onEditOpportunity}
              onDeleteOpportunity={onDeleteOpportunity}
            />
          );
        })}
      </div>

      <DragOverlay dropAnimation={{
        duration: 200,
        easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
      }}>
        {activeOpp && (
          <div style={{ opacity: 0.95, transform: 'rotate(2deg) scale(1.02)' }}>
            <KanbanCard opportunity={activeOpp} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};
