'use strict';

const svc = require('./categories.service');

const list   = async (req, res, next) => { try { res.json({ categories: await svc.listCategories(req.prisma) });             } catch(e) { next(e); } };
const create = async (req, res, next) => { try { res.status(201).json(await svc.createCategory(req.prisma, req.body));          } catch(e) { next(e); } };
const update = async (req, res, next) => { try { res.json(await svc.updateCategory(req.prisma, req.params.id, req.body));       } catch(e) { next(e); } };
const remove = async (req, res, next) => { try { res.json(await svc.deleteCategory(req.prisma, req.params.id));                 } catch(e) { next(e); } };

module.exports = { list, create, update, remove };
