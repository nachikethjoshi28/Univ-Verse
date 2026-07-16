import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ChevronLeft, Building2, GraduationCap, BadgeCheck, Crown,
  UserPlus, Check, Clock, Lock, LayoutGrid, Heart, MessageCircle,
  Repeat2, X, UserMinus, Users, Tag, UserCheck,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../../components/ui/Button'

import { cn, timeAgo } from '../../lib/utils'
import toast from 'react-hot-toast'
import { createPortal } from 'react-dom'

const PAGE_SIZE = 18

// ── Unfriend confirmation modal ───────────────────────────────────────────────
function UnfriendModal({
  name, loading, onConfirm, onCancel,
}: { name: string; loading: boolean; onConfirm: () => void; onCancel: () => void }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div
        className="bg-surface rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-bold text-text-primary text-lg mb-2">Unfriend {name}?</h3>
        <p className="text-text-secondary text-sm mb-6 leading-relaxed">
          You'll have to send a new connection request to view their posts or be friends again.
        </p>
        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            className="flex-1 bg-red-500 hover:bg-red-600 text-white border-0"
            loading={loading}
            onClick={onConfirm}
          >
            <UserMinus className="w-4 h-4" />
            Unfriend
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Post detail overlay ───────────────────────────────────────────────────────
function PostDetailOverlay({
  post, profile, onClose,
}: { post: any; profile: any; onClose: () => void }) {
  const isRepost = !!post.repost_of_id
  const display = isRepost && post.original_post ? post.original_post : post
  const displayProfile = isRepost && post.original_post?.author ? post.original_post.author : profile

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative bg-surface rounded-2xl overflow-hidden max-w-lg w-full mx-4 max-h-[90vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {isRepost && (
          <div className="px-4 pt-4 pb-2 flex items-center gap-2 text-xs text-text-muted border-b border-surface-border">
            <Repeat2 className="w-3.5 h-3.5 text-green-500" />
            <span>{profile.full_name} reposted</span>
          </div>
        )}

        {display.media_urls && display.media_urls.length > 0 && (
          <img src={display.media_urls[0]} alt="" className="w-full max-h-80 object-cover flex-shrink-0" />
        )}

        <div className="p-4 space-y-3 overflow-y-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-surface-hover flex-shrink-0">
              {displayProfile.avatar_url
                ? <img src={displayProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-sm font-bold text-text-muted">{displayProfile.full_name?.[0]}</div>
              }
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">{displayProfile.full_name}</p>
              <p className="text-xs text-text-muted">{timeAgo(display.created_at)}</p>
            </div>
          </div>

          {display.content && (
            <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">{display.content}</p>
          )}

          {display.media_urls && display.media_urls.length > 1 && (
            <div className="grid grid-cols-2 gap-1.5">
              {display.media_urls.slice(1).map((url: string, i: number) => (
                <img key={i} src={url} alt="" className="w-full h-32 object-cover rounded-xl" loading="lazy" />
              ))}
            </div>
          )}

          <div className="flex items-center gap-5 text-xs text-text-muted pt-2 border-t border-surface-border">
            <span className="flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5" />
              {Array.isArray(display.likes) ? display.likes.length : (display.likes_count ?? 0)}
            </span>
            <span className="flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5" />
              {display.comments_count ?? 0}
            </span>
            <span className="flex items-center gap-1.5">
              <Repeat2 className="w-3.5 h-3.5" />
              {display.reposts_count ?? 0}
            </span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Mutual connections modal ──────────────────────────────────────────────────
function MutualConnectionsModal({
  mutuals, profileName, loading, onClose,
}: { mutuals: any[]; profileName: string; loading: boolean; onClose: () => void }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-surface rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-surface-border">
          <div>
            <h3 className="font-bold text-text-primary">
              {loading ? 'Mutual connections' : `${mutuals.length} mutual ${mutuals.length === 1 ? 'connection' : 'connections'}`}
            </h3>
            <p className="text-xs text-text-muted mt-0.5">You and {profileName} both know these people</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="divide-y divide-surface-border">
              {[1,2,3].map(i => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-surface-hover flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-surface-hover rounded-full w-2/3" />
                    <div className="h-2.5 bg-surface-hover rounded-full w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : mutuals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-text-muted">
              <Users className="w-8 h-8 mb-2" />
              <p className="text-sm">No mutual connections</p>
            </div>
          ) : (
            <div className="divide-y divide-surface-border">
              {mutuals.map(m => (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-hover transition-colors">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-hover flex-shrink-0">
                    {m.avatar_url
                      ? <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-sm font-bold text-text-muted">
                          {m.full_name?.[0]?.toUpperCase()}
                        </div>
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">{m.full_name}</p>
                    {m.username && <p className="text-xs text-text-muted">@{m.username}</p>}
                  </div>
                  {m.verification_status === 'verified' && (
                    <BadgeCheck className="w-4 h-4 text-orange-500 flex-shrink-0 ml-auto" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const { user: me, profile: myProfile } = useAuth()

  const [profile, setProfile]         = useState<any>(null)
  const [connStatus, setConnStatus]   = useState<'none' | 'pending_sent' | 'pending_received' | 'connected'>('none')
  const [connDate, setConnDate]       = useState<string | null>(null)
  const [posts, setPosts]             = useState<any[]>([])
  const [reposts, setReposts]         = useState<any[]>([])
  const [stats, setStats]             = useState({ posts: 0, reposts: 0, connections: 0 })
  const [activeTab, setActiveTab]     = useState<'posts' | 'reposts' | 'tagged'>('posts')
  const [tagged, setTagged]           = useState<any[]>([])
  const [hasMoreTagged, setHasMoreTagged] = useState(false)
  const [loadingMoreTagged, setLoadingMoreTagged] = useState(false)
  const [followStatus, setFollowStatus] = useState<'following' | 'not_following'>('not_following')
  const [loading, setLoading]         = useState(true)
  const [connecting, setConnecting]   = useState(false)
  const [unfriending, setUnfriending] = useState(false)
  const [showUnfriend, setShowUnfriend] = useState(false)
  const [loadingMorePosts, setLoadingMorePosts]     = useState(false)
  const [loadingMoreReposts, setLoadingMoreReposts] = useState(false)
  const [hasMorePosts, setHasMorePosts]     = useState(false)
  const [hasMoreReposts, setHasMoreReposts] = useState(false)
  const [selectedPost, setSelectedPost]       = useState<any>(null)
  const [mutualConns, setMutualConns]         = useState<any[]>([])
  const [showMutualModal, setShowMutualModal] = useState(false)
  const [mutualLoading, setMutualLoading]     = useState(false)
  const [showFriendOptions, setShowFriendOptions] = useState(false)

  useEffect(() => {
    if (!userId) return
    if (userId === me?.id) { navigate('/profile', { replace: true }); return }
    load()
  }, [userId, me?.id])

  async function load() {
    if (!userId || !me) return
    setLoading(true)

    const [{ data: prof }, { data: c1 }, { data: c2 }] = await Promise.all([
      supabase.from('profiles').select('*, university:universities(*)').eq('id', userId).single(),
      supabase.from('connections').select('*').eq('requester_id', me.id).eq('addressee_id', userId).maybeSingle(),
      supabase.from('connections').select('*').eq('requester_id', userId).eq('addressee_id', me.id).maybeSingle(),
    ])

    const conn = c1 ?? c2
    setProfile(prof)

    let status: 'none' | 'pending_sent' | 'pending_received' | 'connected' = 'none'
    if (conn) {
      if (conn.status === 'accepted') { status = 'connected'; setConnDate(conn.updated_at) }
      else if (conn.status === 'pending') {
        status = conn.requester_id === me.id ? 'pending_sent' : 'pending_received'
      }
    }
    setConnStatus(status)

    // Counts: separate posts vs reposts
    const [{ count: postsCount }, { count: repostsCount }, { count: connCount }] = await Promise.all([
      supabase.from('posts').select('*', { count: 'exact', head: true })
        .eq('user_id', userId).is('repost_of_id', null).eq('is_archived', false).eq('is_flagged', false),
      supabase.from('posts').select('*', { count: 'exact', head: true })
        .eq('user_id', userId).not('repost_of_id', 'is', null).eq('is_archived', false).eq('is_flagged', false),
      supabase.from('connections').select('*', { count: 'exact', head: true })
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`).eq('status', 'accepted'),
    ])
    setStats({ posts: postsCount ?? 0, reposts: repostsCount ?? 0, connections: connCount ?? 0 })

    // For page accounts: check follow status
    if (prof?.account_type === 'page') {
      const { data: fol } = await supabase
        .from('page_follows')
        .select('id')
        .eq('follower_id', me.id)
        .eq('page_id', userId)
        .maybeSingle()
      setFollowStatus(fol ? 'following' : 'not_following')
    }

    const sameUniversity = myProfile?.university_id != null && prof?.university_id != null
      && myProfile.university_id === prof.university_id
    const canSee = prof?.account_type === 'page' || status === 'connected' || (!prof?.is_private && sameUniversity)
    if (canSee && prof) {
      await Promise.all([fetchPosts(userId, true), fetchReposts(userId, true), fetchTagged(userId, true)])
    }

    setLoading(false)
  }

  async function fetchMutualConnections() {
    if (!me || !userId) return
    setMutualLoading(true)
    setShowMutualModal(true)

    const [{ data: myConns }, { data: theirConns }] = await Promise.all([
      supabase.from('connections')
        .select('requester_id, addressee_id')
        .or(`requester_id.eq.${me.id},addressee_id.eq.${me.id}`)
        .eq('status', 'accepted'),
      supabase.from('connections')
        .select('requester_id, addressee_id')
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
        .eq('status', 'accepted'),
    ])

    const myFriendIds = new Set(
      (myConns ?? []).map((c: any) => c.requester_id === me.id ? c.addressee_id : c.requester_id)
    )
    const theirFriendIds = (theirConns ?? []).map((c: any) =>
      c.requester_id === userId ? c.addressee_id : c.requester_id
    )
    const mutualIds = theirFriendIds.filter(
      (id: string) => id !== me.id && id !== userId && myFriendIds.has(id)
    )

    if (mutualIds.length === 0) { setMutualConns([]); setMutualLoading(false); return }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, username, verification_status, subscription_plan')
      .in('id', mutualIds)

    setMutualConns(profiles ?? [])
    setMutualLoading(false)
  }

  async function fetchPosts(uid: string, reset = false) {
    const existingPosts = reset ? [] : posts
    const query = supabase.from('posts')
      .select('*, likes:post_likes(user_id)')
      .eq('user_id', uid)
      .is('repost_of_id', null)
      .eq('is_flagged', false)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)

    if (!reset && existingPosts.length > 0) {
      query.lt('created_at', existingPosts[existingPosts.length - 1].created_at)
    }

    const { data } = await query
    const result = data ?? []
    setPosts(reset ? result : prev => [...prev, ...result])
    setHasMorePosts(result.length === PAGE_SIZE)
  }

  async function fetchReposts(uid: string, reset = false) {
    const existingReposts = reset ? [] : reposts
    const query = supabase.from('posts')
      .select('*, likes:post_likes(user_id)')
      .eq('user_id', uid)
      .not('repost_of_id', 'is', null)
      .eq('is_flagged', false)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)

    if (!reset && existingReposts.length > 0) {
      query.lt('created_at', existingReposts[existingReposts.length - 1].created_at)
    }

    const { data: raw } = await query
    if (!raw || raw.length === 0) { if (reset) setReposts([]); setHasMoreReposts(false); return }

    // Fetch original posts separately (reliable — not a self-referential join)
    const originalIds = [...new Set(raw.map((r: any) => r.repost_of_id).filter(Boolean))]
    const origMap: Record<string, any> = {}
    if (originalIds.length > 0) {
      const { data: originals } = await supabase
        .from('posts')
        .select('id, user_id, content, media_urls, likes_count, comments_count, reposts_count, created_at, author:profiles!posts_user_id_fkey(id, full_name, avatar_url, username)')
        .in('id', originalIds)
      originals?.forEach((o: any) => { origMap[o.id] = o })
    }

    const withOriginal = raw.map((r: any) => ({ ...r, original_post: origMap[r.repost_of_id] ?? null }))
    setReposts(reset ? withOriginal : prev => [...prev, ...withOriginal])
    setHasMoreReposts(raw.length === PAGE_SIZE)
  }

  async function fetchTagged(uid: string, reset = false) {
    const existing = reset ? [] : tagged
    const query = supabase
      .from('post_tags')
      .select('post:posts(*, author:profiles!posts_user_id_fkey(id, full_name, avatar_url, username))')
      .eq('tagged_user_id', uid)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)
    if (!reset && existing.length > 0) {
      query.lt('created_at', existing[existing.length - 1].created_at ?? '')
    }
    const { data } = await query
    const result = (data ?? []).map((row: any) => row.post).filter(Boolean)
    setTagged(reset ? result : prev => [...prev, ...result])
    setHasMoreTagged(result.length === PAGE_SIZE)
  }

  async function loadMorePosts() {
    if (loadingMorePosts || !hasMorePosts || !userId) return
    setLoadingMorePosts(true)
    await fetchPosts(userId)
    setLoadingMorePosts(false)
  }

  async function loadMoreReposts() {
    if (loadingMoreReposts || !hasMoreReposts || !userId) return
    setLoadingMoreReposts(true)
    await fetchReposts(userId)
    setLoadingMoreReposts(false)
  }

  async function loadMoreTagged() {
    if (loadingMoreTagged || !hasMoreTagged || !userId) return
    setLoadingMoreTagged(true)
    await fetchTagged(userId)
    setLoadingMoreTagged(false)
  }

  async function followPage() {
    if (!me || !userId) return
    const { error } = await supabase.from('page_follows').insert({ follower_id: me.id, page_id: userId })
    if (!error) { setFollowStatus('following'); toast.success('Following!') }
  }

  async function unfollowPage() {
    if (!me || !userId) return
    await supabase.from('page_follows').delete().eq('follower_id', me.id).eq('page_id', userId)
    setFollowStatus('not_following')
    toast.success('Unfollowed')
  }

  async function connect() {
    if (!me || !userId) return
    setConnecting(true)
    const { error } = await supabase.from('connections').insert({ requester_id: me.id, addressee_id: userId })
    if (!error) {
      setConnStatus('pending_sent')
      toast.success('Connection request sent!')
      await supabase.from('notifications').insert({
        user_id: userId, type: 'connection_request',
        title: 'New connection request',
        body: `${myProfile?.full_name} wants to connect with you`,
        data: { requester_id: me.id, requester_name: myProfile?.full_name },
      })
    } else {
      toast.error('Failed to send request')
    }
    setConnecting(false)
  }

  async function unfriend() {
    if (!me || !userId) return
    setUnfriending(true)
    await supabase.from('connections').delete()
      .or(`and(requester_id.eq.${me.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${me.id})`)
    setConnStatus('none')
    setConnDate(null)
    setPosts([])
    setReposts([])
    setShowUnfriend(false)
    setUnfriending(false)
    toast.success('Unfriended')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="text-center py-32">
        <p className="text-text-muted text-sm">Profile not found</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-accent text-sm hover:underline">Go back</button>
      </div>
    )
  }

  const isPage = profile.account_type === 'page'
  const sameUniversity = myProfile?.university_id != null && profile.university_id != null
    && myProfile.university_id === profile.university_id
  const canSee = isPage || connStatus === 'connected' || (!profile.is_private && sameUniversity)
  const displayItems = activeTab === 'posts' ? posts : activeTab === 'reposts' ? reposts : tagged

  return (
    <div className="animate-fade-in max-w-3xl mx-auto pb-10">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary transition-colors mb-6"
      >
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      {/* ── Profile header ── */}
      <div className="flex items-start gap-12 mb-8">
        {/* Avatar + username */}
        <div className="flex-shrink-0 flex flex-col items-center gap-2">
          <div className={cn(
            'w-36 h-36 rounded-full overflow-hidden bg-surface-hover',
            !isPage && connStatus === 'connected'
              ? 'ring-2 ring-green-500 ring-offset-2 ring-offset-[var(--bg-primary)]'
              : 'ring-2 ring-surface-border ring-offset-2 ring-offset-[var(--bg-primary)]'
          )}>
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-text-muted">
                {profile.full_name?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
          {profile.username && (
            <p className="text-sm text-text-muted font-medium tracking-tight flex items-center gap-1">
              @{profile.username}
              {profile.is_private && !isPage && <Lock className="w-3 h-3" />}
            </p>
          )}
        </div>

        {/* Info column */}
        <div className="flex-1 min-w-0 pt-1">

          {/* Row 1: full name + badges + action top-right */}
          <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-xl font-bold text-text-primary tracking-tight">
                {profile.full_name}
              </h1>
              {profile.verification_status === 'verified' && (
                <BadgeCheck className="w-5 h-5 text-orange-500 flex-shrink-0" />
              )}
              {(profile.is_alumni || (profile.graduation_year && profile.graduation_year <= new Date().getFullYear())) && (
                <span title="Alumni">
                  <GraduationCap className="w-5 h-5 text-accent flex-shrink-0" />
                </span>
              )}
              {profile.subscription_plan === 'gold'   && <Crown className="w-4 h-4 text-yellow-500" />}
              {profile.subscription_plan === 'silver' && <Crown className="w-4 h-4 text-gray-400" />}
              {isPage && profile.page_category && (
                <span className="text-xs text-text-muted bg-surface-hover border border-surface-border px-2 py-0.5 rounded-full">
                  {profile.page_category}
                </span>
              )}
            </div>

            {/* Action button */}
            {me?.id !== userId && (
              <div className="relative flex-shrink-0">
                {isPage ? (
                  followStatus === 'following' ? (
                    <button
                      onClick={unfollowPage}
                      className="flex items-center gap-1.5 text-sm text-text-secondary bg-surface-hover px-4 py-1.5 rounded-lg border border-surface-border hover:border-red-400/40 hover:text-red-400 transition-colors"
                    >
                      <UserCheck className="w-4 h-4" /> Following
                    </button>
                  ) : (
                    <Button onClick={followPage} className="px-6">
                      <UserPlus className="w-4 h-4" /> Follow
                    </Button>
                  )
                ) : connStatus === 'connected' ? (
                  <div className="flex flex-col items-end gap-1">
                    <button
                      onClick={() => setShowFriendOptions(v => !v)}
                      className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400 font-medium bg-green-500/10 px-4 py-1.5 rounded-lg border border-green-500/20 hover:bg-green-500/15 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      {connDate
                        ? `Friends since ${new Date(connDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
                        : 'Connected'}
                    </button>
                    {showFriendOptions && (
                      <button
                        onClick={() => { setShowFriendOptions(false); setShowUnfriend(true) }}
                        className="flex items-center gap-1 text-xs text-red-400 hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg bg-red-400/10 hover:bg-red-400/15 border border-red-400/20"
                      >
                        <UserMinus className="w-3 h-3" /> Unfriend
                      </button>
                    )}
                  </div>
                ) : connStatus === 'pending_sent' ? (
                  <div className="flex items-center gap-1.5 text-sm text-text-muted bg-surface-hover px-4 py-1.5 rounded-lg border border-surface-border">
                    <Clock className="w-4 h-4" /> Request Sent
                  </div>
                ) : connStatus === 'pending_received' ? (
                  <div className="flex items-center gap-1.5 text-sm text-accent bg-accent/10 px-4 py-1.5 rounded-lg border border-accent/20">
                    <Clock className="w-4 h-4" /> Wants to connect
                  </div>
                ) : (
                  <Button onClick={connect} loading={connecting} className="px-6">
                    <UserPlus className="w-4 h-4" /> Connect
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Row 2: bio */}
          {profile.bio && (
            <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap mb-2">{profile.bio}</p>
          )}

          {/* Row 3: university · major · year */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4">
            {(profile.university_name || profile.university?.name) && (
              <div className="flex items-center gap-1.5 text-xs text-text-muted">
                <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                {profile.university_name ?? profile.university?.name}
              </div>
            )}
            {!isPage && profile.major && (
              <div className="flex items-center gap-1.5 text-xs text-text-muted">
                <GraduationCap className="w-3.5 h-3.5 flex-shrink-0" />
                {profile.major}{profile.graduation_year ? ` · Class of ${profile.graduation_year}` : ''}
              </div>
            )}
          </div>

          {/* Row 4: stats boxes — bigger */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center gap-1">
              <div className="px-5 py-3 rounded-xl border border-surface-border bg-surface-hover min-w-[3.5rem] text-center">
                <span className="font-bold text-text-primary tabular-nums text-lg">{stats.posts}</span>
              </div>
              <span className="text-xs text-text-muted font-medium">posts</span>
            </div>
            {isPage ? (
              <div className="flex flex-col items-center gap-1">
                <div className="px-5 py-3 rounded-xl border border-surface-border bg-surface-hover min-w-[3.5rem] text-center">
                  <span className="font-bold text-text-primary tabular-nums text-lg">{profile.followers_count ?? 0}</span>
                </div>
                <span className="text-xs text-text-muted font-medium">followers</span>
              </div>
            ) : (
              <button onClick={fetchMutualConnections} className="flex flex-col items-center gap-1 group">
                <div className="px-5 py-3 rounded-xl border border-surface-border bg-surface-hover min-w-[3.5rem] text-center group-hover:border-accent/40 group-hover:bg-accent/5 transition-colors flex items-center gap-1.5 justify-center">
                  <span className="font-bold text-text-primary tabular-nums text-lg">{stats.connections}</span>
                  <Users className="w-3 h-3 text-accent" />
                </div>
                <span className="text-xs text-text-muted font-medium">connections</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="border-t border-surface-border">
        <div className="flex justify-center gap-10">
          {[
            { id: 'posts' as const,   icon: <LayoutGrid className="w-4 h-4" />, label: 'Posts' },
            { id: 'reposts' as const, icon: <Repeat2 className="w-4 h-4" />,    label: 'Reposts' },
            { id: 'tagged' as const,  icon: <Tag className="w-4 h-4" />,         label: 'Tagged' },
          ].map(({ id, icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex items-center gap-1.5 px-2 py-3 border-t-2 -mt-px text-xs font-semibold tracking-widest uppercase transition-colors',
                activeTab === id
                  ? 'border-text-primary text-text-primary'
                  : 'border-transparent text-text-muted hover:text-text-secondary'
              )}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      {!canSee ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-full border-2 border-surface-border flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-text-muted" />
          </div>
          {!sameUniversity ? (
            <>
              <p className="font-semibold text-text-primary mb-1 text-lg">Different university</p>
              <p className="text-sm text-text-muted">
                {profile.full_name}'s profile is only visible to{' '}
                {profile.university_name ?? 'their university'} students.
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold text-text-primary mb-1 text-lg">This account is private</p>
              <p className="text-sm text-text-muted">Connect with {profile.full_name} to see their posts</p>
            </>
          )}
        </div>
      ) : displayItems.length === 0 ? (
        <div className="text-center py-20">
          {activeTab === 'posts'
            ? <LayoutGrid className="w-12 h-12 text-text-muted/30 mx-auto mb-3" />
            : activeTab === 'reposts'
            ? <Repeat2 className="w-12 h-12 text-text-muted/30 mx-auto mb-3" />
            : <Tag className="w-12 h-12 text-text-muted/30 mx-auto mb-3" />
          }
          <p className="text-text-muted text-sm font-medium">
            {activeTab === 'posts' ? 'No posts yet' : activeTab === 'reposts' ? 'No reposts yet' : 'No tagged posts yet'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-0.5 mt-0.5">
            {displayItems.map(item => {
              const display = activeTab === 'reposts' && item.original_post ? item.original_post : item

              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedPost(item)}
                  className="aspect-square relative overflow-hidden bg-surface-hover group focus:outline-none"
                >
                  {display.media_urls && display.media_urls.length > 0 ? (
                    <img
                      src={display.media_urls[0]}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-start p-3 bg-gradient-to-br from-accent/5 to-surface-hover group-hover:from-accent/10 transition-colors">
                      <p className="text-xs text-text-secondary leading-relaxed line-clamp-5 text-left">
                        {display.content}
                      </p>
                    </div>
                  )}

                  {/* Repost indicator badge */}
                  {activeTab === 'reposts' && (
                    <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5">
                      <Repeat2 className="w-3 h-3 text-green-400" />
                    </div>
                  )}

                  {/* Hover stats overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-5">
                    <span className="flex items-center gap-1.5 text-white text-sm font-semibold">
                      <Heart className="w-4 h-4 fill-white" />
                      {Array.isArray(display.likes) ? display.likes.length : (display.likes_count ?? 0)}
                    </span>
                    <span className="flex items-center gap-1.5 text-white text-sm font-semibold">
                      <MessageCircle className="w-4 h-4 fill-white" />
                      {display.comments_count ?? 0}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Load more */}
          {(activeTab === 'posts' ? hasMorePosts : activeTab === 'reposts' ? hasMoreReposts : hasMoreTagged) && (
            <div className="text-center pt-6">
              <button
                onClick={activeTab === 'posts' ? loadMorePosts : activeTab === 'reposts' ? loadMoreReposts : loadMoreTagged}
                disabled={activeTab === 'posts' ? loadingMorePosts : activeTab === 'reposts' ? loadingMoreReposts : loadingMoreTagged}
                className="text-sm font-semibold text-accent hover:text-accent-hover transition-colors disabled:opacity-50"
              >
                {(activeTab === 'posts' ? loadingMorePosts : activeTab === 'reposts' ? loadingMoreReposts : loadingMoreTagged) ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}

      {/* Post detail overlay */}
      {selectedPost && (
        <PostDetailOverlay
          post={selectedPost}
          profile={profile}
          onClose={() => setSelectedPost(null)}
        />
      )}

      {/* Unfriend confirmation */}
      {showUnfriend && (
        <UnfriendModal
          name={profile.full_name}
          loading={unfriending}
          onConfirm={unfriend}
          onCancel={() => setShowUnfriend(false)}
        />
      )}
      {showMutualModal && (
        <MutualConnectionsModal
          mutuals={mutualConns}
          profileName={profile.full_name}
          loading={mutualLoading}
          onClose={() => setShowMutualModal(false)}
        />
      )}
    </div>
  )
}
