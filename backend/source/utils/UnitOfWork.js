'use strict';

/**
 * Unit of Work helper for top-level application services.
 *
 * Business modules must open the transaction once, write their source document,
 * subledger/inventory/tax effects, call Core Accounting with the same `tx`,
 * then commit once.
 */
async function withTransaction(db, work) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (_rollbackErr) {
      // Preserve the original failure.
    }
    throw err;
  } finally {
    if (typeof client.release === 'function') client.release();
  }
}

function assertTransactionClient(tx) {
  if (!tx || typeof tx.query !== 'function') {
    throw new Error('A transaction client `tx` with query() is required. Open the Unit of Work in the business application service and pass the same tx to Core Accounting.');
  }
}

module.exports = { withTransaction, assertTransactionClient };
