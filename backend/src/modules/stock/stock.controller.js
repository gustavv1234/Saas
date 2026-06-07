'use strict';

const svc = require('./stock.service');

const position     = async (req, res, next) => { try { const r = await svc.getStockPosition(req.prisma, req.query);   res.json({ products: r.items, total: r.total }); } catch(e) { next(e); } };
const movement     = async (req, res, next) => { try { res.status(201).json(await svc.registerMovement(req.prisma, req.body, req.user.id));                          } catch(e) { next(e); } };
const movements    = async (req, res, next) => { try { const r = await svc.listMovements(req.prisma, req.query);      res.json({ movements: r.items, total: r.total }); } catch(e) { next(e); } };
const byProduct    = async (req, res, next) => { try { const r = await svc.listMovements(req.prisma, { ...req.query, productId: req.params.productId }); res.json({ movements: r.items, total: r.total }); } catch(e) { next(e); } };

module.exports = { position, movement, movements, byProduct };
