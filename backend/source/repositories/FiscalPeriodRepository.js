'use strict';

/**
 * FiscalPeriodRepository — period lock validation.
 */
class FiscalPeriodRepository {
  constructor(db) {
    this.db = db;
  }

  _client(tx) {
    return tx || this.db;
  }

  async findByDate(companyId, postingDate, tx) {
    const { rows } = await this._client(tx).query(
      `SELECT * FROM fiscal_periods
       WHERE company_id = $1
         AND start_date <= $2
         AND end_date >= $2
       LIMIT 1`,
      [companyId, postingDate]
    );
    return rows[0] || null;
  }

  async isLocked(companyId, postingDate, tx) {
    const period = await this.findByDate(companyId, postingDate, tx);
    if (!period) return false; // No period defined = not locked.
    return period.is_locked === true;
  }
}

module.exports = FiscalPeriodRepository;
