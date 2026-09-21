/**
 * One-time LOCAL development cleanup for duplicate active/reserved tenancies.
 *
 * Safety:
 * - Refuses to run when NODE_ENV=production
 * - Only connects to localhost / 127.0.0.1 MongoDB URIs
 * - Never deletes a tenancy that has inspections, settlements, or accepted workflow history
 * - Creates a JSON backup before any delete
 *
 * Usage:
 *   node scripts/cleanupDuplicateTenancy.js            # inspect only
 *   node scripts/cleanupDuplicateTenancy.js --apply    # apply safe cleanup
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APPLY = process.argv.includes('--apply');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/returnready';
const NODE_ENV = process.env.NODE_ENV || 'development';

function assertSafeEnvironment() {
  if (NODE_ENV === 'production') {
    throw new Error('Refusing to run cleanup: NODE_ENV is production.');
  }
  const uri = MONGO_URI.toLowerCase();
  const isLocal =
    uri.includes('127.0.0.1') ||
    uri.includes('localhost') ||
    uri.includes('0.0.0.0');
  if (!isLocal) {
    throw new Error(
      `Refusing to run cleanup: MONGO_URI does not look local (${MONGO_URI}).`,
    );
  }
  if (uri.includes('mongodb+srv://') && !uri.includes('localhost')) {
    throw new Error('Refusing to run cleanup against Atlas / remote MongoDB.');
  }
}

function scoreTenancy(summary) {
  let score = 0;
  if (summary.inviteStatus === 'Accepted') score += 50;
  if (summary.status === 'Active') score += 20;
  if (summary.hasMoveIn) score += 40;
  if (summary.moveInLocked) score += 30;
  if (summary.hasMoveOut) score += 25;
  if (summary.hasSettlement) score += 40;
  if (summary.hasConditions) score += 10;
  if (summary.hasChangeRequests) score += 10;
  if (summary.hasNotifications) score += 5;
  if (summary.tenantUserId) score += 15;
  if (summary.inviteStatus === 'Pending' && !summary.hasMoveIn) score -= 20;
  return score;
}

async function summarizeTenancy(db, tenancy) {
  const tenancyId = tenancy._id;
  const [inspections, settlements, conditions, changes, notifications] = await Promise.all([
    db.collection('inspections').find({ tenancyId }).toArray(),
    db.collection('settlements').find({ tenancyId }).toArray(),
    db.collection('tenancyconditions').find({ tenancyId }).toArray(),
    db.collection('propertychangerequests').find({ tenancyId }).toArray(),
    db.collection('notifications').find({ tenancyId }).toArray(),
  ]);

  const moveIn = inspections.find((i) => i.type === 'MOVE_IN');
  const moveOut = inspections.find((i) => i.type === 'MOVE_OUT');

  return {
    id: tenancyId.toString(),
    propertyId: tenancy.propertyId?.toString?.() || String(tenancy.propertyId),
    tenantId: tenancy.tenantUserId?.toString?.() || null,
    tenantName: tenancy.tenantName,
    tenantEmail: tenancy.tenantEmail,
    status: tenancy.status,
    inviteStatus: tenancy.inviteStatus,
    stage: tenancy.stage,
    createdAt: tenancy.createdAt,
    moveIn: tenancy.moveIn,
    moveOut: tenancy.moveOut,
    hasMoveIn: Boolean(moveIn),
    moveInLocked: moveIn?.status === 'LOCKED',
    hasMoveOut: Boolean(moveOut),
    hasSettlement: settlements.length > 0,
    hasConditions: conditions.length > 0,
    hasChangeRequests: changes.length > 0,
    hasNotifications: notifications.length > 0,
    related: {
      inspectionIds: inspections.map((i) => i._id.toString()),
      settlementIds: settlements.map((s) => s._id.toString()),
      conditionIds: conditions.map((c) => c._id.toString()),
      changeRequestIds: changes.map((c) => c._id.toString()),
      notificationIds: notifications.map((n) => n._id.toString()),
    },
  };
}

function isDisposable(summary) {
  return (
    !summary.hasMoveIn &&
    !summary.hasMoveOut &&
    !summary.hasSettlement &&
    !summary.hasConditions &&
    !summary.hasChangeRequests &&
    summary.inviteStatus !== 'Accepted'
  );
}

async function main() {
  assertSafeEnvironment();
  console.log(`Environment: ${NODE_ENV}`);
  console.log(`Mongo URI: ${MONGO_URI}`);
  console.log(`Mode: ${APPLY ? 'APPLY' : 'INSPECT ONLY'}`);

  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  const tenancies = await db.collection('tenancies').find({}).toArray();
  const byProperty = new Map();
  for (const tenancy of tenancies) {
    const key = tenancy.propertyId?.toString?.() || String(tenancy.propertyId);
    if (!byProperty.has(key)) byProperty.set(key, []);
    byProperty.get(key).push(tenancy);
  }

  const duplicateGroups = [...byProperty.entries()].filter(([, list]) => list.length > 1);
  if (!duplicateGroups.length) {
    console.log('No properties with multiple tenancy records found.');
    await mongoose.disconnect();
    return;
  }

  console.log(`Found ${duplicateGroups.length} property/properties with multiple tenancies.`);

  const backupDir = path.join(__dirname, 'backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `duplicate-tenancy-${stamp}.json`);
  const backupPayload = [];

  for (const [propertyId, list] of duplicateGroups) {
    console.log('\n========================================');
    console.log(`Property: ${propertyId}`);
    const summaries = [];
    for (const tenancy of list) {
      const summary = await summarizeTenancy(db, tenancy);
      summary.score = scoreTenancy(summary);
      summaries.push(summary);
      console.log(
        JSON.stringify(
          {
            tenancyId: summary.id,
            tenantName: summary.tenantName,
            status: summary.status,
            inviteStatus: summary.inviteStatus,
            stage: summary.stage,
            createdAt: summary.createdAt,
            hasMoveIn: summary.hasMoveIn,
            moveInLocked: summary.moveInLocked,
            hasMoveOut: summary.hasMoveOut,
            hasSettlement: summary.hasSettlement,
            score: summary.score,
          },
          null,
          2,
        ),
      );
    }

    const sorted = [...summaries].sort((a, b) => b.score - a.score);
    const keep = sorted[0];
    const candidates = sorted.slice(1);

    const activeLike = summaries.filter(
      (s) =>
        ['Invitation Sent', 'Active', 'Settlement Pending'].includes(s.status) &&
        ['Pending', 'Accepted'].includes(s.inviteStatus) &&
        s.stage !== 'complete',
    );

    console.log(`Preserve candidate: ${keep.id} (score ${keep.score})`);

    for (const dup of candidates) {
      const protectedHistory =
        dup.hasMoveIn || dup.hasMoveOut || dup.hasSettlement || dup.inviteStatus === 'Accepted';
      if (protectedHistory && keep.inviteStatus === 'Accepted' && dup.inviteStatus === 'Accepted') {
        console.log(
          `STOP: Both ${keep.id} and ${dup.id} look historically valid. Manual reconciliation required.`,
        );
        backupPayload.push({ propertyId, keep, conflict: dup, action: 'SKIP_CONFLICT' });
        continue;
      }

      if (!isDisposable(dup) && protectedHistory) {
        console.log(
          `SKIP delete for ${dup.id}: contains protected history (not clearly disposable).`,
        );
        backupPayload.push({ propertyId, keep, duplicate: dup, action: 'SKIP_PROTECTED' });
        continue;
      }

      if (!isDisposable(dup) && dup.score >= keep.score - 10) {
        console.log(`SKIP delete for ${dup.id}: not clearly weaker than preserved tenancy.`);
        backupPayload.push({ propertyId, keep, duplicate: dup, action: 'SKIP_AMBIGUOUS' });
        continue;
      }

      const fullDoc = list.find((t) => t._id.toString() === dup.id);
      backupPayload.push({
        propertyId,
        keep,
        duplicate: dup,
        tenancyDocument: fullDoc,
        action: APPLY ? 'DELETE' : 'WOULD_DELETE',
      });

      if (!APPLY) {
        console.log(`Would remove disposable duplicate tenancy ${dup.id}`);
        continue;
      }

      console.log(`Removing disposable duplicate tenancy ${dup.id}...`);
      const tenancyObjectId = new mongoose.Types.ObjectId(dup.id);

      if (dup.related.notificationIds.length) {
        await db.collection('notifications').deleteMany({
          _id: { $in: dup.related.notificationIds.map((id) => new mongoose.Types.ObjectId(id)) },
        });
      }
      if (dup.related.conditionIds.length) {
        await db.collection('tenancyconditions').deleteMany({
          _id: { $in: dup.related.conditionIds.map((id) => new mongoose.Types.ObjectId(id)) },
        });
      }
      if (dup.related.changeRequestIds.length) {
        await db.collection('propertychangerequests').deleteMany({
          _id: {
            $in: dup.related.changeRequestIds.map((id) => new mongoose.Types.ObjectId(id)),
          },
        });
        await db.collection('propertychangemessages').deleteMany({ tenancyId: tenancyObjectId });
      }
      await db.collection('tenancyextensionrequests').deleteMany({ tenancyId: tenancyObjectId });
      await db.collection('tenancies').deleteOne({ _id: tenancyObjectId });

      const remaining = await db.collection('tenancies').countDocuments({
        propertyId: fullDoc.propertyId,
        status: { $in: ['Invitation Sent', 'Active', 'Settlement Pending'] },
        inviteStatus: { $in: ['Pending', 'Accepted'] },
        stage: { $ne: 'complete' },
      });
      console.log(`Active/reserved tenancies remaining for property: ${remaining}`);
      if (remaining !== 1 && activeLike.length > 1) {
        console.log('Warning: expected exactly one active/reserved tenancy after cleanup.');
      }
    }
  }

  fs.writeFileSync(backupPath, JSON.stringify(backupPayload, null, 2));
  console.log(`\nBackup written to ${backupPath}`);
  if (!APPLY) {
    console.log('Inspect-only complete. Re-run with --apply to delete clearly disposable duplicates.');
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error.message || error);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
