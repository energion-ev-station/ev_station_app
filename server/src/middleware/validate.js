'use strict';

const { validationResult } = require('express-validator');

/**
 * Runs after express-validator check() chains.
 * Returns 422 with formatted errors if any field fails validation.
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map(({ path, msg }) => ({ field: path, message: msg })),
        });
    }
    next();
};

module.exports = validate;
