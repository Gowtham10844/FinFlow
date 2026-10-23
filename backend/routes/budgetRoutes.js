const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/budgetController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);
router.get('/', ctrl.list);
router.get('/deleted', ctrl.listDeleted);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.patch('/:id/restore', ctrl.restore);
router.delete('/:id/permanent', ctrl.permanentRemove);

module.exports = router;
