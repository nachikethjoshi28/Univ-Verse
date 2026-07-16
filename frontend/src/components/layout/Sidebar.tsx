import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Home, Users, Heart, ShoppingBag, MessageCircle, Globe,
  Shield, LogOut, Bell, Sparkles, Lock,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Avatar } from '../ui/Avatar'

interface NavItem {
  to: string
  icon: typeof Home
  label: string
  section: string
  requiresVerification?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: '/home',          icon: Home,          label: 'Home',          section: 'home' },
  { to: '/connect',       icon: Users,         label: 'Connect',       section: 'connect',       requiresVerification: true },
  { to: '/dates',         icon: Heart,         label: 'Dates',         section: 'dates',         requiresVerification: true },
  { to: '/market',        icon: ShoppingBag,   label: 'MarketSpot',    section: 'market',        requiresVerification: true },
  { to: '/chats',         icon: MessageCircle, label: 'Chats',         section: 'chats',         requiresVerification: true },
  { to: '/community',     icon: Globe,         label: 'Community',     section: 'community' },
  { to: '/notifications', icon: Bell,          label: 'Notifications', section: 'notifications' },
]

const SECTION_ACCENT: Record<string, string> = {
  home:          '#5B8AF5',
  connect:       '#5B8AF5',
  dates:         '#FF6B9D',
  market:        '#10D9A0',
  chats:         '#9B87FB',
  community:     '#9B87FB',
  admin:         '#F59E0B',
  notifications: '#5B8AF5',
  settings:      '#7C6DFA',
}

export function Sidebar() {
  const { profile, user, signOut } = useAuth()

  // Personal accounts that haven't been approved yet are locked out of these tabs
  const isLocked = (item: NavItem) => {
    if (!item.requiresVerification) return false
    if (!profile) return false
    if (profile.account_type === 'page' || profile.is_admin) return false
    return profile.verification_status !== 'verified'
  }
  const location = useLocation()
  const [unreadNotifs, setUnreadNotifs] = useState(0)
  const [unreadChats, setUnreadChats] = useState(0)
  const [unreadCommunity, setUnreadCommunity] = useState(0)

  const currentSection = location.pathname.split('/')[1] || 'home'
  const accentColor = SECTION_ACCENT[currentSection] ?? '#7C6DFA'

  // ── Notifications unread count ──
  useEffect(() => {
    if (!user) return

    supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
      .then(({ count }) => setUnreadNotifs(count ?? 0))

    const ch = supabase
      .channel(`sidebar-notifs-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => setUnreadNotifs((c) => c + 1))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => {
          supabase.from('notifications').select('*', { count: 'exact', head: true })
            .eq('user_id', user.id).eq('is_read', false)
            .then(({ count }) => setUnreadNotifs(count ?? 0))
        })
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [user?.id])

  async function fetchUnreadChats() {
    if (!user) return
    const { data } = await supabase.rpc('get_unread_conversation_count')
    setUnreadChats(data ?? 0)
  }

  useEffect(() => {
    if (!user) return
    fetchUnreadChats()

    const ch = supabase
      .channel(`sidebar-msgs-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
        () => fetchUnreadChats())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversation_participants', filter: `user_id=eq.${user.id}` },
        () => fetchUnreadChats())
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [user?.id])

  async function fetchCommunityUnread() {
    if (!user) return

    const { data: memberships } = await supabase
      .from('community_members')
      .select('community_id')
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (!memberships?.length) { setUnreadCommunity(0); return }

    const communityIds = memberships.map((m: any) => m.community_id)
    const lastVisit = localStorage.getItem(`community_last_visited_${user.id}`)

    let query = supabase
      .from('community_posts')
      .select('id', { count: 'exact', head: true })
      .in('community_id', communityIds)
      .neq('user_id', user.id)

    if (lastVisit) query = query.gt('created_at', lastVisit)

    const { count } = await query
    setUnreadCommunity(count ?? 0)
  }

  useEffect(() => {
    if (!user) return
    fetchCommunityUnread()

    const ch = supabase
      .channel(`sidebar-community-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_posts' },
        () => fetchCommunityUnread())
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [user?.id])

  useEffect(() => {
    if (location.pathname === '/notifications') setUnreadNotifs(0)
    if (location.pathname.startsWith('/chats')) fetchUnreadChats()
    if (location.pathname.startsWith('/community')) {
      localStorage.setItem(`community_last_visited_${user?.id}`, new Date().toISOString())
      setUnreadCommunity(0)
    }
  }, [location.pathname])

  const sectionBadge: Record<string, number> = {
    chats:         unreadChats,
    community:     unreadCommunity,
    notifications: unreadNotifs,
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-64 flex flex-col glass border-r border-surface-border z-30">
      {/* Logo */}
      <div className="px-5 py-6 mb-2">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-2xl flex items-center justify-center shadow-sm transition-all duration-300"
            style={{ background: `linear-gradient(135deg, ${accentColor}CC, ${accentColor})` }}
          >
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <span
              className="text-lg font-bold tracking-tight font-display transition-colors duration-300"
              style={{ color: accentColor }}
            >
              Uni-verse
            </span>
            <p className="text-[10px] text-text-muted leading-none mt-0.5 font-medium tracking-wider uppercase">Campus Social</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto scrollbar-hide">
        {NAV_ITEMS.map((item) => {
          const { to, icon: Icon, label, section } = item
          const badge = sectionBadge[section] ?? 0
          const accent = SECTION_ACCENT[section]
          const locked = isLocked(item)
          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'text-white'
                    : locked
                      ? 'text-text-muted hover:bg-surface-hover'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                )
              }
              style={({ isActive }) =>
                isActive
                  ? { backgroundColor: accent, boxShadow: `0 4px 16px ${accent}50` }
                  : {}
              }
            >
              <div className="relative flex-shrink-0">
                <Icon className="w-[18px] h-[18px]" />
                {badge > 0 && !locked && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 ring-1 ring-[var(--bg-primary)]" />
                )}
              </div>
              <span className="flex-1">{label}</span>
              {locked ? (
                <Lock className="w-3 h-3 text-text-muted opacity-60 flex-shrink-0" />
              ) : badge > 0 ? (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-red-500/90 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                  {badge > 99 ? '99+' : badge}
                </span>
              ) : null}
            </NavLink>
          )
        })}

        {profile?.is_admin && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200',
                isActive
                  ? 'text-white'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
              )
            }
            style={({ isActive }) =>
              isActive
                ? { backgroundColor: '#F59E0B', boxShadow: '0 4px 16px #F59E0B50' }
                : {}
            }
          >
            <Shield className="w-[18px] h-[18px] flex-shrink-0" />
            Admin
          </NavLink>
        )}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 pb-4 pt-3 border-t border-surface-border space-y-0.5">
        {/* User card — clicking navigates to profile/settings */}
        {profile && (
          <div className="flex items-center gap-1 mt-1">
            <NavLink
              to="/settings"
              className={({ isActive }) => cn(
                'flex items-center gap-3 flex-1 min-w-0 px-4 py-3 rounded-2xl transition-all duration-200',
                isActive ? 'bg-surface-hover' : 'hover:bg-surface-hover/80'
              )}
            >
              <Avatar src={profile.avatar_url} name={profile.full_name} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary truncate">{profile.full_name}</p>
                <p className="text-[11px] text-text-muted truncate">@{profile.username ?? '—'}</p>
              </div>
            </NavLink>
            <button
              onClick={signOut}
              className="text-text-muted hover:text-red-400 transition-colors p-2 rounded-xl hover:bg-red-400/10 flex-shrink-0"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
