import { v4 as uuidv4 } from 'uuid';

/**
 * Add unique request ID for tracking
 */
export const requestId = (req, res, next) => {
  req.id = uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
};
