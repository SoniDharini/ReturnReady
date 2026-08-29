import * as comparisonService from '../services/comparison.service.js';

export async function getComparison(req, res, next) {
  try {
    const data = await comparisonService.getTenancyComparison(req.user, req.params.tenancyId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}
