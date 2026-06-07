'use strict';

const svc = require('./tenants.service');

const list    = async (req, res, next) => { try { res.json(await svc.listTenants());                                } catch(e) { next(e); } };
const create  = async (req, res, next) => { try { res.status(201).json(await svc.createTenant(req.body));          } catch(e) { next(e); } };
const getById = async (req, res, next) => { try { res.json(await svc.getTenantById(req.params.id));                } catch(e) { next(e); } };
const update  = async (req, res, next) => { try { res.json(await svc.updateTenant(req.params.id, req.body));       } catch(e) { next(e); } };

module.exports = { list, create, getById, update };
