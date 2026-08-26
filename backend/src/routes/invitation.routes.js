import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as tenancyController from '../controllers/tenancy.controller.js';
import { activateTenantSchema, validateBody } from '../validators/resource.validator.js';

const router = Router();

const inviteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many attempts. Please try again later.',
  },
});

router.get('/:token', tenancyController.getInvitation);
router.post(
  '/activate',
  inviteLimiter,
  validateBody(activateTenantSchema),
  tenancyController.activateInvitation,
);

export default router;
