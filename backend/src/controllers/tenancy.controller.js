import * as tenancyService from '../services/tenancy.service.js';
import { getRefreshCookieOptions } from '../utils/generateToken.js';

export async function list(req, res, next) {
  try {
    const tenancies = await tenancyService.listTenanciesForOwner(req.user.id);
    return res.status(200).json({ success: true, data: { tenancies } });
  } catch (error) {
    return next(error);
  }
}

export async function getOne(req, res, next) {
  try {
    const tenancy = await tenancyService.getTenancyForOwner(req.user.id, req.params.id);
    return res.status(200).json({ success: true, data: { tenancy } });
  } catch (error) {
    return next(error);
  }
}

export async function create(req, res, next) {
  try {
    const tenancy = await tenancyService.createTenancyInvite(req.user, req.body);
    return res.status(201).json({
      success: true,
      message: 'Invitation sent successfully',
      data: { tenancy },
    });
  } catch (error) {
    return next(error);
  }
}

export async function cancelInvite(req, res, next) {
  try {
    const tenancy = await tenancyService.cancelInvitation(req.user.id, req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Invitation cancelled',
      data: { tenancy },
    });
  } catch (error) {
    return next(error);
  }
}

export async function update(req, res, next) {
  try {
    const tenancy = await tenancyService.updateTenancyForOwner(
      req.user.id,
      req.params.id,
      req.body,
    );
    return res.status(200).json({
      success: true,
      message: 'Tenancy updated',
      data: { tenancy },
    });
  } catch (error) {
    return next(error);
  }
}

export async function startMoveOut(req, res, next) {
  try {
    const tenancy = await tenancyService.startMoveOutForOwner(
      req.user.id,
      req.params.id,
      req.body,
    );
    return res.status(200).json({
      success: true,
      message: 'Move-out started',
      data: { tenancy },
    });
  } catch (error) {
    return next(error);
  }
}

export async function resendInvite(req, res, next) {
  try {
    const tenancy = await tenancyService.resendInvitation(req.user.id, req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Invitation resent',
      data: { tenancy },
    });
  } catch (error) {
    return next(error);
  }
}

export async function getInvitation(req, res, next) {
  try {
    const invitation = await tenancyService.getInvitationByToken(req.params.token);
    return res.status(200).json({ success: true, data: { invitation } });
  } catch (error) {
    return next(error);
  }
}

export async function activateInvitation(req, res, next) {
  try {
    const result = await tenancyService.activateTenantFromInvite(req.body);
    res.cookie('refreshToken', result.refreshToken, getRefreshCookieOptions());
    return res.status(201).json({
      success: true,
      message: 'Tenant access activated successfully',
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    return next(error);
  }
}
