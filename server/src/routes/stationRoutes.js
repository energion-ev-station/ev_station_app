'use strict';

const router = require('express').Router();
const { body } = require('express-validator');
const stationController = require('../controllers/stationController');
const { protect, restrict } = require('../middleware/auth');
const validate = require('../middleware/validate');

const createRules = [
    body('stationId').trim().notEmpty(),
    body('name').trim().notEmpty(),
    body('location.coordinates').isArray({ min: 2, max: 2 }).withMessage('Provide [lng, lat]'),
    body('connectorType').notEmpty(),
    body('maxPowerKW').isFloat({ gt: 0 }),
    body('pricePerKWh').isFloat({ min: 0 }),
];

router.use(protect);

router.get('/', stationController.getAllStations);
router.get('/:id', stationController.getStation);
router.post('/', restrict('admin'), createRules, validate, stationController.createStation);
router.patch('/:id', restrict('admin', 'operator'), stationController.updateStation);
router.delete('/:id', restrict('admin'), stationController.deleteStation);
router.post('/:id/command', restrict('admin', 'operator'), stationController.sendCommand);

module.exports = router;
