import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { RequireAuth, RequireOwner, RequireTenant } from '@/components/auth/RequireRole'
import { AppLayout } from '@/components/layout/AppLayout'
import { LandingPage } from '@/pages/LandingPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { InvitationPage } from '@/pages/auth/InvitationPage'
import { AccessClosedPage } from '@/pages/auth/AccessClosedPage'
import { OwnerOnboardingPage } from '@/pages/owner/OwnerOnboardingPage'
import { OwnerDashboard } from '@/pages/dashboard/OwnerDashboard'
import { TenantDashboard } from '@/pages/dashboard/TenantDashboard'
import { PropertiesPage } from '@/pages/properties/PropertiesPage'
import { AddPropertyPage } from '@/pages/properties/AddPropertyPage'
import { EditPropertyPage } from '@/pages/properties/EditPropertyPage'
import { PropertyDetailsPage } from '@/pages/properties/PropertyDetailsPage'
import { TenanciesPage } from '@/pages/tenancies/TenanciesPage'
import { CreateTenancyPage } from '@/pages/tenancies/CreateTenancyPage'
import { TenancyDetailsPage } from '@/pages/tenancies/TenancyDetailsPage'
import { MyRentalPage } from '@/pages/tenant/MyRentalPage'
import { InspectionsPage } from '@/pages/inspections/InspectionsPage'
import { InspectionDashboardPage } from '@/pages/inspections/InspectionDashboardPage'
import { InspectionWizardPage } from '@/pages/inspections/InspectionWizardPage'
import { InspectionReviewPage } from '@/pages/inspections/InspectionReviewPage'
import { InspectionApprovalPage } from '@/pages/inspections/InspectionApprovalPage'
import { ComparisonPage } from '@/pages/inspections/ComparisonPage'
import { SettlementPage } from '@/pages/settlement/SettlementPage'
import { SignaturePage } from '@/pages/settlement/SignaturePage'
import { SettlementCompletePage } from '@/pages/settlement/SettlementCompletePage'
import { ReportsPage } from '@/pages/reports/ReportsPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { HelpPage } from '@/pages/help/HelpPage'
import { roleHome } from '@/lib/paths'

function HomeRedirect() {
  const { isAuthenticated, user, isBootstrapping } = useAuth()
  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-muted text-sm text-ink-secondary">
        Loading...
      </div>
    )
  }
  if (!isAuthenticated || !user) return <LandingPage />
  return <Navigate to={roleHome(user.role)} replace />
}

function LegacyAppRedirect() {
  const { user, isAuthenticated } = useAuth()
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />
  return <Navigate to={roleHome(user.role)} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<Navigate to="/register/owner" replace />} />
          <Route path="/register/owner" element={<RegisterPage />} />
          <Route path="/invite/:token" element={<InvitationPage />} />
          <Route path="/access-closed" element={<AccessClosedPage />} />

          <Route element={<RequireAuth />}>
            <Route path="/owner" element={<RequireOwner />}>
              <Route element={<AppLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="onboarding" element={<OwnerOnboardingPage />} />
                <Route path="dashboard" element={<OwnerDashboard />} />
                <Route path="properties" element={<PropertiesPage />} />
                <Route path="properties/new" element={<AddPropertyPage />} />
                <Route path="properties/:id/edit" element={<EditPropertyPage />} />
                <Route path="properties/:id" element={<PropertyDetailsPage />} />
                <Route path="tenancies" element={<TenanciesPage />} />
                <Route path="tenancies/new" element={<CreateTenancyPage />} />
                <Route path="tenancies/:id" element={<TenancyDetailsPage />} />
                <Route path="inspections" element={<InspectionsPage />} />
                <Route path="inspections/move-in" element={<InspectionDashboardPage />} />
                <Route path="inspections/wizard" element={<InspectionWizardPage />} />
                <Route path="inspections/move-out" element={<InspectionWizardPage />} />
                <Route path="inspections/review" element={<InspectionReviewPage />} />
                <Route path="inspections/approval" element={<InspectionApprovalPage />} />
                <Route path="inspections/comparison" element={<ComparisonPage />} />
                <Route path="settlement" element={<SettlementPage />} />
                <Route path="settlement/sign" element={<SignaturePage />} />
                <Route path="settlement/complete" element={<SettlementCompletePage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="help" element={<HelpPage />} />
              </Route>
            </Route>

            <Route path="/tenant" element={<RequireTenant />}>
              <Route element={<AppLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<TenantDashboard />} />
                <Route path="rental" element={<MyRentalPage />} />
                <Route path="inspections" element={<InspectionsPage />} />
                <Route path="inspections/move-in" element={<InspectionDashboardPage />} />
                <Route path="inspections/wizard" element={<InspectionWizardPage />} />
                <Route path="inspections/move-out" element={<InspectionWizardPage />} />
                <Route path="inspections/review" element={<InspectionReviewPage />} />
                <Route path="inspections/approval" element={<InspectionApprovalPage />} />
                <Route path="inspections/comparison" element={<ComparisonPage />} />
                <Route path="settlement" element={<SettlementPage />} />
                <Route path="settlement/sign" element={<SignaturePage />} />
                <Route path="settlement/complete" element={<SettlementCompletePage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="help" element={<HelpPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="/app/*" element={<LegacyAppRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
