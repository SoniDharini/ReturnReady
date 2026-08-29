/**
 * Smoke test: create move-in inspection with items from property rooms.
 * Usage: node scripts/smoke-inspection.mjs
 */
const BASE = process.env.API_URL || 'http://127.0.0.1:5000/api';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  const email = `insp_${Date.now()}@example.com`;
  const password = 'Password123';

  console.log('1) Register owner...');
  const reg = await (
    await fetch(`${BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Inspection Owner',
        email,
        phone: '9876543210',
        password,
      }),
    })
  ).json();
  assert(reg.success, reg.message);
  const token = reg.data.accessToken;

  console.log('2) Create property with rooms...');
  const propRes = await fetch(`${BASE}/properties`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: 'Inspection Test Property',
      type: 'apartment',
      address: 'Test St',
      city: 'Ahmedabad',
      state: 'Gujarat',
      pin: '380015',
      roomList: [
        { name: 'Living Room — Overall Condition', type: 'LIVING_ROOM', isCustom: false, items: [{ name: 'Sofa', quantity: 1 }] },
        { name: 'Bedroom 1 — Overall Condition', type: 'BEDROOM', isCustom: false, items: [] },
      ],
    }),
  });
  const prop = await propRes.json();
  assert(propRes.status === 201, prop.message);
  const propertyId = prop.data.property.id;

  console.log('3) Create tenancy + accept invite...');
  const tenRes = await fetch(`${BASE}/tenancies`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      propertyId,
      tenantName: 'Test Tenant',
      tenantEmail: `tenant_${Date.now()}@example.com`,
      tenantPhone: '9999999999',
      moveIn: '01 Jan 2026',
      moveOut: '01 Jan 2027',
      rent: 15000,
      deposit: 50000,
    }),
  });
  const tenancy = await tenRes.json();
  assert(tenRes.status === 201, tenancy.message);
  const tenancyId = tenancy.data.tenancy.id;
  const inviteToken = tenancy.data.tenancy.inviteToken;

  const actRes = await fetch(`${BASE}/invitations/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: inviteToken, password: 'Password123' }),
  });
  const activated = await actRes.json();
  assert(actRes.status === 200 || actRes.status === 201, activated.message);

  console.log('4) Start move-in inspection...');
  const inspRes = await fetch(`${BASE}/inspections/tenancies/${tenancyId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ type: 'MOVE_IN' }),
  });
  const insp = await inspRes.json();
  assert(inspRes.status === 201, insp.message);
  assert(insp.data.items.length >= 2, 'Expected inspection items from rooms');
  const inspectionId = insp.data.inspection.id;
  const itemId = insp.data.items[0].id;

  console.log('5) Update item condition...');
  const patchRes = await fetch(`${BASE}/inspections/items/${itemId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ condition: 'GOOD', notes: 'Smoke test note' }),
  });
  const patched = await patchRes.json();
  assert(patchRes.ok, patched.message);
  assert(patched.data.item.condition === 'GOOD', 'Condition not saved');

  console.log('6) Duplicate protection...');
  const dupRes = await fetch(`${BASE}/inspections/tenancies/${tenancyId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ type: 'MOVE_IN' }),
  });
  assert(dupRes.status === 409, `Expected 409, got ${dupRes.status}`);

  console.log('\nInspection smoke checks passed.');
}

main().catch((err) => {
  console.error('\nSMOKE FAILED:', err.message);
  process.exit(1);
});
