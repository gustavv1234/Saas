'use strict';

const customersService = require('./customers.service');

async function createCustomerController(req, res, next) {
  try {
    const customer = await customersService.createCustomer(req.body);
    res.status(201).json({ message: 'Cliente cadastrado com sucesso.', customer });
  } catch (err) {
    next(err);
  }
}

async function listCustomersController(req, res, next) {
  try {
    const { page, limit, search, active } = req.query;
    const result = await customersService.listCustomers({ page, limit, search, active });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getCustomerController(req, res, next) {
  try {
    const customer = await customersService.getCustomerById(req.params.id);
    res.json(customer);
  } catch (err) {
    next(err);
  }
}

async function updateCustomerController(req, res, next) {
  try {
    const customer = await customersService.updateCustomer(req.params.id, req.body);
    res.json({ message: 'Cliente atualizado com sucesso.', customer });
  } catch (err) {
    next(err);
  }
}

async function deleteCustomerController(req, res, next) {
  try {
    await customersService.deleteCustomer(req.params.id);
    res.json({ message: 'Cliente desativado com sucesso.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createCustomerController,
  listCustomersController,
  getCustomerController,
  updateCustomerController,
  deleteCustomerController,
};
