const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/adminController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Protect all admin endpoints
router.use(requireAuth, requireAdmin);

// Dashboard & Analytics
router.get('/dashboard', ctrl.getDashboard);
router.get('/statistics', ctrl.getStatistics);
router.get('/audit-logs', ctrl.auditLogs);
router.get('/deleted-users', ctrl.deletedUsers);

// User Management
router.get('/users', ctrl.getUsers);
router.get('/users/:id', ctrl.getUserById);
router.get('/users/:id/transactions', ctrl.getUserTransactions);
router.get('/users/:id/categories', ctrl.getUserCategories);
router.get('/users/:id/budgets', ctrl.getUserBudgets);
router.get('/users/:id/reports', ctrl.getUserReports);
router.get('/users/:id/audit-logs', ctrl.getUserAuditLogs);

// User Actions
router.put('/users/:id/status', ctrl.toggleUserStatus);
router.post('/users/:id/restore', ctrl.restoreUser);
router.delete('/users/:id', ctrl.deleteUser);

module.exports = router;
