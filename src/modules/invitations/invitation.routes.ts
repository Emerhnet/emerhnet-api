import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';
import * as controller from './invitation.controller';

export const invitationsRouter = Router();

// Public — invitee uses this to prefill the registration form.
invitationsRouter.get('/verify/:token', controller.getVerify);

// Super admin group
const superAdmin = Router();
superAdmin.use(requireAuth, requireRole('superAdmin'));

superAdmin.post('/', controller.postCreate);
superAdmin.get('/', controller.getList);
superAdmin.post('/:id/reissue', controller.postReissue);
superAdmin.post('/:id/cancel', controller.postCancel);

invitationsRouter.use(superAdmin);
