import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import * as controller from './department.controller';

export const departmentsRouter = Router();
departmentsRouter.use(requireAuth, requireRole('hospitalAdmin'));

departmentsRouter.get('/', controller.getList);
departmentsRouter.post('/', controller.postCreate);
departmentsRouter.patch('/:id', controller.patchOne);
departmentsRouter.delete('/:id', controller.deleteOne);
