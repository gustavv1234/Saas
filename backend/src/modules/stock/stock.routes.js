'use strict';

const { Router } = require('express');
const auth = require('../../middlewares/auth');
const ctrl = require('./stock.controller');

const router = Router();
router.use(auth);
router.get('/',                       ctrl.position);
router.get('/position',               ctrl.position);
router.post('/movements',             ctrl.movement);
router.post('/movement',              ctrl.movement);
router.get('/movements',              ctrl.movements);
router.get('/movements/:productId',   ctrl.byProduct);

module.exports = router;
