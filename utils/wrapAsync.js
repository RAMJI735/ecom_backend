/**
 * wrapAsync (Async Error Handler Wrapper)
 * Wraps async Express route handlers and middleware so that
 * any rejected promise or thrown error is caught and forwarded
 * to the centralized Express error handler via next(err).
 *
 * @param {Function} fn - Async Express handler (req, res, next) => Promise<any>
 * @returns {Function} Express middleware function
 */

const wrapAsync = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};




module.exports = wrapAsync;
module.exports.wrapAsync = wrapAsync;
module.exports.default = wrapAsync;


module.exports = wrapAsync;
module.exports.wrapAsync = wrapAsync;
module.exports.default = wrapAsync;