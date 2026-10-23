/**
 * asyncHandler — wraps an async Express route handler so that any
 * rejected promise is forwarded to the next() error handler instead
 * of becoming an unhandled rejection (Express 4 does not catch them
 * automatically).
 *
 * Usage:
 *   exports.myRoute = asyncHandler(async (req, res) => { ... });
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
