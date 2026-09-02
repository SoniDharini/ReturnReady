import { api } from './api'
import type {
  ComparisonData,
  DamageAssessment,
  DamageClassification,
  DisputeReason,
  HandoverReport,
  SettlementData,
} from '@/types'

type ComparisonResponse = { success: boolean; data: ComparisonData }
type AssessmentsResponse = { success: boolean; data: { assessments: DamageAssessment[] } }
type AssessmentResponse = { success: boolean; data: { assessment: DamageAssessment } }
type SettlementResponse = { success: boolean; data: SettlementData }
type ReportsResponse = { success: boolean; data: { reports: HandoverReport[] } }
type ReportResponse = { success: boolean; data: { report: HandoverReport } }

export async function getComparison(tenancyId: string) {
  const { data } = await api.get<ComparisonResponse>(
    `/settlement/tenancies/${tenancyId}/comparison`,
  )
  return data.data
}

export async function listDamageAssessments(tenancyId: string) {
  const { data } = await api.get<AssessmentsResponse>(
    `/settlement/tenancies/${tenancyId}/damage-assessments`,
  )
  return data.data.assessments
}

export async function upsertDamageAssessment(
  tenancyId: string,
  payload: {
    key?: string
    moveOutItemId?: string
    classification: DamageClassification
    description?: string
  },
) {
  const { data } = await api.post<AssessmentResponse>(
    `/settlement/tenancies/${tenancyId}/damage-assessments`,
    payload,
  )
  return data.data.assessment
}

export async function deleteDamageAssessment(assessmentId: string) {
  await api.delete(`/settlement/damage-assessments/${assessmentId}`)
}

export async function getSettlement(tenancyId: string) {
  const { data } = await api.get<SettlementResponse>(
    `/settlement/tenancies/${tenancyId}/settlement`,
  )
  return data.data
}

/** @deprecated Use getSettlement — returns the same payload */
export async function listDeductions(tenancyId: string) {
  return getSettlement(tenancyId)
}

export async function createDeduction(
  tenancyId: string,
  payload: {
    title: string
    reason?: string
    description?: string
    amount: number
    damageAssessmentId?: string | null
    inspectionItemId?: string | null
  },
) {
  const { data } = await api.post<SettlementResponse>(
    `/settlement/tenancies/${tenancyId}/deductions`,
    payload,
  )
  return data.data
}

export async function updateDeduction(
  deductionId: string,
  payload: Partial<{
    title: string
    reason: string
    description: string
    amount: number
  }>,
) {
  await api.patch(`/settlement/deductions/${deductionId}`, payload)
}

export async function deleteDeduction(deductionId: string) {
  await api.delete(`/settlement/deductions/${deductionId}`)
}

export async function submitDeductionsForReview(tenancyId: string) {
  const { data } = await api.post<SettlementResponse>(
    `/settlement/tenancies/${tenancyId}/deductions/submit`,
  )
  return data.data
}

export async function acceptDeduction(deductionId: string) {
  const { data } = await api.post<SettlementResponse>(`/settlement/deductions/${deductionId}/accept`)
  return data.data
}

export async function disputeDeduction(
  deductionId: string,
  payload: {
    reason: DisputeReason
    description?: string
    evidenceDataUrl?: string
  },
) {
  const { data } = await api.post<SettlementResponse>(
    `/settlement/deductions/${deductionId}/dispute`,
    payload,
  )
  return data.data
}

export async function resolveDispute(
  disputeId: string,
  payload: {
    resolutionType: 'CANCEL' | 'MODIFY' | 'MAINTAIN'
    resolvedAmount?: number
    resolutionNotes?: string
  },
) {
  const { data } = await api.post<SettlementResponse>(
    `/settlement/disputes/${disputeId}/resolve`,
    payload,
  )
  return data.data
}

export async function approveSettlement(tenancyId: string) {
  const { data } = await api.post<SettlementResponse>(
    `/settlement/tenancies/${tenancyId}/settlement/approve`,
  )
  return data.data
}

export async function signSettlement(tenancyId: string, signatureDataUrl: string) {
  const { data } = await api.post<SettlementResponse>(
    `/settlement/tenancies/${tenancyId}/settlement/sign`,
    { signatureDataUrl },
  )
  return data.data
}

export async function completeTenancy(tenancyId: string) {
  const { data } = await api.post<SettlementResponse>(`/settlement/tenancies/${tenancyId}/complete`)
  return data.data
}

export async function generateReport(tenancyId: string) {
  const { data } = await api.post<ReportResponse>(
    `/settlement/tenancies/${tenancyId}/report/generate`,
  )
  return data.data.report
}

export async function listReports() {
  const { data } = await api.get<ReportsResponse>('/settlement/reports')
  return data.data.reports
}

export async function getReport(reportId: string) {
  const { data } = await api.get<ReportResponse>(`/settlement/reports/${reportId}`)
  return data.data.report
}
