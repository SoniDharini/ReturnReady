import * as authService from '../services/auth.service.js';
import { getRefreshCookieOptions } from '../utils/generateToken.js';

function setRefreshCookie(res, refreshToken) {
  res.cookie('refreshToken', refreshToken, getRefreshCookieOptions());
}

function clearRefreshCookie(res) {
  res.clearCookie('refreshToken', {
    ...getRefreshCookieOptions(),
    maxAge: 0,
  });
}

export async function register(req, res, next) {
  try {
    const result = await authService.registerOwner(req.body);
    setRefreshCookie(res, result.refreshToken);

    return res.status(201).json({
      success: true,
      message: 'Owner account created successfully',
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function login(req, res, next) {
  try {
    const result = await authService.loginUser(req.body);
    setRefreshCookie(res, result.refreshToken);

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function me(req, res, next) {
  try {
    const user = await authService.getCurrentUser(req.user.id);

    return res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    return next(error);
  }
}

export async function refresh(req, res, next) {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    const result = await authService.refreshSession(refreshToken);
    setRefreshCookie(res, result.refreshToken);

    return res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    clearRefreshCookie(res);
    return next(error);
  }
}

export async function logout(req, res, next) {
  try {
    await authService.logoutUser(req.user?.id);
    clearRefreshCookie(res);

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    return next(error);
  }
}
