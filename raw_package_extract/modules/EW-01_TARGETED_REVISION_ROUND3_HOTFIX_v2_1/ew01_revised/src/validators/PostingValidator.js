'use strict';

/**
 * PostingValidator — pre-posting checks for shared GL contract.
 * Returns array of error strings. Empty = valid.
 */
class PostingValidator {
  constructor({ accountRepository, fiscalPeriodRepository }) {
    this.accountRepo = accountRepository;
    this.periodRepo = fiscalPeriodRepository;
  }

  async validate(companyId, entry, tx) {
    const errors = [];

    if (!companyId) errors.push('company_id is required.');
    if (!entry.posting_date) errors.push('posting_date is required.');

    if (!entry.lines || entry.lines.length === 0) {
      errors.push('Accounting document must have at least one line.');
      return errors;
    }

    const totalDebit = entry.lines.reduce((s, l) => s + BigInt(l.debit_amount || 0), 0n);
    const totalCredit = entry.lines.reduce((s, l) => s + BigInt(l.credit_amount || 0), 0n);
    if (totalDebit !== totalCredit) {
      errors.push(`Accounting document is unbalanced: total debit ${totalDebit} ≠ total credit ${totalCredit}.`);
    }
    if (totalDebit === 0n) {
      errors.push('Accounting document must have non-zero debit/credit amounts.');
    }

    if (entry.posting_date) {
      const locked = await this.periodRepo.isLocked(companyId, entry.posting_date, tx);
      if (locked) {
        errors.push(`Posting date ${entry.posting_date} falls in a locked fiscal period.`);
      }
    }

    for (let i = 0; i < entry.lines.length; i++) {
      const line = entry.lines[i];
      const linePrefix = `Line ${i + 1}`;

      if (!line.account_id) {
        errors.push(`${linePrefix}: account_id is required.`);
        continue;
      }

      const account = await this.accountRepo.findById(companyId, line.account_id, tx);
      if (!account) {
        errors.push(`${linePrefix}: account ${line.account_id} not found or inactive in accounts.`);
        continue;
      }

      if (account.is_group || !account.is_postable) {
        errors.push(`${linePrefix}: account "${account.code}" is a group/non-postable account.`);
      }

      if (account.requires_party && (!line.party_type || !line.party_id)) {
        errors.push(`${linePrefix}: account "${account.code}" requires party_type and party_id.`);
      }

      if (account.requires_warehouse && !line.warehouse_id) {
        errors.push(`${linePrefix}: account "${account.code}" requires warehouse_id.`);
      }

      if (account.requires_inventory_item && !line.inventory_item_id) {
        errors.push(`${linePrefix}: account "${account.code}" requires inventory_item_id.`);
      }

      if (account.requires_tax_info) {
        const taxMetadata = line.tax_metadata || {};
        if (!taxMetadata || Object.keys(taxMetadata).length === 0) {
          errors.push(`${linePrefix}: account "${account.code}" requires tax_metadata.`);
        }
      }

      if (account.default_party_type && line.party_type && account.default_party_type !== line.party_type) {
        errors.push(`${linePrefix}: account "${account.code}" expects party_type ${account.default_party_type}.`);
      }

      const d = BigInt(line.debit_amount || 0);
      const c = BigInt(line.credit_amount || 0);
      if (d < 0n || c < 0n) {
        errors.push(`${linePrefix}: amounts must be non-negative.`);
      }
      if (d > 0n && c > 0n) {
        errors.push(`${linePrefix}: a line cannot have both debit and credit amounts.`);
      }
      if (d === 0n && c === 0n) {
        errors.push(`${linePrefix}: either debit_amount or credit_amount must be greater than zero.`);
      }
    }

    return errors;
  }

  validateReversalDate(originalPostingDate, reversalPostingDate) {
    if (!reversalPostingDate) return ['posting_date is required for reversal.'];
    const orig = new Date(originalPostingDate);
    const rev = new Date(reversalPostingDate);
    if (Number.isNaN(orig.getTime()) || Number.isNaN(rev.getTime())) {
      return ['posting_date values must be valid dates.'];
    }
    if (rev < orig) {
      return [`Reversal posting date ${reversalPostingDate} is before original posting date ${originalPostingDate}.`];
    }
    return [];
  }
}

module.exports = PostingValidator;
