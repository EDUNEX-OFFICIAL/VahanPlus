/**
 * Wraps async Express route handlers so rejections reach the error middleware.
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Maps Prisma/DB failures to a 503 response for browse endpoints.
 */
export function isDatabaseError(err) {
  if (!err || typeof err !== 'object') return false;
  const code = err.code;
  return (
    code === 'P1001' ||
    code === 'P1002' ||
    code === 'P1017' ||
    code === 'P2024' ||
    err.name === 'PrismaClientInitializationError' ||
    err.name === 'PrismaClientKnownRequestError'
  );
}
