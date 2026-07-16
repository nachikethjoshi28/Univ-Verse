import { useState, useEffect, useMemo } from 'react'
import { Bell, ShoppingBag, Shield, Users, Heart, MessageCircle, Globe, CheckCheck, Check, X, Repeat2, FileText } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import type { Notification } from '../../types'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { cn, timeAgo } from '../../lib/utils'
import toast from 'react-hot-toast'

// ─── Icon / color maps ────────────────────────────────────────────────────────

const TYPE_ICON: Record<string, typeof Bell> = {
  marketplace_listing:    ShoppingBag,
  verification:           Shield,
  connection_request:     Users,
  connection_accepted:    Users,
  connection_post:        FileText,
  connection_repost:      Repeat2,
  match:                  Heart,
  message:                MessageCircle,
  community:              Globe,
  community_post:         Globe,
  community_post_like:    Heart,
  community_post_comment: MessageCircle,
  community_join_request: Users,
  post_like:              Heart,
  post_comment:           MessageCircle,
  post_repost:            Repeat2,
}

const TYPE_COLOR: Record<string, string> = {
  marketplace_listing:    'text-[#10B981] bg-[#10B981]/10',
  verification:           'text-yellow-500 bg-yellow-500/10',
  connection_request:     'text-accent bg-accent/10',
  connection_accepted:    'text-green-500 bg-green-500/10',
  connection_post:        'text-accent bg-accent/10',
  connection_repost:      'text-green-500 bg-green-500/10',
  match:                  'text-[#FF6B9D] bg-[#FF6B9D]/10',
  message:                'text-[#8B5CF6] bg-[#8B5CF6]/10',
  community:              'text-[#8B5CF6] bg-[#8B5CF6]/10',
  community_post:         'text-[#8B5CF6] bg-[#8B5CF6]/10',
  community_post_like:    'text-[#FF6B9D] bg-[#FF6B9D]/10',
  community_post_comment: 'text-accent bg-accent/10',
  community_join_request: 'text-[#10B981] bg-[#10B981]/10',
  post_like:              'text-[#FF6B9D] bg-[#FF6B9D]/10',
  post_comment:           'text-accent bg-accent/10',
  post_repost:            'text-green-500 bg-green-500/10',
}

// Types where we group by post/community and show "Name and X others [action]"
const ACTION_LABEL: Record<string, string> = {
  post_like:              'liked your post',
  post_repost:            'reposted your post',
  post_comment:           'commented on your post',
  community_post_like:    'liked your community post',
  community_post_comment: 'commented on your community post',
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface GroupedNotif {
  key: string
  type: string
  actors: string[]
  postId?: string
  latest_at: string
  is_read: boolean
  notif_ids: string[]
  raw: Notification
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractActorName(notif: Notification): string {
  const data = notif.data as any
  if (data?.actor_name) return data.actor_name
  const body = notif.body ?? ''
  if (notif.type === 'post_like')              return body.replace(' liked your post', '')
  if (notif.type === 'post_repost')            return body.replace(' reposted your post', '')
  if (notif.type === 'post_comment')           return body.split(' commented:')[0]
  if (notif.type === 'community_post_like')    return body.split(' liked your post')[0]
  if (notif.type === 'community_post_comment') return body.split(' commented on')[0]
  if (notif.type === 'connection_post')        return body.split(' shared a')[0]
  if (notif.type === 'connection_repost')      return body.split(' reposted')[0]
  if (notif.type === 'community_post')         return body.split(' posted in')[0]
  if (notif.type === 'community_join_request') return body.split(' wants to')[0]
  return 'Someone'
}

function groupNotifications(notifs: Notification[]): GroupedNotif[] {
  const map = new Map<string, GroupedNotif>()

  for (const notif of notifs) {
    const d = notif.data as any
    const postId          = d?.post_id           as string | undefined
    const communityPostId = d?.community_post_id as string | undefined
    const communityId     = d?.community_id      as string | undefined

    let key: string
    if (['post_like', 'post_comment', 'post_repost'].includes(notif.type) && postId) {
      key = `${notif.type}::${postId}`
    } else if (['community_post_like', 'community_post_comment'].includes(notif.type) && communityPostId) {
      key = `${notif.type}::${communityPostId}`
    } else if (['community_post', 'community_join_request'].includes(notif.type) && communityId) {
      key = `${notif.type}::${communityId}`
    } else {
      key = notif.id
    }

    const actor = extractActorName(notif)

    if (map.has(key)) {
      const g = map.get(key)!
      if (!g.actors.includes(actor)) g.actors.push(actor)
      g.notif_ids.push(notif.id)
      if (!notif.is_read) g.is_read = false
    } else {
      map.set(key, {
        key,
        type: notif.type,
        actors: [actor],
        postId,
        latest_at: notif.created_at,
        is_read: notif.is_read ?? false,
        notif_ids: [notif.id],
        raw: notif,
      })
    }
  }

  return Array.from(map.values())
}

function groupTitle(g: GroupedNotif): string {
  const action = ACTION_LABEL[g.type]
  const d = g.raw.data as any
  const [first, ...rest] = g.actors
  const count = rest.length

  if (action) {
    if (count === 0) return `${first} ${action}`
    if (count === 1) return `${first} and 1 other ${action}`
    return `${first} and ${count} others ${action}`
  }

  // Community post: "3 new posts in Community Name"
  if (g.type === 'community_post') {
    const name = d?.community_name ?? 'your community'
    const total = g.notif_ids.length
    if (total === 1) return `${first} posted in ${name}`
    return `${total} new posts in ${name}`
  }

  // Community join request: "Name and X others want to join Community Name"
  if (g.type === 'community_join_request') {
    const name = d?.community_name ?? 'your community'
    if (count === 0) return `${first} wants to join ${name}`
    if (count === 1) return `${first} and 1 other want to join ${name}`
    return `${first} and ${count} others want to join ${name}`
  }

  return g.raw.title ?? 'Notification'
}

// ─── Post thumbnail ───────────────────────────────────────────────────────────

function PostThumb({ post }: { post: { content: string | null; media_urls: string[] | null } | undefined }) {
  if (!post) return null

  const img = post.media_urls?.[0]
  if (img) {
    return (
      <img
        src={img}
        alt="post"
        className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-surface-border"
      />
    )
  }

  return (
    <div className="w-12 h-12 rounded-xl border-2 border-surface-border flex items-center justify-center p-1.5 flex-shrink-0 overflow-hidden bg-surface-hover">
      <p className="text-[8px] text-text-muted leading-tight line-clamp-4 text-center break-words">
        {(post.content ?? '').slice(0, 60)}
      </p>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NotificationsPage() {
  const { user, profile } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [postsMap, setPostsMap] = useState<Record<string, { content: string | null; media_urls: string[] | null }>>({})
  const [loading, setLoading] = useState(true)
  const [respondingIds, setRespondingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!user) return
    fetchNotifications()
    markAllRead()

    const ch = supabase
      .channel(`notifs-live-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        async () => { await fetchNotifications(); markAllRead() })
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [user?.id])

  async function fetchNotifications() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(100)

    const notifs = (data as Notification[]) ?? []
    setNotifications(notifs)
    setLoading(false)

    // Fetch thumbnails from both posts and community_posts tables
    const postIds = [...new Set(notifs.filter(n => (n.data as any)?.post_id).map(n => (n.data as any).post_id as string))]
    const communityPostIds = [...new Set(notifs.filter(n => (n.data as any)?.community_post_id).map(n => (n.data as any).community_post_id as string))]

    const m: Record<string, any> = {}

    await Promise.all([
      postIds.length > 0
        ? supabase.from('posts').select('id, content, media_urls').in('id', postIds)
            .then(({ data }) => data?.forEach(p => { m[p.id] = p }))
        : Promise.resolve(),
      communityPostIds.length > 0
        ? supabase.from('community_posts').select('id, content, media_urls').in('id', communityPostIds)
            .then(({ data }) => data?.forEach(p => { m[p.id] = p }))
        : Promise.resolve(),
    ])

    setPostsMap(m)
  }

  async function markAllRead() {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user?.id)
      .eq('is_read', false)
  }

  async function clearAll() {
    await supabase.from('notifications').delete().eq('user_id', user?.id)
    setNotifications([])
    setPostsMap({})
  }

  async function respondToConnection(notif: Notification, accept: boolean) {
    const requesterId = (notif.data as any)?.requester_id
    if (!requesterId || !user) return

    setRespondingIds(s => new Set([...s, notif.id]))

    await supabase
      .from('connections')
      .update({ status: accept ? 'accepted' : 'rejected' })
      .eq('requester_id', requesterId)
      .eq('addressee_id', user.id)

    if (accept) {
      await supabase.from('notifications').insert({
        user_id: requesterId,
        type: 'connection_accepted',
        title: 'Connection accepted!',
        body: `${profile?.full_name} accepted your connection request. You are now connected!`,
        data: { accepter_id: user.id },
      })
      toast.success('Connection accepted!')
    } else {
      toast.success('Request declined')
    }

    await supabase.from('notifications').delete().eq('id', notif.id)
    setNotifications(prev => prev.filter(n => n.id !== notif.id))
    setRespondingIds(s => { const next = new Set(s); next.delete(notif.id); return next })
  }

  const grouped = useMemo(() => groupNotifications(notifications), [notifications])
  const unreadCount = grouped.filter(g => !g.is_read).length

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-text-muted text-sm mt-0.5">{unreadCount} unread</p>
          )}
        </div>
        {notifications.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAll}>
            <CheckCheck className="w-4 h-4" />
            Clear all
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-2xl bg-surface-hover flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-surface-hover rounded-full w-3/4" />
                  <div className="h-3 bg-surface-hover rounded-full w-1/4" />
                </div>
                <div className="w-12 h-12 rounded-xl bg-surface-hover flex-shrink-0" />
              </div>
            </Card>
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <Card className="text-center py-20">
          <div className="w-16 h-16 rounded-3xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8 text-accent" />
          </div>
          <p className="text-text-secondary font-medium">All caught up!</p>
          <p className="text-text-muted text-sm mt-1">
            You'll be notified about new connections, matches, and more.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {grouped.map(g => {
            const Icon = TYPE_ICON[g.type] ?? Bell
            const colorClass = TYPE_COLOR[g.type] ?? 'text-accent bg-accent/10'
            const isConnectionRequest = g.type === 'connection_request'
            const isResponding = respondingIds.has(g.raw.id)
            const isPostNotif = !!ACTION_LABEL[g.type]
            const hasThumb = isPostNotif || ['connection_post', 'connection_repost'].includes(g.type)
            const thumbId = (g.raw.data as any)?.post_id ?? (g.raw.data as any)?.community_post_id
            const post = thumbId ? postsMap[thumbId] : undefined

            return (
              <Card
                key={g.key}
                className={cn(
                  'flex gap-4 transition-all',
                  !g.is_read && 'border-accent/30 bg-accent/5'
                )}
              >
                {/* Type icon */}
                <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5', colorClass)}>
                  <Icon className="w-5 h-5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-text-primary text-sm leading-snug">
                      {groupTitle(g)}
                    </p>
                    {!g.is_read && (
                      <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-1.5" />
                    )}
                  </div>

                  {/* Show body only for non-post notifs (connection requests etc.) */}
                  {!isPostNotif && g.raw.body && (
                    <p className="text-text-secondary text-sm mt-0.5">{g.raw.body}</p>
                  )}

                  <p className="text-text-muted text-xs mt-1">{timeAgo(g.latest_at)}</p>

                  {/* Connection request accept/decline */}
                  {isConnectionRequest && (
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" loading={isResponding} onClick={() => respondToConnection(g.raw, true)}>
                        <Check className="w-3.5 h-3.5" /> Accept
                      </Button>
                      <Button size="sm" variant="ghost" disabled={isResponding} onClick={() => respondToConnection(g.raw, false)}>
                        <X className="w-3.5 h-3.5" /> Decline
                      </Button>
                    </div>
                  )}
                </div>

                {/* Post thumbnail (right side) */}
                {hasThumb && <PostThumb post={post} />}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
