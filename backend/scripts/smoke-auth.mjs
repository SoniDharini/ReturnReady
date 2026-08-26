/**
 * Local smoke test for auth flow. Does not print secrets.
 * Usage: node scripts/smoke-auth.mjs
 */
import mongoose from 'mongoose';

const BASE = process.env.API_URL || 'http://127.0.0.1:5000/api';
const MONGO = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/returnready';
const email = `smoke_${Date.now()}@example.com`;
const password = 'Password123';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  console.log('1) Health…');
  const health = await fetch(`${BASE}/health`);
  assert(health.ok, `Health failed: ${health.status}`);
  console.log('   OK');

  console.log('2) Register…');
  const regRes = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Smoke Test',
      email,
      phone: '9876543210',
      password,
    }),
  });
  const reg = await regRes.json();
  assert(regRes.status === 201, `Register status ${regRes.status}: ${reg.message}`);
  assert(reg.success === true, 'Register success false');
  assert(reg.data?.accessToken, 'Missing accessToken');
  assert(reg.data?.user?.email === email, 'Email mismatch');
  assert(!('password' in (reg.data.user || {})), 'Password leaked in response');
  console.log('   OK (201)');

  console.log('3) Duplicate register…');
  const dupRes = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Smoke Test',
      email,
      password,
    }),
  });
  const dup = await dupRes.json();
  assert(dupRes.status === 409, `Expected 409, got ${dupRes.status}`);
  assert(dup.success === false, 'Duplicate should fail');
  console.log('   OK (409)');

  console.log('4) MongoDB password is bcrypt…');
  await mongoose.connect(MONGO);
  const doc = await mongoose.connection.db.collection('users').findOne({ email });
  assert(doc, 'User not found in MongoDB');
  assert(typeof doc.password === 'string', 'Password field missing');
  assert(doc.password.startsWith('$2'), 'Password is not a bcrypt hash');
  assert(doc.password !== password, 'Password stored in plaintext');
  assert(doc.role === 'OWNER', 'Role should be OWNER');
  await mongoose.disconnect();
  console.log('   OK (bcrypt hash stored)');

  console.log('5) Bad login…');
  const badRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'WrongPass99' }),
  });
  assert(badRes.status === 401, `Expected 401, got ${badRes.status}`);
  console.log('   OK (401)');

  console.log('6) Good login…');
  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const login = await loginRes.json();
  assert(loginRes.status === 200, `Login status ${loginRes.status}: ${login.message}`);
  assert(login.data?.accessToken, 'Missing login token');
  console.log('   OK (200)');

  console.log('7) /auth/me…');
  const meRes = await fetch(`${BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${login.data.accessToken}` },
  });
  const me = await meRes.json();
  assert(meRes.ok, `/me failed: ${me.message}`);
  assert(me.data?.user?.email === email, 'Me email mismatch');
  assert(!('password' in (me.data.user || {})), 'Password leaked from /me');
  console.log('   OK');

  console.log('\nAll auth smoke checks passed.');
}

main().catch((err) => {
  console.error('\nSMOKE FAILED:', err.message);
  process.exit(1);
});
