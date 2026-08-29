/**
 * Smoke test: create property with generated rooms.
 * Usage: node scripts/smoke-property.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const BASE = process.env.API_URL || 'http://127.0.0.1:5000/api';
const email = `prop_${Date.now()}@example.com`;
const password = 'Password123';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  console.log('1) Register owner…');
  const regRes = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Property Owner',
      email,
      phone: '9876543210',
      password,
    }),
  });
  const reg = await regRes.json();
  assert(regRes.status === 201, `Register failed: ${reg.message}`);
  const token = reg.data.accessToken;

  console.log('2) Create property with rooms…');
  const createRes = await fetch(`${BASE}/properties`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: 'Green Residency — B-204',
      type: 'apartment',
      address: 'Satellite',
      city: 'Ahmedabad',
      state: 'Gujarat',
      pin: '380015',
      status: 'Active',
      roomList: [
        { name: 'Bedroom 1', type: 'BEDROOM', isCustom: false, items: [] },
        { name: 'Bedroom 2', type: 'BEDROOM', isCustom: false, items: [] },
        { name: 'Bathroom 1', type: 'BATHROOM', isCustom: false, items: [] },
        { name: 'Kitchen', type: 'KITCHEN', isCustom: false, items: [] },
        { name: 'Study Room', type: 'CUSTOM', isCustom: true, items: [] },
      ],
    }),
  });
  const created = await createRes.json();
  assert(createRes.status === 201, `Create failed: ${created.message}`);
  assert(created.data.property.roomList.length === 5, 'Expected 5 rooms');
  assert(created.data.property.bathrooms === 1, 'Expected 1 bathroom count');
  const propertyId = created.data.property.id;
  console.log('   OK');

  console.log('3) Upload image…');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const tmpPng = path.join(__dirname, 'smoke.png');
  // Minimal 1x1 PNG
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );
  fs.writeFileSync(tmpPng, png);
  const form = new FormData();
  form.append('images', new Blob([png], { type: 'image/png' }), 'smoke.png');
  form.append('captions', 'Living Room');

  const uploadRes = await fetch(`${BASE}/properties/${propertyId}/images`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const uploaded = await uploadRes.json();
  fs.unlinkSync(tmpPng);
  assert(uploadRes.status === 201, `Upload failed: ${uploaded.message}`);
  assert(uploaded.data.property.images.length === 1, 'Expected 1 image');
  assert(uploaded.data.property.images[0].caption === 'Living Room', 'Caption mismatch');
  console.log('   OK');

  console.log('\nProperty smoke checks passed.');
}

main().catch((err) => {
  console.error('\nSMOKE FAILED:', err.message);
  process.exit(1);
});
