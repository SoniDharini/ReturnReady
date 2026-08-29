import { api } from './api'
import type {
  ComparisonData,
  DamageAssessment,
  DamageClassification,
  Deduction,
  DeductionSummary,
} from '@/types'

type ComparisonResponse = { success: boolean; data: ComparisonData }
type AssessmentsResponse = { success: boolean; data: { assessments: DamageAssessment[] } }
type AssessmentResponse = { success: boolean; data: { assessment: DamageAssessment } }
type DeductionsResponse = {
  success: boolean
  data: { deductions: Deduction[]; summary: DeductionSummary }
}
type DeductionResponse = {
  success: boolean
  data: { deduction: Deduction; summary: DeductionSummary }
}
type SummaryResponse = { success: boolean; data: { summary: DeductionSummary } }

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

export async function listDeductions(tenancyId: string) {
  const { data } = await api.get<DeductionsResponse>(`/settlement/tenancies/${tenancyId}/deductions`)
  return data.data
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
  const { data } = await api.post<DeductionResponse>(
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
  const { data } = await api.patch<DeductionResponse>(`/settlement/deductions/${deductionId}`, payload)
  return data.data
}

export async function deleteDeduction(deductionId: string) {
  const { data } = await api.delete<SummaryResponse>(`/settlement/deductions/${deductionId}`)
  return data.data.summary
}
