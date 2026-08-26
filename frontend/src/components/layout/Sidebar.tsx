import { NavLink } from 'react-router-dom'
import {
  Building2,
  ClipboardCheck,
  FileText,
  HelpCircle,
  KeyRound,
  LayoutDashboard,
  Settings,
  Home,
  Receipt,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { appPaths } from '@/lib/paths'

type SidebarProps = {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user } = useAuth()
  if (!user) return null

  const paths = appPaths(user.role)
  const links =
    user.role === 'OWNER'
      ? [
          { to: paths.dashboard, label: 'Dashboard', icon: LayoutDashboard },
          { to: paths.properties, label: 'Properties', icon: Building2 },
          { to: paths.tenancies, label: 'Tenancies', icon: KeyRound },
          { to: paths.inspections, label: 'Inspections', icon: ClipboardCheck },
          { to: paths.reports, label: 'Reports', icon: FileText },
        ]
      : [
          { to: paths.dashboard, label: 'Dashboard', icon: LayoutDashboard },
          { to: paths.rental, label: 'My Rental', icon: Home },
          { to: paths.inspections, label: 'Inspections', icon: ClipboardCheck },
          { to: paths.settlement, label: 'Settlement', icon: Receipt },
          { to: paths.reports, label: 'Reports', icon: FileText },
        ]

  return (
    <>
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-ink/40 lg:hidden"
          aria-label="Close navigation"
          onClick={onClose}
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col border-r border-border bg-white transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white">
            RR
          </div>
          <div>
            <p className="text-sm font-extrabold tracking-tight text-ink">ReturnReady</p>
            <p className="text-[11px] font-medium text-ink-muted">Handover & evidence</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3" aria-label="Main">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to.endsWith('/dashboard')}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-ink-secondary hover:bg-surface-muted hover:text-ink',
                )
              }
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-1 border-t border-border p-3">
          <NavLink
            to={paths.help}
            onClick={onClose}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-secondary hover:bg-surface-muted hover:text-ink"
          >
            <HelpCircle className="h-4 w-4" />
            Help
          </NavLink>
          <NavLink
            to={paths.settings}
            onClick={onClose}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-secondary hover:bg-surface-muted hover:text-ink"
          >
            <Settings className="h-4 w-4" />
            Settings
          </NavLink>
          <div className="mt-2 rounded-xl bg-surface-muted px-3 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                {user.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
                <p className="truncate text-xs text-ink-muted">
                  {user.role === 'OWNER' ? 'Property Owner' : 'Tenant'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
