import { Router } from 'express';
import * as propertyController from '../controllers/property.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { requireOwner } from '../middleware/role.middleware.js';
import { propertySchema, validateBody } from '../validators/resource.validator.js';

const router = Router();

router.use(protect, requireOwner);

router.get('/', propertyController.list);
router.post('/', validateBody(propertySchema), propertyController.create);
router.get('/:id', propertyController.getOne);
router.put('/:id', validateBody(propertySchema.partial()), propertyController.update);
router.delete('/:id', propertyController.remove);

export default router;
