import { Bell, ChevronDown, LogOut, Menu, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'

type TopBarProps = {
  title: string
  onMenuClick: () => void
  settingsPath: string
}

export function TopBar({ title, onMenuClick, settingsPath }: TopBarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-white/95 px-4 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Button variant="tertiary" size="icon" className="lg:hidden" onClick={onMenuClick} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-ink sm:text-lg">{title}</p>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <div className="relative">
          <Button
            variant="tertiary"
            size="icon"
            aria-label="Notifications"
            onClick={() => {
              setNotifOpen((v) => !v)
              setMenuOpen(false)
            }}
          >
            <Bell className="h-5 w-5" />
          </Button>
          {notifOpen ? (
            <div className="absolute right-0 mt-2 w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-white p-2 shadow-elevated">
              <p className="px-3 py-2 text-sm font-bold text-ink">Notifications</p>
              <p className="px-3 py-6 text-center text-sm text-ink-muted">No notifications yet</p>
            </div>
          ) : null}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setMenuOpen((v) => !v)
              setNotifOpen(false)
            }}
            className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-surface-muted"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
              {user?.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-semibold text-ink">{user?.name}</p>
              <p className="text-xs text-ink-muted">
                {user?.role === 'OWNER' ? 'Property Owner' : 'Tenant'}
              </p>
            </div>
            <ChevronDown className="hidden h-4 w-4 text-ink-muted sm:block" />
          </button>

          {menuOpen ? (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-border bg-white p-2 shadow-elevated">
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-ink hover:bg-surface-muted"
                onClick={() => {
                  setMenuOpen(false)
                  navigate(settingsPath)
                }}
              >
                <UserRound className="h-4 w-4" />
                Profile & Settings
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-danger hover:bg-danger-bg"
                onClick={async () => {
                  setMenuOpen(false)
                  await logout()
                  navigate('/login')
                }}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
