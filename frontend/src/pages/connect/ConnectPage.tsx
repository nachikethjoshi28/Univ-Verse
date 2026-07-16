import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, UserPlus, Check, X, SlidersHorizontal, Users, Building, UserCheck,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import type { Profile } from '../../types'
import { Card } from '../../components/ui/Card'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Select } from '../../components/ui/Select'
import { cn } from '../../lib/utils'
import toast from 'react-hot-toast'

interface ProfileWithStatus extends Profile {
  connection_status?: 'none' | 'pending_sent' | 'pending_received' | 'connected'
}

const MAJORS = ['Computer Science', 'Business Administration', 'Engineering', 'Psychology', 'Biology', 'Mathematics', 'Economics', 'Communications', 'Other']
const DEGREES = ['BS', 'MS', 'PhD', 'MBA', 'Other']

// ── Main ConnectPage ──────────────────────────────────────────────────────────
export function ConnectPage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [mainTab, setMainTab] = useState<'people' | 'pages'>('people')
  const [people, setPeople] = useState<ProfileWithStatus[]>([])
  const [pending, setPending] = useState<ProfileWithStatus[]>([])
  const [connections, setConnections] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({ major: '', degree: '', year: '' })

  // Pages tab
  const [pages, setPages] = useState<(Profile & { is_following?: boolean })[]>([])
  const [pagesLoading, setPagesLoading] = useState(false)
  const [pageSearch, setPageSearch] = useState('')

  async function fetchPeople() {
    if (!user || !profile?.university_id) return

    let query = supabase
      .from('profiles')
      .select('*, university:universities(*)')
      .eq('verification_status', 'verified')
      .eq('account_type', 'user')
      .eq('university_id', profile.university_id)
      .neq('id', user.id)
      .limit(50)

    if (search) query = query.ilike('full_name', `%${search}%`)
    if (filters.major) query = query.eq('major', filters.major)
    if (filters.degree) query = query.eq('degree', filters.degree)

    const { data: profilesData } = await query
    if (!profilesData) return

    const { data: connsData } = await supabase
      .from('connections')
      .select('*')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)

    const connMap: Record<string, ProfileWithStatus['connection_status']> = {}
    connsData?.forEach((c) => {
      const otherId = c.requester_id === user.id ? c.addressee_id : c.requester_id
      if (c.status === 'accepted') connMap[otherId] = 'connected'
      else if (c.status === 'pending' && c.requester_id === user.id) connMap[otherId] = 'pending_sent'
      else if (c.status === 'pending' && c.addressee_id === user.id) connMap[otherId] = 'pending_received'
    })

    const merged = profilesData.map((p) => ({ ...p, connection_status: connMap[p.id] ?? 'none' }))
    setPeople(merged.filter((p) => p.connection_status !== 'connected' && p.connection_status !== 'pending_sent'))
    setPending(merged.filter((p) => p.connection_status === 'pending_received'))
    setLoading(false)
  }

  async function fetchConnections() {
    if (!user) return

    const { data: conns } = await supabase
      .from('connections')
      .select('requester_id, addressee_id')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq('status', 'accepted')

    const friendIds = (conns ?? []).map((c: any) =>
      c.requester_id === user.id ? c.addressee_id : c.requester_id
    )
    if (friendIds.length === 0) { setConnections([]); return }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, username, major')
      .in('id', friendIds)
    setConnections((profiles as Profile[]) ?? [])
  }

  async function fetchPages() {
    if (!user || !profile?.university_id) return
    setPagesLoading(true)
    let query = supabase
      .from('profiles')
      .select('*')
      .eq('account_type', 'page')
      .eq('university_id', profile.university_id)
      .limit(50)
    if (pageSearch) query = query.ilike('full_name', `%${pageSearch}%`)
    const { data: pagesData } = await query
    if (!pagesData) { setPagesLoading(false); return }

    const { data: follows } = await supabase
      .from('page_follows')
      .select('page_id')
      .eq('follower_id', user.id)
    const followSet = new Set((follows ?? []).map((f: any) => f.page_id))

    setPages((pagesData as Profile[]).map(p => ({ ...p, is_following: followSet.has(p.id) })))
    setPagesLoading(false)
  }

  async function followPage(pageId: string) {
    if (!user) return
    const { error } = await supabase.from('page_follows').insert({ follower_id: user.id, page_id: pageId })
    if (!error) setPages(prev => prev.map(p => p.id === pageId ? { ...p, is_following: true } : p))
    else toast.error('Failed to follow')
  }

  async function unfollowPage(pageId: string) {
    if (!user) return
    await supabase.from('page_follows').delete().eq('follower_id', user.id).eq('page_id', pageId)
    setPages(prev => prev.map(p => p.id === pageId ? { ...p, is_following: false } : p))
  }

  useEffect(() => { fetchPeople() }, [user?.id, profile?.university_id, search, filters])
  useEffect(() => { fetchConnections() }, [user?.id])
  useEffect(() => { if (mainTab === 'pages') fetchPages() }, [user?.id, profile?.university_id, mainTab, pageSearch])

  async function sendRequest(addresseeId: string) {
    if (!user) return
    const { error } = await supabase.from('connections').insert({
      requester_id: user.id, addressee_id: addresseeId,
    })
    if (error) { toast.error('Failed to send request'); return }
    toast.success('Connection request sent!')
    setPeople((prev) => prev.filter((p) => p.id !== addresseeId))
    await supabase.from('notifications').insert({
      user_id: addresseeId, type: 'connection_request',
      title: 'New connection request',
      body: `${profile?.full_name} wants to connect with you`,
      data: { requester_id: user.id, requester_name: profile?.full_name, requester_avatar: profile?.avatar_url },
    })
  }

  async function respondRequest(requesterId: string, accept: boolean) {
    if (!user) return
    await supabase.from('connections')
      .update({ status: accept ? 'accepted' : 'rejected' })
      .eq('requester_id', requesterId).eq('addressee_id', user.id)
    toast.success(accept ? 'Connection accepted!' : 'Request declined')
    if (accept) {
      await supabase.from('notifications').insert({
        user_id: requesterId, type: 'connection_accepted',
        title: 'Connection accepted!',
        body: `${profile?.full_name} accepted your connection request. You are now connected!`,
        data: { accepter_id: user.id },
      })
    }
    fetchPeople()
    fetchConnections()
  }

  function score(p: Profile): number {
    let s = 0
    if (p.major && p.major === profile?.major) s += 3
    if (p.graduation_year === profile?.graduation_year) s += 2
    if (p.degree === profile?.degree) s += 1
    return s
  }

  const sorted = [...people].sort((a, b) => score(b) - score(a))

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Connect</h1>
        <p className="text-text-muted text-sm mt-1">Discover students at {profile?.university_name ?? 'your university'}</p>
      </div>

      {/* Main tabs */}
      <div className="flex gap-1 bg-surface-hover rounded-xl p-1 w-fit">
        <button
          onClick={() => setMainTab('people')}
          className={cn('flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            mainTab === 'people' ? 'bg-surface text-text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary')}
        >
          <Users className="w-4 h-4" /> People
        </button>
        <button
          onClick={() => setMainTab('pages')}
          className={cn('flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            mainTab === 'pages' ? 'bg-surface text-text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary')}
        >
          <Building className="w-4 h-4" /> Pages
        </button>
      </div>

      {/* Pages tab */}
      {mainTab === 'pages' && (
        <div className="space-y-4">
          <Input
            placeholder="Search pages..."
            leftIcon={<Search className="w-4 h-4" />}
            value={pageSearch}
            onChange={(e) => setPageSearch(e.target.value)}
          />
          {pagesLoading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => (
                <Card key={i} className="animate-pulse flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface-hover flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-surface-hover rounded-full w-1/3" />
                    <div className="h-3 bg-surface-hover rounded-full w-1/2" />
                  </div>
                </Card>
              ))}
            </div>
          ) : pages.length === 0 ? (
            <Card className="text-center py-12">
              <Building className="w-8 h-8 text-text-muted mx-auto mb-3" />
              <p className="text-text-muted text-sm">No pages found. Check back later!</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {pages.map(page => (
                <Card key={page.id} hover className="flex items-center gap-3">
                  <button onClick={() => navigate(`/profile/${page.id}`)} className="flex-shrink-0">
                    <Avatar src={page.avatar_url} name={page.full_name} size="md" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => navigate(`/profile/${page.id}`)}
                      className="font-semibold text-text-primary text-sm hover:text-accent transition-colors truncate block"
                    >
                      {page.full_name}
                    </button>
                    {page.page_category && <p className="text-xs text-text-muted">{page.page_category}</p>}
                    <p className="text-xs text-text-muted">{page.followers_count ?? 0} followers</p>
                  </div>
                  {page.is_following ? (
                    <button
                      onClick={() => unfollowPage(page.id)}
                      className="flex items-center gap-1.5 text-xs font-medium text-text-secondary bg-surface-hover border border-surface-border px-3 py-1.5 rounded-lg hover:border-red-400/40 hover:text-red-400 transition-colors flex-shrink-0"
                    >
                      <UserCheck className="w-3.5 h-3.5" /> Following
                    </button>
                  ) : (
                    <Button size="sm" onClick={() => followPage(page.id)} className="flex-shrink-0">
                      <UserPlus className="w-3.5 h-3.5" /> Follow
                    </Button>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* People tab */}
      {mainTab === 'people' && <div className="flex gap-6 items-start">
        {/* Left: main content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Search + filters */}
          <div className="flex gap-3">
            <Input
              placeholder="Search by name..."
              leftIcon={<Search className="w-4 h-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <Button variant="outline" onClick={() => setShowFilters(true)} size="md">
              <SlidersHorizontal className="w-4 h-4" />
              Filters
            </Button>
          </div>

          {/* Pending requests */}
          {pending.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-text-secondary mb-3">
                Pending Requests ({pending.length})
              </h2>
              <div className="space-y-2">
                {pending.map((p) => (
                  <Card key={p.id} className="flex items-center gap-3">
                    <button onClick={() => navigate(`/profile/${p.id}`)} className="flex-shrink-0">
                      <Avatar src={p.avatar_url} name={p.full_name} size="md" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => navigate(`/profile/${p.id}`)}
                        className="font-semibold text-text-primary text-sm hover:text-accent transition-colors truncate block"
                      >
                        {p.full_name}
                      </button>
                      <p className="text-xs text-text-muted">{p.major} · {p.graduation_year}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button size="sm" onClick={() => respondRequest(p.id, true)}>
                        <Check className="w-3.5 h-3.5" /> Accept
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => respondRequest(p.id, false)}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* People you may know */}
          <div>
            <h2 className="text-sm font-semibold text-text-secondary mb-3">People you may know</h2>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="animate-pulse flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-surface-hover flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 bg-surface-hover rounded-full w-1/3" />
                      <div className="h-3 bg-surface-hover rounded-full w-1/2" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : sorted.length === 0 ? (
              <Card className="text-center py-12">
                <p className="text-text-muted text-sm">No results found. Try adjusting your search or filters.</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {sorted.map((p) => {
                  const isTopMatch = score(p) >= 3
                  return (
                    <Card key={p.id} hover className="flex items-center gap-3">
                      <button onClick={() => navigate(`/profile/${p.id}`)} className="flex-shrink-0">
                        <Avatar src={p.avatar_url} name={p.full_name} size="md" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/profile/${p.id}`)}
                            className="font-semibold text-text-primary text-sm hover:text-accent transition-colors truncate"
                          >
                            {p.full_name}
                          </button>
                          {isTopMatch && (
                            <Badge variant="accent" className="text-xs flex-shrink-0">Top Match</Badge>
                          )}
                        </div>
                        <p className="text-xs text-text-muted">@{p.username ?? '—'}</p>
                        {(p.major || p.graduation_year) && (
                          <p className="text-xs text-text-secondary mt-0.5">
                            {[p.major, p.graduation_year ? `Class of ${p.graduation_year}` : ''].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>
                      <Button size="sm" onClick={() => sendRequest(p.id)} className="flex-shrink-0">
                        <UserPlus className="w-3.5 h-3.5" /> Connect
                      </Button>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: connections panel */}
        <div className="w-64 flex-shrink-0">
          <Card className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-accent" />
              <h2 className="font-semibold text-text-primary text-sm">
                Your Connections
                {connections.length > 0 && (
                  <span className="ml-1.5 text-text-muted font-normal">({connections.length})</span>
                )}
              </h2>
            </div>
            {connections.length === 0 ? (
              <p className="text-xs text-text-muted py-2">No connections yet. Send requests to connect!</p>
            ) : (
              <div className="space-y-1 max-h-96 overflow-y-auto scrollbar-hide">
                {connections.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => navigate(`/profile/${c.id}`)}
                    className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-surface-hover transition-colors text-left"
                  >
                    <Avatar src={c.avatar_url} name={c.full_name} size="xs" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate hover:text-accent transition-colors">{c.full_name}</p>
                      {c.major && <p className="text-xs text-text-muted truncate">{c.major}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>}

      {/* Filter modal */}
      <Modal open={showFilters} onClose={() => setShowFilters(false)} title="Filter People" size="sm">
        <div className="space-y-4">
          <Select
            label="Major"
            value={filters.major}
            onChange={(e) => setFilters((f) => ({ ...f, major: e.target.value }))}
          >
            <option value="">All majors</option>
            {MAJORS.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
          <Select
            label="Degree"
            value={filters.degree}
            onChange={(e) => setFilters((f) => ({ ...f, degree: e.target.value }))}
          >
            <option value="">All degrees</option>
            {DEGREES.map((d) => <option key={d} value={d}>{d}</option>)}
          </Select>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" fullWidth onClick={() => { setFilters({ major: '', degree: '', year: '' }); setShowFilters(false) }}>
              Clear
            </Button>
            <Button fullWidth onClick={() => setShowFilters(false)}>Apply</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
