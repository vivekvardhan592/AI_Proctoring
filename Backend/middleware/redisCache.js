const { getRedisClient, isConnected } = require('../config/redis');

// Create caching middleware
const routeCache = (keyPrefix, durationInSeconds = 60) => {
    return async (req, res, next) => {
        // Fallback to normal behavior if Redis is unavailable
        if (!isConnected()) {
            return next();
        }

        const redisClient = getRedisClient();
        
        // Differentiate cache by institution to avoid data leaks
        let cacheKey = `${keyPrefix}:${req.originalUrl}`;
        if (req.user && req.user.institution) {
             cacheKey += `:${req.user.institution}`;
        }
        
        try {
            const cachedData = await redisClient.get(cacheKey);
            if (cachedData) {
                // Return cached version
                return res.status(200).json(JSON.parse(cachedData));
            }

            // Wrap res.json to capture and cache output
            const originalJson = res.json.bind(res);
            res.json = (body) => {
                if (body && body.success) {
                    redisClient.setEx(cacheKey, durationInSeconds, JSON.stringify(body))
                        .catch(err => console.error('Redis SetEx Error:', err.message));
                }
                return originalJson(body);
            };

            next();
        } catch (error) {
            console.error('Redis GET error:', error.message);
            next();
        }
    };
};

module.exports = { routeCache };
