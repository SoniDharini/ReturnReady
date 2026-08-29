import { Router } from 'express';
import * as inspectionController from '../controllers/inspection.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { inspectionEvidenceUpload } from '../middleware/upload.middleware.js';
import {
  accessItemSchema,
  createInspectionSchema,
  meterReadingSchema,
  updateInspectionItemSchema,
  updateInspectionSchema,
  validateBody,
} from '../validators/inspection.validator.js';

const router = Router();

router.use(protect);

router.get('/', inspectionController.listMine);

router.post(
  '/tenancies/:tenancyId',
  validateBody(createInspectionSchema),
  inspectionController.createForTenancy,
);
router.get('/tenancies/:tenancyId', inspectionController.listForTenancy);

router.get('/:id/review', inspectionController.review);
router.post('/:id/submit', inspectionController.submit);
router.post('/:id/approve', inspectionController.approve);
router.get('/:id', inspectionController.getOne);
router.patch('/:id', validateBody(updateInspectionSchema), inspectionController.updateOne);

router.patch(
  '/items/:itemId',
  validateBody(updateInspectionItemSchema),
  inspectionController.updateItem,
);
router.post(
  '/items/:itemId/evidence',
  inspectionEvidenceUpload.single('image'),
  inspectionController.uploadEvidence,
);
router.delete('/evidence/:evidenceId', inspectionController.removeEvidence);

router.post('/:id/meters', validateBody(meterReadingSchema), inspectionController.addMeter);
router.patch(
  '/meters/:meterId',
  inspectionEvidenceUpload.single('image'),
  inspectionController.updateMeter,
);
router.delete('/meters/:meterId', inspectionController.removeMeter);

router.post('/:id/access-items', validateBody(accessItemSchema), inspectionController.addAccess);
router.patch('/access-items/:itemId', validateBody(accessItemSchema), inspectionController.updateAccess);
router.delete('/access-items/:itemId', inspectionController.removeAccess);

export default router;
