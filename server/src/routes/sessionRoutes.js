'use strict';

const router = require('express').Router();
const sessionController = require('../controllers/sessionController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/start', sessionController.startSession);
router.patch('/:id/stop', sessionController.stopSession);
router.get('/', sessionController.getMySessions);
router.get('/:id', sessionController.getSession);

module.exports = router;
