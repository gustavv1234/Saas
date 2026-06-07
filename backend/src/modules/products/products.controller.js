'use strict';

const svc = require('./products.service');

const list      = async (req, res, next) => { try { const r = await svc.listProducts(req.prisma, req.query); res.json({ products: r.items, total: r.total, page: r.page, limit: r.limit }); } catch(e) { next(e); } };
const lowStock  = async (req, res, next) => { try { res.json(await svc.getLowStock(req.prisma));                          } catch(e) { next(e); } };
const create    = async (req, res, next) => { try { res.status(201).json(await svc.createProduct(req.prisma, req.body));  } catch(e) { next(e); } };
const getById   = async (req, res, next) => { try { res.json(await svc.getProductById(req.prisma, req.params.id));        } catch(e) { next(e); } };
const update    = async (req, res, next) => { try { res.json(await svc.updateProduct(req.prisma, req.params.id, req.body)); } catch(e) { next(e); } };
const remove    = async (req, res, next) => { try { res.json(await svc.deleteProduct(req.prisma, req.params.id));         } catch(e) { next(e); } };

module.exports = { list, lowStock, create, getById, update, remove };
