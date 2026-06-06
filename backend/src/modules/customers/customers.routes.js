'use strict';

const { Router } = require('express');
const authMiddleware = require('../../middlewares/auth');
const {
  createCustomerController,
  listCustomersController,
  getCustomerController,
  updateCustomerController,
  deleteCustomerController,
} = require('./customers.controller');

const router = Router();

// Todas as rotas de clientes exigem JWT válido
router.use(authMiddleware);

router.post('/',    createCustomerController);
router.get('/',     listCustomersController);
router.get('/:id',  getCustomerController);
router.put('/:id',  updateCustomerController);
router.delete('/:id', deleteCustomerController);

module.exports = router;
