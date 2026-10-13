exports.notFound = (req, res) => res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
exports.errorHandler = (err, req, res, _next) => {
  let status = err.status || 500, message = err.message, details = err.details;
  if (err.name === 'ValidationError') { status = 400; details = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message])); message = 'Validation failed'; }
  if (err.code === 11000) { status = 409; message = 'Duplicate record: ' + Object.keys(err.keyValue || {}).join(', '); }
  if (err.name === 'CastError') { status = 400; message = `Invalid ${err.path}`; }
  if (status >= 500) console.error(err);
  res.status(status).json({ success: false, message: status >= 500 && process.env.NODE_ENV === 'production' ? 'Server error' : message, details });
};
