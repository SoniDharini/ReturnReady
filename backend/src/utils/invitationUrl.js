import { ApiError } from './ApiError.js';

const INVITE_PATH = '/invite';

function firstConfiguredOrigin(value) {
  if (!value) return '';
  return String(value)
    .split(',')
    .map((url) => url.trim().replace(/\/$/, ''))
    .find(Boolean) || '';
}

export function getClientBaseUrl() {
  const fromClientUrl = firstConfiguredOrigin(process.env.CLIENT_URL);
  if (fromClientUrl) return fromClientUrl;

  const fromFrontendUrl = firstConfiguredOrigin(process.env.FRONTEND_URL);
  if (fromFrontendUrl) return fromFrontendUrl;

  if (process.env.NODE_ENV !== 'production') {
    return 'http://localhost:5173';
  }

  return '';
}

export function assertInvitationUrlConfig() {
  if (getClientBaseUrl()) return;
  throw new ApiError(500, 'CLIENT_URL is not configured for invitation URL generation.');
}

export function buildTenantInvitationUrl(token) {
  if (!token) {
    throw new ApiError(500, 'Invitation token is missing.');
  }

  const baseUrl = getClientBaseUrl();
  if (!baseUrl) {
    throw new ApiError(500, 'CLIENT_URL is not configured for invitation URL generation.');
  }

  return `${baseUrl}${INVITE_PATH}/${token}`;
}

export function isPendingInvitationExpired(tenancy) {
  if (!tenancy) return false;
  if (tenancy.inviteStatus === 'Expired') return true;
  if (tenancy.inviteStatus !== 'Pending') return false;
  if (!tenancy.inviteExpiresAt) return false;
  return new Date(tenancy.inviteExpiresAt).getTime() < Date.now();
}

export function attachInvitationFields(json, tenancyDoc = json) {
  const expired = isPendingInvitationExpired(tenancyDoc);
  const token = tenancyDoc?.inviteToken || json?.inviteToken;
  const status = tenancyDoc?.inviteStatus || json?.inviteStatus;

  json.invitationExpired = expired;
  try {
    json.invitationUrl =
      status === 'Pending' && !expired && token ? buildTenantInvitationUrl(token) : null;
  } catch {
    json.invitationUrl = null;
  }

  return json;
}
