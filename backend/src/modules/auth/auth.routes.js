'use strict';

const { Router } = require('express');
const { login: loginController } = require('./auth.controller');
const { loginRateLimiter } = require('../../middlewares/rateLimiter');

const router = Router();

// POST /api/auth/login
// Rate limiter aplicado apenas nesta rota — protege contra força bruta
router.post('/login', loginRateLimiter, loginController);

module.exports = router;
