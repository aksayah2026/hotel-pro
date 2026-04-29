const express = require('express');
const router = express.Router();
const { login, getProfile, createUser, getAllUsers, updateUser, deleteUser } = require('../controllers/auth.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');

router.post('/login', login);
router.get('/profile', authenticate, getProfile);
router.post('/users', authenticate, requireAdmin, createUser);
router.get('/users', authenticate, requireAdmin, getAllUsers);
router.put('/users/:id', authenticate, requireAdmin, updateUser);
router.delete('/users/:id', authenticate, requireAdmin, deleteUser);

module.exports = router;
