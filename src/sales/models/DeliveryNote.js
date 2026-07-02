function validateDeliveryNoteDraft(input) {
  if (!input || typeof input !== 'object') throw new Error('Delivery Note payload is required');
  if (!input.company_id) throw new Error('company_id is required');
  if (!input.customer_id) throw new Error('customer_id is required');
  if (!Array.isArray(input.lines) || input.lines.length === 0) throw new Error('at least one delivery line is required');

  input.lines.forEach((line, idx) => {
    const prefix = `lines[${idx}]`;
    if (!line.item_id) throw new Error(`${prefix}.item_id is required`);
    if (!line.warehouse_id) throw new Error(`${prefix}.warehouse_id is required`);
    const quantity = Number(line.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) throw new Error(`${prefix}.quantity must be > 0`);
  });
}

function normalizeDeliveryNoteDraft(input) {
  validateDeliveryNoteDraft(input);
  return {
    ...input,
    status: input.status || 'draft',
    lines: input.lines.map((line, index) => ({
      ...line,
      line_number: line.line_number || index + 1,
      quantity: Number(line.quantity),
    })),
  };
}

module.exports = {
  validateDeliveryNoteDraft,
  normalizeDeliveryNoteDraft,
};
