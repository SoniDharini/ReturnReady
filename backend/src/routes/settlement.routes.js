import { Router } from 'express';
import * as comparisonController from '../controllers/comparison.controller.js';
import * as settlementController from '../controllers/settlement.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import {
  damageAssessmentSchema,
  deductionSchema,
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

router.get('/tenancies/:tenancyId/deductions', settlementController.listDeductions);
router.post(
  '/tenancies/:tenancyId/deductions',
  validateBody(deductionSchema),
  settlementController.createDeduction,
);
router.patch(
  '/deductions/:deductionId',
  validateBody(deductionSchema.partial()),
  settlementController.updateDeduction,
);
router.delete('/deductions/:deductionId', settlementController.removeDeduction);

export default router;
