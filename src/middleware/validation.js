import Joi from 'joi';
import logger from '../utils/logger.js';

/**
 * Validate query parameters using Joi
 */
export const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req.query);
      
      if (error) {
        logger.warn('Validation error:', {
          error: error.details[0].message,
          query: req.query,
          url: req.url
        });
        
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: error.details[0].message,
          timestamp: new Date().toISOString()
        });
      }
      
      // Merge validated values back to req.query
      Object.assign(req.query, value);
      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Common validation schemas using Joi
 */
export const schemas = {
  search: Joi.object({
    query: Joi.string().required().min(2).max(100).messages({
      'string.empty': 'Query parameter is required',
      'string.min': 'Query must be at least 2 characters long',
      'string.max': 'Query must not exceed 100 characters',
      'any.required': 'Query parameter is required'
    })
  }),
  
  pagination: Joi.object({
    pageNo: Joi.number().integer().min(1).default(1).messages({
      'number.base': 'Page number must be a number',
      'number.integer': 'Page number must be an integer',
      'number.min': 'Page number must be at least 1'
    }),
    pageSize: Joi.number().integer().min(1).max(100).default(20).messages({
      'number.base': 'Page size must be a number',
      'number.integer': 'Page size must be an integer',
      'number.min': 'Page size must be at least 1',
      'number.max': 'Page size must not exceed 100'
    })
  }),
  
  bookId: Joi.object({
    bookId: Joi.string().pattern(/^4200000\d+$/).required().messages({
      'string.pattern.base': 'Book ID must be in format 4200000XXXXX',
      'any.required': 'Book ID parameter is required'
    })
  }),
  
  keywords: Joi.object({
    keywords: Joi.string().required().min(2).max(100).messages({
      'string.empty': 'Keywords parameter is required',
      'string.min': 'Keywords must be at least 2 characters long',
      'string.max': 'Keywords must not exceed 100 characters',
      'any.required': 'Keywords parameter is required'
    })
  }),

  dubbed: Joi.object({
    classify: Joi.string().valid('terpopuler', 'terbaru').required().messages({
      'any.only': 'Classify must be either "terpopuler" or "terbaru"',
      'any.required': 'Classify parameter is required'
    }),
    page: Joi.number().integer().min(1).default(1).messages({
      'number.base': 'Page must be a number',
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1'
    })
  }),

  dramabiteAll: Joi.object({
    maxPages: Joi.number().integer().min(1).max(20).default(3).messages({
      'number.base': 'maxPages must be a number',
      'number.integer': 'maxPages must be an integer',
      'number.min': 'maxPages must be at least 1',
      'number.max': 'maxPages must not exceed 20'
    })
  }),

  meloloSearch: Joi.object({
    query: Joi.string().required().min(2).max(100).messages({
      'string.empty': 'Query parameter is required',
      'string.min': 'Query must be at least 2 characters long',
      'string.max': 'Query must not exceed 100 characters',
      'any.required': 'Query parameter is required'
    }),
    offset: Joi.alternatives().try(
      Joi.number().integer().min(0),
      Joi.string().pattern(/^\d+$/)
    ).default('0'),
    limit: Joi.alternatives().try(
      Joi.number().integer().min(1).max(50),
      Joi.string().pattern(/^\d+$/)
    ).default('10')
  })
};
