import { Router } from 'express';
import { buildOpenApiSpec } from './registry';

export const openapiRouter = Router();

openapiRouter.get('/openapi.json', (_req, res) => {
  res.json(buildOpenApiSpec());
});
