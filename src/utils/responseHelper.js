/**
 * Standard response helper for consistent API responses
 */
export const createSuccessResponse = (data, message = 'Operation successful', additionalData = {}) => {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
    ...additionalData
  };
};

export const createErrorResponse = (message, error = null, statusCode = 500) => {
  return {
    success: false,
    message,
    error: error?.message || error,
    timestamp: new Date().toISOString()
  };
};

export const createPaginatedResponse = (data, page = 1, limit = 20, total = null, message = 'Data retrieved successfully', additionalData = {}) => {
  return {
    success: true,
    message,
    data,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: total !== null ? total : (Array.isArray(data) ? data.length : 0)
    },
    timestamp: new Date().toISOString(),
    ...additionalData
  };
};
