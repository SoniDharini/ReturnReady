import * as inspectionService from '../services/inspection.service.js';

export async function createForTenancy(req, res, next) {
  try {
    const result = await inspectionService.createInspection(
      req.user,
      req.params.tenancyId,
      req.body,
    );
    return res.status(201).json({
      success: true,
      message: 'Move-in inspection started',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

export async function listForTenancy(req, res, next) {
  try {
    const inspections = await inspectionService.listInspectionsForTenancy(
      req.user,
      req.params.tenancyId,
    );
    return res.status(200).json({ success: true, data: { inspections } });
  } catch (error) {
    return next(error);
  }
}

export async function listMine(req, res, next) {
  try {
    const inspections = await inspectionService.listInspectionsForUser(req.user);
    return res.status(200).json({ success: true, data: { inspections } });
  } catch (error) {
    return next(error);
  }
}

export async function getOne(req, res, next) {
  try {
    const detail = await inspectionService.getInspectionDetail(req.user, req.params.id);
    return res.status(200).json({ success: true, data: detail });
  } catch (error) {
    return next(error);
  }
}

export async function updateOne(req, res, next) {
  try {
    const detail = await inspectionService.updateInspection(req.user, req.params.id, req.body);
    return res.status(200).json({
      success: true,
      message: 'Inspection updated',
      data: detail,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateItem(req, res, next) {
  try {
    const item = await inspectionService.updateInspectionItem(
      req.user,
      req.params.itemId,
      req.body,
    );
    return res.status(200).json({ success: true, data: { item } });
  } catch (error) {
    return next(error);
  }
}

export async function uploadEvidence(req, res, next) {
  try {
    const file = req.file;
    const caption = req.body?.caption || '';
    const evidence = await inspectionService.addEvidence(
      req.user,
      req.params.itemId,
      file,
      caption,
    );
    return res.status(201).json({
      success: true,
      message: 'Evidence uploaded',
      data: { evidence },
    });
  } catch (error) {
    return next(error);
  }
}

export async function removeEvidence(req, res, next) {
  try {
    await inspectionService.deleteEvidence(req.user, req.params.evidenceId);
    return res.status(200).json({ success: true, message: 'Evidence removed' });
  } catch (error) {
    return next(error);
  }
}

export async function addMeter(req, res, next) {
  try {
    const meter = await inspectionService.addMeterReading(
      req.user,
      req.params.id,
      req.body,
    );
    return res.status(201).json({ success: true, data: { meter } });
  } catch (error) {
    return next(error);
  }
}

export async function updateMeter(req, res, next) {
  try {
    const meter = await inspectionService.updateMeterReading(
      req.user,
      req.params.meterId,
      req.body,
      req.file,
    );
    return res.status(200).json({ success: true, data: { meter } });
  } catch (error) {
    return next(error);
  }
}

export async function removeMeter(req, res, next) {
  try {
    await inspectionService.deleteMeterReading(req.user, req.params.meterId);
    return res.status(200).json({ success: true, message: 'Meter reading removed' });
  } catch (error) {
    return next(error);
  }
}

export async function addAccess(req, res, next) {
  try {
    const accessItem = await inspectionService.addAccessItem(
      req.user,
      req.params.id,
      req.body,
    );
    return res.status(201).json({ success: true, data: { accessItem } });
  } catch (error) {
    return next(error);
  }
}

export async function updateAccess(req, res, next) {
  try {
    const accessItem = await inspectionService.updateAccessItem(
      req.user,
      req.params.itemId,
      req.body,
    );
    return res.status(200).json({ success: true, data: { accessItem } });
  } catch (error) {
    return next(error);
  }
}

export async function removeAccess(req, res, next) {
  try {
    await inspectionService.deleteAccessItem(req.user, req.params.itemId);
    return res.status(200).json({ success: true, message: 'Access item removed' });
  } catch (error) {
    return next(error);
  }
}

export async function review(req, res, next) {
  try {
    const data = await inspectionService.getInspectionReview(req.user, req.params.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

export async function submit(req, res, next) {
  try {
    const detail = await inspectionService.submitInspection(req.user, req.params.id);
    return res.status(200).json({
      success: true,
      message:
        detail.inspection.type === 'MOVE_OUT'
          ? 'Move-out inspection submitted'
          : 'Move-in inspection submitted for approval',
      data: detail,
    });
  } catch (error) {
    return next(error);
  }
}

export async function approve(req, res, next) {
  try {
    const detail = await inspectionService.approveInspection(req.user, req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Approval recorded',
      data: detail,
    });
  } catch (error) {
    return next(error);
  }
}
