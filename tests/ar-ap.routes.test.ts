// EW-02 — Unit Tests: AR/AP route-boundary normalization hotfix

import { optionalSingle, requiredSingle } from '../src/routes/ar-ap.routes';

describe('EW-02: AR/AP route boundary normalization', () => {
  describe('requiredSingle', () => {
    it('accepts one non-empty string from route params', () => {
      expect(requiredSingle('company-1', 'companyId')).toBe('company-1');
    });

    it('accepts a single string array from Express values', () => {
      expect(requiredSingle(['rv-1'], 'id')).toBe('rv-1');
    });

    it('rejects missing, blank, non-string or multi-value required fields', () => {
      expect(() => requiredSingle(undefined, 'companyId')).toThrow('companyId must be a non-empty string.');
      expect(() => requiredSingle('   ', 'companyId')).toThrow('companyId must be a non-empty string.');
      expect(() => requiredSingle(['rv-1', 'rv-2'], 'id')).toThrow('id must be a single non-empty string.');
      expect(() => requiredSingle([123], 'id')).toThrow('id must be a single non-empty string.');
    });
  });

  describe('optionalSingle', () => {
    it('returns undefined for absent optional fields', () => {
      expect(optionalSingle(undefined, 'partyId')).toBeUndefined();
      expect(optionalSingle(null, 'partyId')).toBeUndefined();
      expect(optionalSingle([], 'partyId')).toBeUndefined();
    });

    it('accepts one string from headers or query params', () => {
      expect(optionalSingle('idem-1', 'idempotency-key')).toBe('idem-1');
      expect(optionalSingle(['party-1'], 'partyId')).toBe('party-1');
      expect(optionalSingle('2026-06-01', 'fromDate')).toBe('2026-06-01');
    });

    it('rejects multi-value or non-string optional fields', () => {
      expect(() => optionalSingle(['idem-1', 'idem-2'], 'idempotency-key')).toThrow('idempotency-key must be a single string.');
      expect(() => optionalSingle(123, 'partyId')).toThrow('partyId must be a string.');
      expect(() => optionalSingle([123], 'toDate')).toThrow('toDate must be a single string.');
    });
  });
});
