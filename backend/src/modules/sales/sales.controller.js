'use strict';

const svc = require('./sales.service');

const list   = async (req, res, next) => { try { const r = await svc.listSales(req.prisma, req.query); res.json({ sales: r.items, total: r.total, page: r.page, limit: r.limit }); } catch(e) { next(e); } };
const create = async (req, res, next) => { try { res.status(201).json(await svc.createSale(req.prisma, req.body, req.user.id));     } catch(e) { next(e); } };
const getById= async (req, res, next) => { try { res.json(await svc.getSaleById(req.prisma, req.params.id));                        } catch(e) { next(e); } };
const cancel = async (req, res, next) => { try { res.json(await svc.cancelSale(req.prisma, req.params.id, req.user.id));            } catch(e) { next(e); } };

module.exports = { list, create, getById, cancel };
