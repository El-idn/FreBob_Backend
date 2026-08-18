import type { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiSpec } from './openapi.js';

export function mountSwagger(app: Express): void {
  app.get('/v1/openapi.json', (_req, res) => {
    res.json(openApiSpec);
  });

  const serve = swaggerUi.serve;
  const handlers = Array.isArray(serve) ? serve : [serve];

  app.use('/docs', ...handlers);
  app.get('/docs', swaggerUi.setup(openApiSpec, {
    customSiteTitle: 'FreBob API',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      tryItOutEnabled: true,
      filter: true,
      tagsSorter: 'alpha',
    },
  }));
}
