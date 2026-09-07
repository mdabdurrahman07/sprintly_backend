import { createClient } from 'redis';
import { config } from '../config';


export const redisClient = createClient({
    username: config.redis_user,
    password: config.redis_password,
    socket: {
        host: config.redis_host,
        port: Number(config.redis_port)
    }
});

redisClient.on('error', (error) => {
    console.error('Redis client error:', error);
});

let connectionPromise: Promise<void> | null = null;

export const ensureRedisConnection = async (): Promise<void> => {
    if (redisClient.isOpen) {
        return;
    }

    connectionPromise ??= redisClient.connect()
        .then(() => undefined)
        .catch((error) => {
            connectionPromise = null;
            throw error;
        });

    await connectionPromise;
};