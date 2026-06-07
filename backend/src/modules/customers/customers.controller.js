'use strict';

const svc = require('./customers.service');

const list    = async (req, res, next) => { try { const r = await svc.listCustomers(req.prisma, req.query); res.json({ customers: r.items, total: r.total, page: r.page, limit: r.limit }); } catch(e) { next(e); } };
const create  = async (req, res, next) => { try { res.status(201).json(await svc.createCustomer(req.prisma, req.body)); } catch(e) { next(e); } };
const getById = async (req, res, next) => { try { res.json(await svc.getCustomerById(req.prisma, req.params.id));   } catch(e) { next(e); } };
const update  = async (req, res, next) => { try { res.json(await svc.updateCustomer(req.prisma, req.params.id, req.body)); } catch(e) { next(e); } };
const remove  = async (req, res, next) => { try { res.json(await svc.deleteCustomer(req.prisma, req.params.id));    } catch(e) { next(e); } };

module.exports = { list, create, getById, update, remove };
