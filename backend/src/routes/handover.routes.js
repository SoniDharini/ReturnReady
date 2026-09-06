import { Router } from 'express';
import * as handoverController from '../controllers/handover.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import {
  approveChangeSchema,
  changeRequestSchema,
  changeComplianceSchema,
  chatMessageSchema,
  completeChangeSchema,
  complianceSchema,
  conditionSchema,
  conditionUpdateSchema,
  rejectChangeSchema,
} from '../validators/handover.validator.js';
import { validateBody } from '../validators/resource.validator.js';

const router = Router();

router.use(protect);

router.get('/tenancies/:tenancyId/conditions', handoverController.listConditions);
router.post(
  '/tenancies/:tenancyId/conditions',
  validateBody(conditionSchema),
  handoverController.createCondition,
);
router.post('/tenancies/:tenancyId/conditions/accept', handoverController.acceptConditions);
router.patch(
  '/conditions/:conditionId',
  validateBody(conditionUpdateSchema),
  handoverController.updateCondition,
);
router.delete('/conditions/:conditionId', handoverController.deleteCondition);
router.post(
  '/conditions/:conditionId/compliance',
  validateBody(complianceSchema),
  handoverController.reviewCompliance,
);

router.get('/tenancies/:tenancyId/property-change-chat', handoverController.getPropertyChangeChat);
router.post(
  '/tenancies/:tenancyId/property-change-chat/messages',
  validateBody(chatMessageSchema),
  handoverController.sendPropertyChangeMessage,
);
router.get('/change-requests/pending', handoverController.listPendingChangeRequests);
router.get('/tenancies/:tenancyId/change-requests', handoverController.listChangeRequests);
router.post(
  '/tenancies/:tenancyId/change-requests',
  validateBody(changeRequestSchema),
  handoverController.createChangeRequest,
);
router.get('/change-requests/:requestId', handoverController.getChangeRequest);
router.post(
  '/change-requests/:requestId/approve',
  validateBody(approveChangeSchema),
  handoverController.approveChangeRequest,
);
router.post(
  '/change-requests/:requestId/reject',
  validateBody(rejectChangeSchema),
  handoverController.rejectChangeRequest,
);
router.post(
  '/change-requests/:requestId/complete',
  validateBody(completeChangeSchema),
  handoverController.completeChangeRequest,
);
router.post('/change-requests/:requestId/cancel', handoverController.cancelChangeRequest);
router.post('/change-requests/:requestId/accept-conditions', handoverController.acceptOwnerConditions);
router.post(
  '/change-requests/:requestId/compliance',
  validateBody(changeComplianceSchema),
  handoverController.reviewChangeCompliance,
);

export default router;
