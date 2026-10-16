/**
 * Middleware to set Cache-Control headers for CDN and browser caching.
 * Default: public, s-maxage=60, stale-while-revalidate=300
 */
const cacheControl = (options = "public, s-maxage=60, stale-while-revalidate=300") => {
    return (req, res, next) => {
        if (typeof options === "string") {
            res.set("Cache-Control", options);
        } else if (typeof options === "object" && options !== null) {
            const {
                isPublic = true,
                maxAge = 0,
                sMaxAge = 60,
                staleWhileRevalidate = 300,
            } = options;

            const directives = [
                isPublic ? "public" : "private",
                `max-age=${maxAge}`,
                `s-maxage=${sMaxAge}`,
                `stale-while-revalidate=${staleWhileRevalidate}`,
            ];
            res.set("Cache-Control", directives.join(", "));
        }
        next();
    };
};

module.exports = { cacheControl };
