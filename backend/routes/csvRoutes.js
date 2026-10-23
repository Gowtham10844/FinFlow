const express = require('express');
const multer = require('multer');
const router = express.Router();
const ctrl = require('../controllers/csvController');
const { requireAuth } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(requireAuth);
router.get('/export', ctrl.exportCsv);
router.post('/import', upload.single('file'), ctrl.importCsv);

module.exports = router;
