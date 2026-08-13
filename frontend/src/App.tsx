import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { AppLayout } from '@/components/layout/AppLayout'
import { LandingPage } from '@/pages/LandingPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { InvitationPage } from '@/pages/auth/InvitationPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { PropertiesPage } from '@/pages/properties/PropertiesPage'
import { AddPropertyPage } from '@/pages/properties/AddPropertyPage'
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

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/invite" element={<InvitationPage />} />

          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="properties" element={<PropertiesPage />} />
            <Route path="properties/new" element={<AddPropertyPage />} />
            <Route path="properties/:id" element={<PropertyDetailsPage />} />
            <Route path="tenancies" element={<TenanciesPage />} />
            <Route path="tenancies/new" element={<CreateTenancyPage />} />
            <Route path="tenancies/:id" element={<TenancyDetailsPage />} />
            <Route path="my-rental" element={<MyRentalPage />} />
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

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
