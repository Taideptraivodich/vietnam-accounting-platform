const { normalizeDeliveryNoteDraft } = require('../models/DeliveryNote');

class DeliveryNoteService {
  constructor({ deliveryNoteRepository }) {
    if (!deliveryNoteRepository) throw new Error('deliveryNoteRepository is required');
    this.deliveryNoteRepository = deliveryNoteRepository;
  }

  async createDraft(company_id, payload, tx) {
    const deliveryNote = normalizeDeliveryNoteDraft({ ...payload, company_id });
    return this.deliveryNoteRepository.createDraft(deliveryNote, tx);
  }

  list(company_id, filters, tx) {
    return this.deliveryNoteRepository.list(company_id, filters || {}, tx);
  }

  get(company_id, id, tx) {
    return this.deliveryNoteRepository.findWithLines(company_id, id, tx);
  }
}

module.exports = { DeliveryNoteService };
