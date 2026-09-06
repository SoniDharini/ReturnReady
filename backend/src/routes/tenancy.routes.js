import { Router } from 'express';
import * as tenancyController from '../controllers/tenancy.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { requireOwner } from '../middleware/role.middleware.js';
import { tenancySchema, tenancyUpdateSchema, startMoveOutSchema, validateBody } from '../validators/resource.validator.js';

const router = Router();

router.use(protect);

router.get('/', requireOwner, tenancyController.list);
router.post('/', requireOwner, validateBody(tenancySchema), tenancyController.create);
router.get('/:id', requireOwner, tenancyController.getOne);
router.patch('/:id', requireOwner, validateBody(tenancyUpdateSchema), tenancyController.update);
router.post(
  '/:id/start-move-out',
  requireOwner,
  validateBody(startMoveOutSchema),
  tenancyController.startMoveOut,
);
router.post('/:id/cancel-invite', requireOwner, tenancyController.cancelInvite);
router.post('/:id/resend-invite', requireOwner, tenancyController.resendInvite);

export default router;
