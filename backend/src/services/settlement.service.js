import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { Deduction } from '../models/Deduction.js';
import { Dispute } from '../models/Dispute.js';
import { Inspection } from '../models/Inspection.js';
import { Report } from '../models/Report.js';
import { Settlement } from '../models/Settlement.js';
import { Signature } from '../models/Signature.js';
import { Tenancy } from '../models/Tenancy.js';
import { User } from '../models/User.js';
import { UPLOADS_ROOT } from '../middleware/upload.middleware.js';
import { ApiError } from '../utils/ApiError.js';
import { getTenancyComparison } from './comparison.service.js';
import { createNotification } from './notification.service.js';
import {
  calculateFinancials,
  deriveSettlementStatus,
  getTenancyForUser,
} from './settlementHelpers.js';

const REPORTS_DIR = path.join(UPLOADS_ROOT, 'reports');
fs.mkdirSync(REPORTS_DIR, { recursive: true });

async function loadDeductions(tenancyId) {
  const deductions = await Deduction.find({ tenancyId }).sort({ createdAt: -1 });
  return deductions.map((d) => d.toJSON());
}

async function syncSettlementRecord(tenancy, deductions, settlement) {
  const financials = calculateFinancials(tenancy, deductions);
  let record = settlement;
  if (!record) {
    record = await Settlement.create({
      tenancyId: tenancy._id,
      propertyId: tenancy.propertyId,
      securityDeposit: financials.securityDeposit,
    });
  }

  record.securityDeposit = financials.securityDeposit;
  record.proposedDeductionTotal = financials.proposedDeductionTotal;
  record.acceptedDeductionTotal = financials.acceptedDeductionTotal;
  record.disputedDeductionTotal = financials.disputedDeductionTotal;
  record.finalDeductionTotal = financials.finalDeductionTotal;
  record.projectedRefund = financials.projectedRefund;
  record.finalRefund = financials.finalRefund;

  if (record.status !== 'COMPLETED' && record.status !== 'READY_FOR_SIGNATURE') {
    record.status = deriveSettlementStatus(financials, record);
  }

  await record.save();
  return { settlement: record.toJSON(), financials };
}

export async function getSettlement(user, tenancyId) {
  const tenancy = await getTenancyForUser(user, tenancyId);
  const deductions = await loadDeductions(tenancyId);
  const disputes = await Dispute.find({ tenancyId }).sort({ createdAt: -1 });
  let settlement = await Settlement.findOne({ tenancyId });
  const synced = await syncSettlementRecord(tenancy, deductions, settlement);
  const signatures = settlement
    ? await Signature.find({ settlementId: synced.settlement.id })
    : [];
  const report = await Report.findOne({ tenancyId, type: 'FINAL_HANDOVER' });

  return {
    tenancy: {
      id: tenancy._id.toString(),
      propertyName: tenancy.propertyName,
      tenantName: tenancy.tenantName,
      deposit: tenancy.deposit,
      stage: tenancy.stage,
      status: tenancy.status,
      moveIn: tenancy.moveIn,
      moveOut: tenancy.moveOut,
      actualMoveOut: tenancy.actualMoveOut,
    },
    deductions,
    disputes: disputes.map((d) => d.toJSON()),
    settlement: synced.settlement,
    financials: synced.financials,
    signatures: signatures.map((s) => s.toJSON()),
    report: report ? report.toJSON() : null,
  };
}

export async function submitDeductionsForReview(user, tenancyId) {
  if (user.role !== 'OWNER') throw new ApiError(403, 'Only owners can submit deductions for review');

  const tenancy = await getTenancyForUser(user, tenancyId);
  const deductions = await Deduction.find({ tenancyId, status: 'PROPOSED' });
  if (!deductions.length) {
    throw new ApiError(400, 'No proposed deductions to submit');
  }

  const now = new Date();
  for (const deduction of deductions) {
    deduction.submittedForReviewAt = now;
    await deduction.save();
  }

  let settlement = await Settlement.findOne({ tenancyId });
  if (!settlement) {
    settlement = await Settlement.create({
      tenancyId: tenancy._id,
      propertyId: tenancy.propertyId,
      securityDeposit: tenancy.deposit,
      status: 'UNDER_REVIEW',
    });
  } else if (settlement.status === 'DRAFT') {
    settlement.status = 'UNDER_REVIEW';
    await settlement.save();
  }

  tenancy.stage = 'settlement';
  tenancy.status = 'Settlement Pending';
  await tenancy.save();

  if (tenancy.tenantUserId) {
    await createNotification({
      userId: tenancy.tenantUserId,
      tenancyId: tenancy._id,
      type: 'DEDUCTIONS_PROPOSED',
      title: 'New deductions proposed',
      message: `Review proposed deductions for ${tenancy.propertyName}.`,
    });
  }

  return getSettlement(user, tenancyId);
}

export async function approveSettlement(user, tenancyId) {
  const tenancy = await getTenancyForUser(user, tenancyId);
  const deductions = await loadDeductions(tenancyId);
  const financials = calculateFinancials(tenancy, deductions);

  if (!financials.allResolved || financials.hasOpenDisputes || financials.hasPendingProposed) {
    throw new ApiError(400, 'Settlement cannot be approved while deductions are unresolved');
  }

  let settlement = await Settlement.findOne({ tenancyId });
  if (!settlement) throw new ApiError(404, 'Settlement not found');

  if (user.role === 'OWNER') {
    if (settlement.ownerApproved) throw new ApiError(400, 'Owner has already approved');
    settlement.ownerApproved = true;
    settlement.ownerApprovedAt = new Date();
  } else {
    if (!tenancy.tenantUserId || tenancy.tenantUserId.toString() !== user.id) {
      throw new ApiError(403, 'You do not have permission');
    }
    if (settlement.tenantApproved) throw new ApiError(400, 'Tenant has already approved');
    settlement.tenantApproved = true;
    settlement.tenantApprovedAt = new Date();
  }

  if (settlement.ownerApproved && settlement.tenantApproved) {
    settlement.status = 'READY_FOR_SIGNATURE';
    settlement.finalRefund = financials.finalRefund;
    settlement.finalDeductionTotal = financials.finalDeductionTotal;
  } else {
    settlement.status = 'READY_FOR_APPROVAL';
  }

  await settlement.save();

  const notifyUserId =
    user.role === 'OWNER' ? tenancy.tenantUserId : tenancy.ownerId;
  await createNotification({
    userId: notifyUserId,
    tenancyId: tenancy._id,
    type: 'SETTLEMENT_APPROVAL',
    title: 'Settlement approval update',
    message: `${user.role === 'OWNER' ? 'Owner' : 'Tenant'} approved the final settlement.`,
  });

  return getSettlement(user, tenancyId);
}

export async function signSettlement(user, tenancyId, { signatureDataUrl }) {
  if (!signatureDataUrl?.startsWith('data:image/')) {
    throw new ApiError(400, 'Valid signature image is required');
  }

  const tenancy = await getTenancyForUser(user, tenancyId);
  const settlement = await Settlement.findOne({ tenancyId });
  if (!settlement) throw new ApiError(404, 'Settlement not found');
  if (settlement.status !== 'READY_FOR_SIGNATURE' && settlement.status !== 'COMPLETED') {
    throw new ApiError(400, 'Settlement is not ready for signature');
  }
  if (!settlement.ownerApproved || !settlement.tenantApproved) {
    throw new ApiError(400, 'Both parties must approve before signing');
  }

  const role = user.role;
  if (role === 'OWNER' && settlement.ownerSigned) {
    throw new ApiError(400, 'Owner has already signed');
  }
  if (role === 'TENANT' && settlement.tenantSigned) {
    throw new ApiError(400, 'Tenant has already signed');
  }

  const base64 = signatureDataUrl.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64, 'base64');
  const filename = `sig-${tenancyId}-${role}-${Date.now()}.png`;
  const filePath = path.join(UPLOADS_ROOT, 'signatures');
  fs.mkdirSync(filePath, { recursive: true });
  fs.writeFileSync(path.join(filePath, filename), buffer);
  const signatureUrl = `/uploads/signatures/${filename}`;

  await Signature.findOneAndUpdate(
    { settlementId: settlement._id, role },
    {
      tenancyId: tenancy._id,
      settlementId: settlement._id,
      userId: user.id,
      role,
      signatureUrl,
      signedAt: new Date(),
    },
    { upsert: true, new: true },
  );

  if (role === 'OWNER') settlement.ownerSigned = true;
  if (role === 'TENANT') settlement.tenantSigned = true;

  if (settlement.ownerSigned && settlement.tenantSigned) {
    settlement.status = 'COMPLETED';
    settlement.completedAt = new Date();
  }

  await settlement.save();

  const notifyUserId = role === 'OWNER' ? tenancy.tenantUserId : tenancy.ownerId;
  await createNotification({
    userId: notifyUserId,
    tenancyId: tenancy._id,
    type: 'SETTLEMENT_SIGNED',
    title: 'Settlement signed',
    message: `${role === 'OWNER' ? 'Owner' : 'Tenant'} signed the final settlement.`,
  });

  if (settlement.ownerSigned && settlement.tenantSigned) {
    await generateFinalReport(user, tenancyId);
    await finalizeTenancyInternal(tenancyId);
  }

  return getSettlement(user, tenancyId);
}

async function finalizeTenancyInternal(tenancyId) {
  const tenancy = await Tenancy.findById(tenancyId);
  if (!tenancy || tenancy.stage === 'complete') return;

  tenancy.stage = 'complete';
  tenancy.status = 'Completed';
  tenancy.occupancyStatus = 'COMPLETED';
  if (!tenancy.actualMoveOut) tenancy.actualMoveOut = tenancy.moveOut;
  await tenancy.save();

  const { Property } = await import('../models/Property.js');
  const property = await Property.findById(tenancy.propertyId);
  if (property) {
    property.activeTenancy = null;
    await property.save();
  }

  if (tenancy.tenantUserId) {
    await createNotification({
      userId: tenancy.tenantUserId,
      tenancyId: tenancy._id,
      type: 'TENANCY_COMPLETED',
      title: 'Handover completed',
      message: `Your tenancy for ${tenancy.propertyName} has been completed.`,
    });
  }
}

export async function completeTenancy(user, tenancyId) {
  if (user.role !== 'OWNER') throw new ApiError(403, 'Only owners can complete tenancy');

  const tenancy = await Tenancy.findOne({ _id: tenancyId, ownerId: user.id });
  if (!tenancy) throw new ApiError(404, 'Tenancy not found');

  const settlement = await Settlement.findOne({ tenancyId });
  if (!settlement || settlement.status !== 'COMPLETED') {
    throw new ApiError(400, 'Settlement must be completed before closing tenancy');
  }
  if (!settlement.ownerSigned || !settlement.tenantSigned) {
    throw new ApiError(400, 'Both signatures are required');
  }

  await finalizeTenancyInternal(tenancyId);
  return getSettlement(user, tenancyId);
}

export async function generateFinalReport(user, tenancyId) {
  const tenancy = await getTenancyForUser(user, tenancyId);
  const existing = await Report.findOne({ tenancyId, type: 'FINAL_HANDOVER' });
  if (existing) return existing.toJSON();

  const settlement = await Settlement.findOne({ tenancyId });
  if (!settlement) throw new ApiError(400, 'Settlement required to generate report');

  const comparison = await getTenancyComparison(user, tenancyId);
  const deductions = await loadDeductions(tenancyId);
  const signatures = await Signature.find({ settlementId: settlement._id });
  const owner = await User.findById(tenancy.ownerId);
  const tenant = tenancy.tenantUserId ? await User.findById(tenancy.tenantUserId) : null;

  const filename = `report-${tenancyId}-${Date.now()}.pdf`;
  const fullPath = path.join(REPORTS_DIR, filename);
  const fileUrl = `/uploads/reports/${filename}`;

  const snapshot = {
    propertyName: tenancy.propertyName,
    tenantName: tenancy.tenantName,
    ownerName: owner?.name || tenancy.ownerName,
    moveIn: tenancy.moveIn,
    moveOut: tenancy.moveOut,
    actualMoveOut: tenancy.actualMoveOut,
    deposit: tenancy.deposit,
    deductions,
    comparisonSummary: comparison.summary,
    finalRefund: settlement.finalRefund,
    finalDeductionTotal: settlement.finalDeductionTotal,
  };

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(fullPath);
    doc.pipe(stream);

    doc.fontSize(20).text('ReturnReady Property Handover Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Property: ${tenancy.propertyName}`);
    doc.text(`Tenant: ${tenancy.tenantName}`);
    doc.text(`Owner: ${owner?.name || tenancy.ownerName}`);
    doc.text(`Move-In: ${tenancy.moveIn}`);
    doc.text(`Expected Move-Out: ${tenancy.moveOut}`);
    if (tenancy.actualMoveOut) doc.text(`Actual Move-Out: ${tenancy.actualMoveOut}`);
    doc.moveDown();
    doc.text('Settlement Summary', { underline: true });
    doc.text(`Security Deposit: ₹${tenancy.deposit}`);
    doc.text(`Total Deductions: ₹${settlement.finalDeductionTotal}`);
    doc.text(`Final Refund: ₹${settlement.finalRefund ?? settlement.projectedRefund}`);
    doc.moveDown();
    doc.text('Deductions', { underline: true });
    for (const d of deductions.filter((x) => x.status !== 'CANCELLED')) {
      doc.text(`- ${d.title}: ₹${d.amount} (${d.status})`);
    }
    doc.moveDown();
    doc.text('Comparison Summary', { underline: true });
    doc.text(`Items compared: ${comparison.summary.totalItems}`);
    doc.text(`Damaged: ${comparison.summary.damaged} · Missing: ${comparison.summary.missing}`);
    doc.moveDown();
    doc.text('Signatures', { underline: true });
    for (const sig of signatures) {
      doc.text(`${sig.role}: Signed ${new Date(sig.signedAt).toLocaleString()}`);
    }

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  const report = await Report.create({
    tenancyId: tenancy._id,
    settlementId: settlement._id,
    propertyId: tenancy.propertyId,
    type: 'FINAL_HANDOVER',
    fileUrl,
    generatedBy: user.id,
    snapshot,
  });

  if (tenancy.tenantUserId) {
    await createNotification({
      userId: tenancy.tenantUserId,
      tenancyId: tenancy._id,
      type: 'REPORT_AVAILABLE',
      title: 'Final report available',
      message: `Your handover report for ${tenancy.propertyName} is ready.`,
    });
  }

  return report.toJSON();
}

export async function listReports(user) {
  if (user.role === 'OWNER') {
    const tenancies = await Tenancy.find({ ownerId: user.id, stage: 'complete' });
    const ids = tenancies.map((t) => t._id);
    const reports = await Report.find({ tenancyId: { $in: ids } }).sort({ generatedAt: -1 });
    return reports.map((r) => {
      const tenancy = tenancies.find((t) => t._id.toString() === r.tenancyId.toString());
      return {
        ...r.toJSON(),
        propertyName: tenancy?.propertyName,
        tenantName: tenancy?.tenantName,
        completedAt: tenancy?.updatedAt,
      };
    });
  }

  const tenancy = await Tenancy.findOne({ tenantUserId: user.id, inviteStatus: 'Accepted' });
  if (!tenancy) return [];
  const reports = await Report.find({ tenancyId: tenancy._id });
  return reports.map((r) => ({
    ...r.toJSON(),
    propertyName: tenancy.propertyName,
    tenantName: tenancy.tenantName,
    completedAt: tenancy.updatedAt,
  }));
}

export async function getReport(user, reportId) {
  const report = await Report.findById(reportId);
  if (!report) throw new ApiError(404, 'Report not found');

  const tenancy = await Tenancy.findById(report.tenancyId);
  if (!tenancy) throw new ApiError(404, 'Tenancy not found');

  if (user.role === 'OWNER' && tenancy.ownerId.toString() !== user.id) {
    throw new ApiError(403, 'You do not have permission');
  }
  if (user.role === 'TENANT' && tenancy.tenantUserId?.toString() !== user.id) {
    throw new ApiError(403, 'You do not have permission');
  }

  return report.toJSON();
}
