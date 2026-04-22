const { createClient } = require('redis');

let redisClient;
let isRedisConnected = false;

const connectRedis = async () => {
    try {
        // 🚨 FORCE Redis URI (no fallback in production)
        if (!process.env.REDIS_URI) {
            throw new Error("REDIS_URI is not defined in environment variables");
        }

        redisClient = createClient({
            url: process.env.REDIS_URI
        });

        redisClient.on('error', (error) => {
            console.error('❌ Redis Error:', error.message);
            isRedisConnected = false;
        });

        redisClient.on('ready', () => {
            console.log('🔥 Redis is ready and connected');
            isRedisConnected = true;
        });

        await redisClient.connect();

    } catch (err) {
        console.error('❌ Redis connection failed:', err.message);
    }
};

const getRedisClient = () => redisClient;
const isConnected = () => isRedisConnected;

module.exports = { connectRedis, getRedisClient, isConnected };