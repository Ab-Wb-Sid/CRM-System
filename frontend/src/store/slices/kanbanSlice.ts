// ═══════════════════════════════════════════════════════
//  Kanban Slice — Optimistic ordering during drag
// ═══════════════════════════════════════════════════════
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { KanbanState, OpportunityStage } from '../../types';
import { mockOpportunities } from '../../data/mockData';

const STAGES: OpportunityStage[] = [
  'Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost',
];

function buildInitialColumns(): Record<OpportunityStage, string[]> {
  const cols = {} as Record<OpportunityStage, string[]>;
  for (const s of STAGES) cols[s] = [];
  for (const opp of mockOpportunities) {
    cols[opp.stage].push(opp.id);
  }
  return cols;
}

const initialState: KanbanState = {
  columns: buildInitialColumns(),
};

const kanbanSlice = createSlice({
  name: 'kanban',
  initialState,
  reducers: {
    // Optimistic move — called before the RTK Query mutation resolves
    moveCard(
      state,
      action: PayloadAction<{
        opportunityId: string;
        fromStage: OpportunityStage;
        toStage: OpportunityStage;
        toIndex: number;
      }>,
    ) {
      const { opportunityId, fromStage, toStage, toIndex } = action.payload;
      const fromCol = state.columns[fromStage];
      const fromIdx = fromCol.indexOf(opportunityId);
      if (fromIdx === -1) return;

      fromCol.splice(fromIdx, 1);
      state.columns[toStage].splice(toIndex, 0, opportunityId);
    },

    // Revert if server mutation fails
    revertMove(
      state,
      action: PayloadAction<{
        opportunityId: string;
        originalStage: OpportunityStage;
        targetStage: OpportunityStage;
      }>,
    ) {
      const { opportunityId, originalStage, targetStage } = action.payload;
      const targetCol = state.columns[targetStage];
      const idx = targetCol.indexOf(opportunityId);
      if (idx !== -1) {
        targetCol.splice(idx, 1);
        state.columns[originalStage].push(opportunityId);
      }
    },

    syncFromServer(state, action: PayloadAction<KanbanState['columns']>) {
      state.columns = action.payload;
    },
  },
});

export const { moveCard, revertMove, syncFromServer } = kanbanSlice.actions;
export default kanbanSlice.reducer;
