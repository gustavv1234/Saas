'use strict';

const { Router } = require('express');
const auth = require('../../middlewares/auth');
const ctrl = require('./reports.controller');

const router = Router();
router.use(auth);
router.get('/sales-summary',      ctrl.summary);
router.get('/top-products',       ctrl.top);
router.get('/low-stock',          ctrl.lowStock);
router.get('/customers-ranking',  ctrl.ranking);

module.exports = router;
