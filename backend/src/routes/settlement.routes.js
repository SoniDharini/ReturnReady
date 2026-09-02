import { Router } from 'express';
import * as comparisonController from '../controllers/comparison.controller.js';
import * as settlementController from '../controllers/settlement.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import {
  damageAssessmentSchema,
  deductionSchema,
  disputeSchema,
  resolveDisputeSchema,
  signSchema,
  validateBody,
} from '../validators/settlement.validator.js';

const router = Router();

router.use(protect);

router.get('/tenancies/:tenancyId/comparison', comparisonController.getComparison);

router.get('/tenancies/:tenancyId/damage-assessments', settlementController.listAssessments);
router.post(
  '/tenancies/:tenancyId/damage-assessments',
  validateBody(damageAssessmentSchema),
  settlementController.upsertAssessment,
);
router.delete('/damage-assessments/:assessmentId', settlementController.removeAssessment);

router.get('/tenancies/:tenancyId/settlement', settlementController.getSettlement);
router.get('/tenancies/:tenancyId/deductions', settlementController.listDeductions);
router.post(
  '/tenancies/:tenancyId/deductions',
  validateBody(deductionSchema),
  settlementController.createDeduction,
);
router.post('/tenancies/:tenancyId/deductions/submit', settlementController.submitForReview);
router.post('/tenancies/:tenancyId/settlement/approve', settlementController.approveSettlement);
router.post(
  '/tenancies/:tenancyId/settlement/sign',
  validateBody(signSchema),
  settlementController.signSettlement,
);
router.post('/tenancies/:tenancyId/complete', settlementController.completeTenancy);
router.post('/tenancies/:tenancyId/report/generate', settlementController.generateReport);

router.patch(
  '/deductions/:deductionId',
  validateBody(deductionSchema.partial()),
  settlementController.updateDeduction,
);
router.delete('/deductions/:deductionId', settlementController.removeDeduction);
router.post('/deductions/:deductionId/accept', settlementController.acceptDeduction);
router.post(
  '/deductions/:deductionId/dispute',
  validateBody(disputeSchema),
  settlementController.disputeDeduction,
);

router.post(
  '/disputes/:disputeId/resolve',
  validateBody(resolveDisputeSchema),
  settlementController.resolveDispute,
);

router.get('/reports', settlementController.listReports);
router.get('/reports/:reportId', settlementController.getReport);

export default router;
