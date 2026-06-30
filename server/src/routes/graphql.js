import express from 'express';
import axios from 'axios';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// GraphQL Lambda endpoint (would be set in environment)
const LAMBDA_ENDPOINT = process.env.GRAPHQL_LAMBDA_ENDPOINT || 'http://localhost:4000/graphql';

// GraphQL query endpoint
router.post('/query', authMiddleware, asyncHandler(async (req, res) => {
  const { query, variables, operationName } = req.body;

  if (!query) {
    return res.status(400).json({
      success: false,
      error: {
        status: 400,
        message: 'GraphQL query is required',
      },
    });
  }

  try {
    logger.debug({
      event: 'GraphQL query',
      userId: req.user.userId,
      query: query.substring(0, 100) + '...',
    });

    // Add user context to GraphQL query
    const graphqlRequest = {
      query,
      variables: {
        ...variables,
        userId: req.user.userId,
      },
      operationName,
    };

    // Call Lambda function or local GraphQL endpoint
    const response = await axios.post(LAMBDA_ENDPOINT, graphqlRequest, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${req.headers.authorization?.split(' ')[1]}`,
      },
      timeout: 30000,
    });

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    logger.error({
      event: 'GraphQL query error',
      userId: req.user.userId,
      error: error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: {
        status: error.response?.status || 500,
        message: 'GraphQL query failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
    });
  }
}));

// GraphQL mutation endpoint
router.post('/mutation', authMiddleware, asyncHandler(async (req, res) => {
  const { query, variables, operationName } = req.body;

  if (!query) {
    return res.status(400).json({
      success: false,
      error: {
        status: 400,
        message: 'GraphQL mutation is required',
      },
    });
  }

  try {
    logger.info({
      event: 'GraphQL mutation',
      userId: req.user.userId,
      operation: operationName,
    });

    // Add user context to GraphQL mutation
    const graphqlRequest = {
      query,
      variables: {
        ...variables,
        userId: req.user.userId,
      },
      operationName,
    };

    // Call Lambda function or local GraphQL endpoint
    const response = await axios.post(LAMBDA_ENDPOINT, graphqlRequest, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${req.headers.authorization?.split(' ')[1]}`,
      },
      timeout: 30000,
    });

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    logger.error({
      event: 'GraphQL mutation error',
      userId: req.user.userId,
      error: error.message,
    });

    res.status(error.response?.status || 500).json({
      success: false,
      error: {
        status: error.response?.status || 500,
        message: 'GraphQL mutation failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
    });
  }
}));

export default router;
