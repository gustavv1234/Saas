'use strict';

const { Router } = require('express');
const auth = require('../../middlewares/auth');
const ctrl = require('./tenants.controller');

const router = Router();
router.use(auth, auth.masterOnly);
router.get('/',    ctrl.list);
router.post('/',   ctrl.create);
router.get('/:id', ctrl.getById);
router.put('/:id', ctrl.update);

module.exports = router;
