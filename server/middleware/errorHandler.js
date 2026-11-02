export function notFound(req, res) { res.status(404).json({ error: 'Route not found.' }); }
export function errorHandler(err, req, res, next) {
  const status = err.status || (err.name === 'CastError' ? (err.path === '_id' ? 404 : 422) : err.name === 'ZodError' ? 400 : err.name === 'ValidationError' ? 422 : 500);
  if (status >= 500) console.error('Unhandled API error:', err.message);
  const message = err.name === 'ZodError'
    ? 'Please check the submitted fields.'
    : err.name === 'ValidationError' || (err.name === 'CastError' && err.path !== '_id')
      ? 'The generated case could not be saved because its data did not match the case schema.'
      : status === 500
        ? 'The server encountered an unexpected error. Check the backend log for details.'
        : err.message;
  res.status(status).json({ error: message });
}
