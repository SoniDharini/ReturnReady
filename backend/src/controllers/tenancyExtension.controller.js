import * as extensionService from '../services/tenancyExtension.service.js';

export async function createRequest(req, res, next) {
  try {
    const data = await extensionService.createExtensionRequest(
      req.user,
      req.params.tenancyId,
      req.body,
    );
    return res.status(201).json({ success: true, message: 'Extension request sent', data });
  } catch (error) {
    return next(error);
  }
}

export async function listRequests(req, res, next) {
  try {
    const data = await extensionService.listExtensionRequests(req.user, req.params.tenancyId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

export async function getRequest(req, res, next) {
  try {
    const data = await extensionService.getExtensionRequest(req.user, req.params.requestId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

export async function approveRequest(req, res, next) {
  try {
    const data = await extensionService.approveExtensionRequest(req.user, req.params.requestId);
    return res.status(200).json({ success: true, message: 'Extension approved', data });
  } catch (error) {
    return next(error);
  }
}

export async function rejectRequest(req, res, next) {
  try {
    const data = await extensionService.rejectExtensionRequest(
      req.user,
      req.params.requestId,
      req.body,
    );
    return res.status(200).json({ success: true, message: 'Extension rejected', data });
  } catch (error) {
    return next(error);
  }
}

export async function cancelRequest(req, res, next) {
  try {
    const data = await extensionService.cancelExtensionRequest(req.user, req.params.requestId);
    return res.status(200).json({ success: true, message: 'Extension request cancelled', data });
  } catch (error) {
    return next(error);
  }
}
