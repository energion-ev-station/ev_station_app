'use strict';

const router = require('express').Router();
const authRoutes = require('./authRoutes');
const stationRoutes = require('./stationRoutes');
const sessionRoutes = require('./sessionRoutes');

router.use('/auth', authRoutes);
router.use('/stations', stationRoutes);
router.use('/sessions', sessionRoutes);

module.exports = router;
