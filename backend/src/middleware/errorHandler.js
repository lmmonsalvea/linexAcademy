// Centralized error handler. Routes call next(err) with either a plain
// Error, a Zod error (from schema.safeParse), or a plain object shaped like
// { status, message, details }.
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const status = err.status || 500;
  const message = err.message || 'Error interno';

  if (status >= 500) {
    console.error(JSON.stringify({ level: 'error', path: req.path, message, cause: err.cause?.message || err.stack }));
  }

  res.status(status).json({ error: message, details: err.details });
}

function asyncRoute(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

module.exports = { errorHandler, asyncRoute };
