'use strict';

const express = require('express');

const AccountRepository = require('./repositories/AccountRepository');
const FiscalPeriodRepository = require('./repositories/FiscalPeriodRepository');
const JournalEntryRepository = require('./repositories/JournalEntryRepository');
const GlEntryRepository = require('./repositories/GlEntryRepository');
const PostingValidator = require('./validators/PostingValidator');
const { PostingService } = require('./services/PostingService');
const createGlRouter = require('./routes/gl');

function createApp(db) {
  const app = express();
  app.use(express.json());

  const accountRepo = new AccountRepository(db);
  const periodRepo = new FiscalPeriodRepository(db);
  const jeRepo = new JournalEntryRepository(db);
  const glRepo = new GlEntryRepository(db);

  const validator = new PostingValidator({
    accountRepository: accountRepo,
    fiscalPeriodRepository: periodRepo,
  });

  const postingService = new PostingService({
    journalEntryRepository: jeRepo,
    glEntryRepository: glRepo,
    postingValidator: validator,
    db,
  });

  app.use('/api/v1/companies/:companyId', createGlRouter(postingService));

  app.use((err, req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  });

  return app;
}

module.exports = createApp;
