import { Router } from 'express';
import * as tenancyController from '../controllers/tenancy.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { requireOwner } from '../middleware/role.middleware.js';
import { tenancySchema, tenancyUpdateSchema, startMoveOutSchema, validateBody } from '../validators/resource.validator.js';

const router = Router();

router.use(protect, requireOwner);

router.get('/', tenancyController.list);
router.post('/', validateBody(tenancySchema), tenancyController.create);
router.get('/:id', tenancyController.getOne);
router.patch('/:id', validateBody(tenancyUpdateSchema), tenancyController.update);
router.post('/:id/start-move-out', validateBody(startMoveOutSchema), tenancyController.startMoveOut);
router.post('/:id/cancel-invite', tenancyController.cancelInvite);
router.post('/:id/resend-invite', tenancyController.resendInvite);

export default router;
