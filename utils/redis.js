const { createClient } = require("redis");

const redisUrl =
    process.env.REDIS_URL ||
    "rediss://default:gQAAAAAAAw6dAAIgcDE3ZTJiMzE3NGMxYzA0Y2Q2OWJjOWRmMjdkMmFlMTVlMA@measured-manatee-200349.upstash.io:6379";

const client = createClient({
    url: redisUrl,
    socket: {
        reconnectStrategy: (retries) => {
            if (retries > 5) {
                return new Error("Redis reconnection limit reached");
            }
            return Math.min(retries * 500, 3000);
        },
    },
});

client.on("error", (err) => console.error("Redis Error:", err.message));
client.on("connect", () => console.log("Connected to Upstash Redis"));

let isConnecting = false;
const connectRedis = async () => {
    if (!client.isOpen && !isConnecting) {
        isConnecting = true;
        try {
            await client.connect();
        } catch (err) {
            console.error("Redis connection error:", err.message);
        } finally {
            isConnecting = false;
        }
    }
    return client;
};

// Automatically initiate connection
connectRedis();

module.exports = {
    client,
    connectRedis,
};
module.exports.default = client;
