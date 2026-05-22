export function buildConversationState(memory = {}) {
  return {
    vehicle: memory.vehicle || null,
    selected_product: memory.selected_product || null,
    conversation_stage: memory.conversation_stage || 'new',
    lead_score: memory.lead_score || 0,
    last_intent: memory.last_intent || null
  };
}

export function hasActiveSale(memory = {}) {
  return Boolean(memory.vehicle);
}
