/**
 * CORS origins from CLIENT_URL (comma-separated).
 * In development, any http://localhost or http://127.0.0.1 origin is allowed
 * so Vite can use 5174, 5175, etc. when 5173 is taken.
 */
function parseClientOrigins() {
  return (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);
}

function isLocalDevOrigin(origin) {
  if (process.env.NODE_ENV === 'production') return false;
  try {
    const { hostname, protocol } = new URL(origin);
    return (hostname === 'localhost' || hostname === '127.0.0.1') && protocol === 'http:';
  } catch {
    return false;
  }
}

export function corsOrigin(origin, callback) {
  if (!origin) {
    callback(null, true);
    return;
  }

  const allowed = parseClientOrigins();
  if (allowed.includes(origin) || isLocalDevOrigin(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error(`CORS blocked for origin: ${origin}`));
}
