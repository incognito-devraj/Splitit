import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PG Splito API',
      version: '1.0.0',
      description: 'Expense splitting API for PG residents',
    },
    servers: [
      { url: `http://localhost:${env.PORT}/api`, description: 'Local' },
      { url: 'https://splito-api.onrender.com/api', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
