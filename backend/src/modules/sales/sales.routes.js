'use strict';

const { Router } = require('express');
const auth = require('../../middlewares/auth');
const ctrl = require('./sales.controller');

const router = Router();
router.use(auth);
router.get('/',    ctrl.list);
router.post('/',   ctrl.create);
router.get('/:id', ctrl.getById);
router.delete('/:id', ctrl.cancel);

module.exports = router;
