'use strict';

const { Router } = require('express');
const auth = require('../../middlewares/auth');
const ctrl = require('./products.controller');

const router = Router();
router.use(auth);
router.get('/low-stock', ctrl.lowStock);
router.get('/',    ctrl.list);
router.post('/',   ctrl.create);
router.get('/:id', ctrl.getById);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
