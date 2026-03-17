import type { FastifyRequest, FastifyReply } from 'fastify';
import type { App } from '../index.js';

const REVENUECAT_PROJECT_ID = 'projdc288c2c';
const REVENUECAT_API_BASE = 'https://api.revenuecat.com/v2/projects';

interface RevenueCatErrorResponse {
  error: string;
}

interface CustomerParams {
  app_user_id: string;
}

export function registerRevenueCatRoutes(app: App): void {
  // GET /api/revenuecat/offerings
  app.fastify.get(
    '/api/revenuecat/offerings',
    {
      schema: {
        description: 'Get RevenueCat offerings',
        tags: ['revenuecat'],
        response: {
          200: {
            description: 'Offerings retrieved successfully',
            type: 'object',
          },
          500: {
            description: 'Server error',
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      app.logger.info({}, 'Fetching RevenueCat offerings');

      const secretKey = process.env.REVENUECAT_V2_SECRET_KEY;
      if (!secretKey) {
        app.logger.error({}, 'RevenueCat API key not configured');
        reply.status(500).send({ error: 'RevenueCat API key not configured' });
        return;
      }

      try {
        const url = `${REVENUECAT_API_BASE}/${REVENUECAT_PROJECT_ID}/offerings`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();

        if (!response.ok) {
          app.logger.error(
            { status: response.status },
            'RevenueCat API error'
          );

          if (response.status >= 500) {
            reply.status(502).send({ error: 'RevenueCat service unavailable' });
          } else if (response.status >= 400) {
            reply
              .status(response.status)
              .send({ error: `RevenueCat API error: ${response.status}` });
          }
          return;
        }

        app.logger.info({}, 'Offerings retrieved successfully');
        reply.status(200).send(data);
      } catch (error) {
        app.logger.error(
          { err: error },
          'Failed to reach RevenueCat API'
        );
        reply.status(502).send({ error: 'Failed to reach RevenueCat API' });
      }
    }
  );

  // GET /api/revenuecat/customers/:app_user_id
  app.fastify.get(
    '/api/revenuecat/customers/:app_user_id',
    {
      schema: {
        description: 'Get RevenueCat customer info',
        tags: ['revenuecat'],
        params: {
          type: 'object',
          required: ['app_user_id'],
          properties: {
            app_user_id: {
              type: 'string',
              description: 'Customer app user ID',
            },
          },
        },
        response: {
          200: {
            description: 'Customer info retrieved successfully',
            type: 'object',
          },
          500: {
            description: 'Server error',
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: CustomerParams }>,
      reply: FastifyReply
    ): Promise<void> => {
      const { app_user_id } = request.params;
      app.logger.info({ app_user_id }, 'Fetching RevenueCat customer info');

      const secretKey = process.env.REVENUECAT_V2_SECRET_KEY;
      if (!secretKey) {
        app.logger.error({}, 'RevenueCat API key not configured');
        reply.status(500).send({ error: 'RevenueCat API key not configured' });
        return;
      }

      try {
        const url = `${REVENUECAT_API_BASE}/${REVENUECAT_PROJECT_ID}/customers/${encodeURIComponent(app_user_id)}`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();

        if (!response.ok) {
          app.logger.error(
            { status: response.status, app_user_id },
            'RevenueCat API error'
          );

          if (response.status >= 500) {
            reply.status(502).send({ error: 'RevenueCat service unavailable' });
          } else if (response.status >= 400) {
            reply
              .status(response.status)
              .send({ error: `RevenueCat API error: ${response.status}` });
          }
          return;
        }

        app.logger.info({ app_user_id }, 'Customer info retrieved successfully');
        reply.status(200).send(data);
      } catch (error) {
        app.logger.error(
          { err: error, app_user_id },
          'Failed to reach RevenueCat API'
        );
        reply.status(502).send({ error: 'Failed to reach RevenueCat API' });
      }
    }
  );
}
