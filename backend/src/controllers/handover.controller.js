import * as conditionService from '../services/tenancyCondition.service.js';
import * as changeService from '../services/propertyChange.service.js';

export async function listConditions(req, res, next) {
  try {
    const data = await conditionService.listConditions(req.user, req.params.tenancyId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

export async function createCondition(req, res, next) {
  try {
    const condition = await conditionService.createCondition(
      req.user,
      req.params.tenancyId,
      req.body,
    );
    return res.status(201).json({ success: true, data: { condition } });
  } catch (error) {
    return next(error);
  }
}

export async function updateCondition(req, res, next) {
  try {
    const condition = await conditionService.updateCondition(
      req.user,
      req.params.conditionId,
      req.body,
    );
    return res.status(200).json({ success: true, data: { condition } });
  } catch (error) {
    return next(error);
  }
}

export async function deleteCondition(req, res, next) {
  try {
    await conditionService.deleteCondition(req.user, req.params.conditionId);
    return res.status(200).json({ success: true, message: 'Condition removed' });
  } catch (error) {
    return next(error);
  }
}

export async function acceptConditions(req, res, next) {
  try {
    const data = await conditionService.acceptConditions(req.user, req.params.tenancyId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

export async function reviewCompliance(req, res, next) {
  try {
    const condition = await conditionService.reviewConditionCompliance(
      req.user,
      req.params.conditionId,
      req.body,
    );
    return res.status(200).json({ success: true, data: { condition } });
  } catch (error) {
    return next(error);
  }
}

export async function listChangeRequests(req, res, next) {
  try {
    const data = await changeService.listChangeRequests(req.user, req.params.tenancyId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

export async function listPendingChangeRequests(req, res, next) {
  try {
    const requests = await changeService.listPendingChangeRequestsForOwner(req.user);
    return res.status(200).json({ success: true, data: { requests } });
  } catch (error) {
    return next(error);
  }
}

export async function getChangeRequest(req, res, next) {
  try {
    const request = await changeService.getChangeRequest(req.user, req.params.requestId);
    return res.status(200).json({ success: true, data: { request } });
  } catch (error) {
    return next(error);
  }
}

export async function createChangeRequest(req, res, next) {
  try {
    const request = await changeService.createChangeRequest(
      req.user,
      req.params.tenancyId,
      req.body,
    );
    return res.status(201).json({ success: true, data: { request } });
  } catch (error) {
    return next(error);
  }
}

export async function approveChangeRequest(req, res, next) {
  try {
    const request = await changeService.approveChangeRequest(
      req.user,
      req.params.requestId,
      req.body,
    );
    return res.status(200).json({ success: true, data: { request } });
  } catch (error) {
    return next(error);
  }
}

export async function rejectChangeRequest(req, res, next) {
  try {
    const request = await changeService.rejectChangeRequest(
      req.user,
      req.params.requestId,
      req.body,
    );
    return res.status(200).json({ success: true, data: { request } });
  } catch (error) {
    return next(error);
  }
}

export async function completeChangeRequest(req, res, next) {
  try {
    const request = await changeService.completeChangeRequest(
      req.user,
      req.params.requestId,
      req.body,
    );
    return res.status(200).json({ success: true, data: { request } });
  } catch (error) {
    return next(error);
  }
}

export async function cancelChangeRequest(req, res, next) {
  try {
    const request = await changeService.cancelChangeRequest(req.user, req.params.requestId);
    return res.status(200).json({ success: true, data: { request } });
  } catch (error) {
    return next(error);
  }
}

export async function acceptOwnerConditions(req, res, next) {
  try {
    const request = await changeService.acceptOwnerConditions(req.user, req.params.requestId);
    return res.status(200).json({ success: true, data: { request } });
  } catch (error) {
    return next(error);
  }
}

export async function getPropertyChangeChat(req, res, next) {
  try {
    const { getPropertyChangeChat } = await import('../services/propertyChangeChat.service.js');
    const data = await getPropertyChangeChat(req.user, req.params.tenancyId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

export async function sendPropertyChangeMessage(req, res, next) {
  try {
    const { sendPropertyChangeMessage } = await import('../services/propertyChangeChat.service.js');
    const message = await sendPropertyChangeMessage(req.user, req.params.tenancyId, req.body);
    return res.status(201).json({ success: true, data: { message } });
  } catch (error) {
    return next(error);
  }
}

export async function reviewChangeCompliance(req, res, next) {
  try {
    const request = await changeService.reviewChangeCompliance(
      req.user,
      req.params.requestId,
      req.body,
    );
    return res.status(200).json({ success: true, data: { request } });
  } catch (error) {
    return next(error);
  }
}
