import { Router } from 'express';
import * as tenancyController from '../controllers/tenancy.controller.js';
import * as tenancyExtensionController from '../controllers/tenancyExtension.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { requireOwner } from '../middleware/role.middleware.js';
import {
  tenancySchema,
  tenancyUpdateSchema,
  startMoveOutSchema,
  validateBody,
} from '../validators/resource.validator.js';
import {
  createExtensionSchema,
  rejectExtensionSchema,
} from '../validators/tenancyExtension.validator.js';

const router = Router();

router.use(protect);

router.get('/', requireOwner, tenancyController.list);
router.post('/', requireOwner, validateBody(tenancySchema), tenancyController.create);
router.get('/:id/move-out-context', tenancyController.getMoveOutContext);
router.post(
  '/:id/extension-requests',
  validateBody(createExtensionSchema),
  tenancyExtensionController.createRequest,
);
router.get('/:id/extension-requests', tenancyExtensionController.listRequests);
router.get('/extension-requests/:requestId', tenancyExtensionController.getRequest);
router.post('/extension-requests/:requestId/approve', tenancyExtensionController.approveRequest);
router.post(
  '/extension-requests/:requestId/reject',
  validateBody(rejectExtensionSchema),
  tenancyExtensionController.rejectRequest,
);
router.post('/extension-requests/:requestId/cancel', tenancyExtensionController.cancelRequest);
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
