const jwt = require('jsonwebtoken');

/**
 * Generates a signed JWT token for the given user ID.
 * @param {string} id - The MongoDB user document _id
 * @returns {string} Signed JWT token
 */
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
};

module.exports = generateToken;
