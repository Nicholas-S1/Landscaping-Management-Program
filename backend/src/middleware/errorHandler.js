/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      message: err.errors.map((e) => e.message).join('; ') || 'Validation error',
      errors: err.errors.map((e) => ({ field: e.path, message: e.message }))
    });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      success: false,
      message: err.errors.map((e) => `${e.path} already exists`).join('; ') || 'Duplicate entry',
      errors: err.errors.map((e) => ({ field: e.path, message: `${e.path} already exists` }))
    });
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({ success: false, message: 'A referenced record does not exist or is still in use' });
  }

  // Malformed ids, dates, numbers or option values sent by the client (PostgreSQL class 22 errors).
  if (err.name === 'SequelizeDatabaseError' && String(err.original?.code || '').startsWith('22')) {
    return res.status(400).json({ success: false, message: 'One of the values sent is not valid' });
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }

  if (err.name === 'MulterError') {
    return res.status(400).json({ success: false, message: err.code === 'LIMIT_FILE_SIZE' ? 'File is too large' : err.message });
  }

  const status = err.status || 500;
  if (status >= 500) console.error('Error:', err);

  res.status(status).json({
    success: false,
    message: status >= 500 && process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message || 'Internal server error'
  });
};

module.exports = errorHandler;
