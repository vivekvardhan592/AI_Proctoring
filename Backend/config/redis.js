const { createClient } = require('redis');

let redisClient;
let isRedisConnected = false;

const connectRedis = async () => {
    redisClient = createClient({
        url: process.env.REDIS_URI || 'redis://127.0.0.1:6379'
    });

    redisClient.on('error', (error) => {
        // In local development, if Redis is missing, we log it without crashing
        console.warn('Redis connection error (Is Redis running?):', error.message);
        isRedisConnected = false;
    });

    redisClient.on('connect', () => {
        console.log('Connected to Redis successfully');
        isRedisConnected = true;
    });

    try {
        await redisClient.connect();
    } catch (err) {
        console.warn('Init: Failed to connect to Redis. Application will fallback to direct database queries.');
    }
};

const getRedisClient = () => redisClient;
const isConnected = () => isRedisConnected;

module.exports = { connectRedis, getRedisClient, isConnected };
