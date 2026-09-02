import * as damageService from '../services/damage.service.js';
import * as deductionService from '../services/deduction.service.js';
import * as disputeService from '../services/dispute.service.js';
import * as settlementService from '../services/settlement.service.js';

export async function listAssessments(req, res, next) {
  try {
    const assessments = await damageService.listAssessments(req.user, req.params.tenancyId);
    return res.status(200).json({ success: true, data: { assessments } });
  } catch (error) {
    return next(error);
  }
}

export async function upsertAssessment(req, res, next) {
  try {
    const assessment = await damageService.upsertAssessment(
      req.user,
      req.params.tenancyId,
      req.body,
    );
    return res.status(200).json({ success: true, data: { assessment } });
  } catch (error) {
    return next(error);
  }
}

export async function removeAssessment(req, res, next) {
  try {
    await damageService.deleteAssessment(req.user, req.params.assessmentId);
    return res.status(200).json({ success: true, message: 'Assessment removed' });
  } catch (error) {
    return next(error);
  }
}

export async function listDeductions(req, res, next) {
  try {
    const data = await deductionService.listDeductions(req.user, req.params.tenancyId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

export async function getSettlement(req, res, next) {
  try {
    const data = await settlementService.getSettlement(req.user, req.params.tenancyId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

export async function createDeduction(req, res, next) {
  try {
    const result = await deductionService.createDeduction(req.user, req.params.tenancyId, req.body);
    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
}

export async function updateDeduction(req, res, next) {
  try {
    const result = await deductionService.updateDeduction(req.user, req.params.deductionId, req.body);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
}

export async function removeDeduction(req, res, next) {
  try {
    const result = await deductionService.removeDeduction(req.user, req.params.deductionId);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
}

export async function submitForReview(req, res, next) {
  try {
    const data = await deductionService.submitDeductionsForReview(req.user, req.params.tenancyId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

export async function acceptDeduction(req, res, next) {
  try {
    const data = await disputeService.acceptDeduction(req.user, req.params.deductionId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

export async function disputeDeduction(req, res, next) {
  try {
    const data = await disputeService.disputeDeduction(req.user, req.params.deductionId, req.body);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

export async function resolveDispute(req, res, next) {
  try {
    const data = await disputeService.resolveDispute(req.user, req.params.disputeId, req.body);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

export async function approveSettlement(req, res, next) {
  try {
    const data = await settlementService.approveSettlement(req.user, req.params.tenancyId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

export async function signSettlement(req, res, next) {
  try {
    const data = await settlementService.signSettlement(req.user, req.params.tenancyId, req.body);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

export async function completeTenancy(req, res, next) {
  try {
    const data = await settlementService.completeTenancy(req.user, req.params.tenancyId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

export async function generateReport(req, res, next) {
  try {
    const report = await settlementService.generateFinalReport(req.user, req.params.tenancyId);
    return res.status(201).json({ success: true, data: { report } });
  } catch (error) {
    return next(error);
  }
}

export async function listReports(req, res, next) {
  try {
    const reports = await settlementService.listReports(req.user);
    return res.status(200).json({ success: true, data: { reports } });
  } catch (error) {
    return next(error);
  }
}

export async function getReport(req, res, next) {
  try {
    const report = await settlementService.getReport(req.user, req.params.reportId);
    return res.status(200).json({ success: true, data: { report } });
  } catch (error) {
    return next(error);
  }
}
