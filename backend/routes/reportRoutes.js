const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/reportController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);
router.get('/monthly-summary', ctrl.monthlySummary);
router.get('/category-breakdown', ctrl.categoryBreakdown);
router.get('/top-categories', ctrl.topCategories);
router.get('/budget-vs-actual', ctrl.budgetVsActual);
router.get('/year-over-year', ctrl.yearOverYear);

module.exports = router;
