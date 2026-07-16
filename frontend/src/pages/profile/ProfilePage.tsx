import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import {
  Settings, Link2, Calendar, GraduationCap, BookOpen, Heart, ShoppingBag,
  Building2, BadgeCheck, Crown, MessageCircle, Repeat2, Share2, LayoutGrid,
  MoreVertical, Archive, Trash2, Pencil, X, Check, ArchiveRestore, Send, Bookmark, Tag,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Avatar } from '../../components/ui/Avatar'
import { cn, formatDate, timeAgo, formatPrice } from '../../lib/utils'
import { TextPostImage } from '../../components/home/TextPostImage'
import type { Profile } from '../../types'

type Tab = 'about' | 'posts' | 'reposts' | 'saved' | 'listings' | 'archived' | 'tagged'

const CONDITION_LABEL: Record<string, string> = {
  new: 'New', like_new: 'Like New', good: 'Good', fair: 'Fair', poor: 'Poor',
}
const TYPE_LABEL: Record<string, string> = {
  sell: 'For Sale', rent: 'For Rent', buy_request: 'Wanted',
}

// ── PostDetailOverlay (portal) ────────────────────────────────────────────────
function PostDetailOverlay({ post, myName, onClose }: { post: any; myName: string; onClose: () => void }) {
  const isRepost = !!post.repost_of_id
  const display = isRepost && post.original_post ? post.original_post : post
  const displayAuthor = isRepost && post.original_post?.author ? post.original_post.author : null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative bg-surface rounded-2xl overflow-hidden max-w-lg w-full mx-4 max-h-[90vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors">
          <X className="w-4 h-4" />
        </button>

        {isRepost && (
          <div className="px-4 pt-4 pb-2 flex items-center gap-2 text-xs text-text-muted border-b border-surface-border">
            <Repeat2 className="w-3.5 h-3.5 text-green-500" />
            <span>{myName} reposted</span>
          </div>
        )}

        {display.media_urls && display.media_urls.length > 0 && (
          <img src={display.media_urls[0]} alt="" className="w-full max-h-80 object-cover flex-shrink-0" />
        )}

        <div className="p-4 space-y-3 overflow-y-auto">
          {displayAuthor && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full overflow-hidden bg-surface-hover flex-shrink-0">
                {displayAuthor.avatar_url
                  ? <img src={displayAuthor.avatar_url} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-sm font-bold text-text-muted">{displayAuthor.full_name?.[0]}</div>
                }
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">{displayAuthor.full_name}</p>
                <p className="text-xs text-text-muted">{timeAgo(display.created_at)}</p>
              </div>
            </div>
          )}
          {display.content && (
            <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">{display.content}</p>
          )}
          {display.media_urls && display.media_urls.length > 1 && (
            <div className="grid grid-cols-2 gap-1.5">
              {display.media_urls.slice(1).map((url: string, i: number) => (
                <img key={i} src={url} alt="" className="w-full h-32 object-cover rounded-xl" />
              ))}
            </div>
          )}
          <div className="flex items-center gap-5 text-xs text-text-muted pt-2 border-t border-surface-border">
            <span className="flex items-center gap-1.5"><Heart className="w-3.5 h-3.5" />{display.likes_count ?? 0}</span>
            <span className="flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5" />{display.comments_count ?? 0}</span>
            <span className="flex items-center gap-1.5"><Repeat2 className="w-3.5 h-3.5" />{display.reposts_count ?? 0}</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Per-post three-dot menu ──────────────────────────────────────────────────
function PostMenu({ onEdit, onDelete, onArchive }: { onEdit: () => void; onDelete: () => void; onArchive: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)} className="p-1.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all">
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-surface border border-surface-border rounded-xl shadow-lg z-30 min-w-[160px] py-1 overflow-hidden">
          <button onClick={() => { setOpen(false); onEdit() }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text-primary hover:bg-surface-hover transition-colors">
            <Pencil className="w-3.5 h-3.5 text-text-muted" /> Edit post
          </button>
          <button onClick={() => { setOpen(false); onDelete() }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors">
            <Trash2 className="w-3.5 h-3.5" /> Delete post
          </button>
          <button onClick={() => { setOpen(false); onArchive() }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text-primary hover:bg-surface-hover transition-colors">
            <Archive className="w-3.5 h-3.5 text-text-muted" /> Archive post
          </button>
        </div>
      )}
    </div>
  )
}

// ── Share modal (portal) ──────────────────────────────────────────────────────
function ShareModal({ friends, onClose }: { friends: Profile[]; onClose: () => void }) {
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [sending, setSending] = useState<string | null>(null)
  const [sent, setSent] = useState<Set<string>>(new Set())

  const filtered = friends.filter(f =>
    f.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (f.username ?? '').toLowerCase().includes(search.toLowerCase())
  )

  async function sendToFriend(friendId: string) {
    if (!user || sending) return
    setSending(friendId)
    const { data: convId } = await supabase.rpc('get_or_create_direct_conversation', { other_user_id: friendId })
    if (convId) {
      await supabase.from('messages').insert({ conversation_id: convId, sender_id: user.id, content: `${window.location.origin}/home` })
      setSent(prev => new Set(prev).add(friendId))
    }
    setSending(null)
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface rounded-2xl p-5 w-full max-w-sm mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-text-primary">Share with a friend</h3>
          <button onClick={onClose} className="p-1 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
        <input
          value={search} onChange={e => setSearch(e.target.value)} placeholder="Search friends…"
          className="w-full bg-surface-hover border border-surface-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-accent/30 mb-3"
        />
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-6">No friends found</p>
          ) : filtered.map(friend => (
            <div key={friend.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-surface-hover transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar src={friend.avatar_url} name={friend.full_name} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{friend.full_name}</p>
                  {friend.username && <p className="text-xs text-text-muted">@{friend.username}</p>}
                </div>
              </div>
              <button
                onClick={() => sendToFriend(friend.id)}
                disabled={!!sending || sent.has(friend.id)}
                className={cn(
                  'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl transition-all',
                  sent.has(friend.id) ? 'text-green-500 bg-green-500/10' :
                  sending === friend.id ? 'text-text-muted bg-surface-hover' :
                  'text-accent bg-accent/10 hover:bg-accent/20'
                )}
              >
                {sent.has(friend.id) ? <><Check className="w-3 h-3" /> Sent</> :
                 sending === friend.id ? 'Sending…' : <><Send className="w-3 h-3" /> Send</>}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Edit post modal (portal) ──────────────────────────────────────────────────
function EditPostModal({ post, onSave, onClose }: { post: any; onSave: (id: string, content: string) => void; onClose: () => void }) {
  const [content, setContent] = useState(post.content ?? '')
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface rounded-2xl p-5 w-full max-w-lg mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-text-primary">Edit post</h3>
          <button onClick={onClose} className="p-1 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
        <textarea
          value={content} onChange={e => setContent(e.target.value)} rows={5}
          className="w-full bg-surface-hover border border-surface-border rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-accent/30 resize-none"
        />
        <div className="flex justify-end gap-2 mt-3">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => onSave(post.id, content)} disabled={!content.trim()}>
            <Check className="w-3.5 h-3.5" /> Save
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Main ProfilePage ──────────────────────────────────────────────────────────
export function ProfilePage({ onEditProfile }: { onEditProfile?: () => void } = {}) {
  const { profile, user } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('about')

  const [stats, setStats] = useState({ posts: 0, connections: 0, listings: 0, reposts: 0 })
  const [posts, setPosts] = useState<any[]>([])
  const [reposts, setReposts] = useState<any[]>([])
  const [savedPosts, setSavedPosts] = useState<any[]>([])
  const [archivedPosts, setArchivedPosts] = useState<any[]>([])
  const [taggedPosts, setTaggedPosts] = useState<any[]>([])
  const [listings, setListings] = useState<any[]>([])
  const [tabLoading, setTabLoading] = useState(false)
  const [selectedPost, setSelectedPost] = useState<any | null>(null)

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [editingPost, setEditingPost] = useState<any | null>(null)
  const [sharePostId, setSharePostId] = useState<string | null>(null)
  const [friends, setFriends] = useState<Profile[]>([])
  const [myReposts, setMyReposts] = useState<Map<string, string>>(new Map())

  interface CS { open: boolean; loading: boolean; comments: any[]; text: string; submitting: boolean; count: number }
  const EMPTY_CS: CS = { open: false, loading: false, comments: [], text: '', submitting: false, count: 0 }
  const [commentStates, setCommentStates] = useState<Map<string, CS>>(new Map())
  const getCS = (id: string): CS => commentStates.get(id) ?? EMPTY_CS
  const updCS = (id: string, u: Partial<CS>) =>
    setCommentStates(prev => new Map(prev).set(id, { ...(prev.get(id) ?? EMPTY_CS), ...u }))

  useEffect(() => { if (user) fetchStats() }, [user])

  useEffect(() => {
    if (activeTab === 'posts') fetchMyPosts()
    else if (activeTab === 'reposts') fetchMyReposts()
    else if (activeTab === 'saved') fetchSavedPosts()
    else if (activeTab === 'listings') fetchMyListings()
    else if (activeTab === 'archived') fetchArchivedPosts()
    else if (activeTab === 'tagged') fetchTaggedPosts()
  }, [activeTab, user])

  async function fetchStats() {
    if (!user) return
    const [postsRes, connsRes, listingsRes, repostsRes] = await Promise.all([
      supabase.from('posts').select('*', { count: 'exact', head: true })
        .eq('user_id', user.id).is('repost_of_id', null).eq('is_archived', false).eq('is_flagged', false),
      supabase.from('connections')
        .select('*', { count: 'exact', head: true })
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq('status', 'accepted'),
      supabase.from('marketplace_listings')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', user.id).eq('is_flagged', false),
      supabase.from('posts').select('*', { count: 'exact', head: true })
        .eq('user_id', user.id).not('repost_of_id', 'is', null).eq('is_archived', false),
    ])
    setStats({
      posts: postsRes.count ?? 0,
      connections: connsRes.count ?? 0,
      listings: listingsRes.count ?? 0,
      reposts: repostsRes.count ?? 0,
    })
  }

  async function fetchMyPosts() {
    if (!user) return
    setTabLoading(true)
    const [{ data }, { data: repostData }] = await Promise.all([
      supabase.from('posts')
        .select('*, post_likes!left(user_id)')
        .eq('user_id', user.id)
        .eq('is_flagged', false)
        .eq('is_archived', false)
        .is('repost_of_id', null)
        .order('created_at', { ascending: false })
        .limit(30),
      supabase.from('posts').select('id, repost_of_id').eq('user_id', user.id).not('repost_of_id', 'is', null),
    ])
    const map = new Map<string, string>()
    for (const r of (repostData ?? [])) { if (r.repost_of_id) map.set(r.repost_of_id, r.id) }
    setMyReposts(map)
    setPosts((data ?? []).map((p: any) => ({
      ...p,
      liked_by_me: Array.isArray(p.post_likes) && p.post_likes.some((l: any) => l.user_id === user.id),
    })))
    setTabLoading(false)
  }

  async function fetchMyReposts() {
    if (!user) return
    setTabLoading(true)
    const { data: raw } = await supabase.from('posts')
      .select('*, likes:post_likes(user_id)')
      .eq('user_id', user.id)
      .not('repost_of_id', 'is', null)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!raw || raw.length === 0) { setReposts([]); setTabLoading(false); return }

    const originalIds = [...new Set(raw.map((r: any) => r.repost_of_id).filter(Boolean))]
    const origMap: Record<string, any> = {}
    if (originalIds.length > 0) {
      const { data: originals } = await supabase
        .from('posts')
        .select('id, user_id, content, media_urls, likes_count, comments_count, reposts_count, created_at, author:profiles!posts_user_id_fkey(id, full_name, avatar_url, username)')
        .in('id', originalIds)
      originals?.forEach((o: any) => { origMap[o.id] = o })
    }
    setReposts(raw.map((r: any) => ({ ...r, original_post: origMap[r.repost_of_id] ?? null })))
    setTabLoading(false)
  }

  async function fetchSavedPosts() {
    if (!user) return
    setTabLoading(true)
    // Step 1: get saved post IDs (saved_posts has its own RLS allowing own reads)
    const { data: saved } = await supabase
      .from('saved_posts')
      .select('post_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    const ids = (saved ?? []).map((s: any) => s.post_id).filter(Boolean)
    if (!ids.length) { setSavedPosts([]); setTabLoading(false); return }
    // Step 2: fetch posts directly so RLS is evaluated per-row (not via silent join null)
    const { data } = await supabase
      .from('posts')
      .select('id, user_id, content, media_urls, likes_count, comments_count, reposts_count, created_at, author:profiles!posts_user_id_fkey(id, full_name, avatar_url, username)')
      .in('id', ids)
    // Preserve saved-order
    const postMap = new Map((data ?? []).map((p: any) => [p.id, p]))
    setSavedPosts(ids.map((id: string) => postMap.get(id)).filter(Boolean))
    setTabLoading(false)
  }

  async function fetchArchivedPosts() {
    if (!user) return
    setTabLoading(true)
    const { data } = await supabase.from('posts')
      .select('*, post_likes!left(user_id)')
      .eq('user_id', user.id).eq('is_archived', true)
      .order('created_at', { ascending: false }).limit(30)
    setArchivedPosts((data ?? []).map((p: any) => ({
      ...p,
      liked_by_me: Array.isArray(p.post_likes) && p.post_likes.some((l: any) => l.user_id === user.id),
    })))
    setTabLoading(false)
  }

  async function fetchTaggedPosts() {
    if (!user) return
    setTabLoading(true)
    const { data } = await supabase
      .from('post_tags')
      .select('post:posts(id, user_id, content, media_urls, likes_count, comments_count, reposts_count, created_at, author:profiles!posts_user_id_fkey(id, full_name, avatar_url, username))')
      .eq('tagged_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setTaggedPosts((data ?? []).map((row: any) => row.post).filter(Boolean))
    setTabLoading(false)
  }

  async function fetchMyListings() {
    if (!user) return
    setTabLoading(true)
    const { data } = await supabase.from('marketplace_listings')
      .select('*').eq('seller_id', user.id).eq('is_flagged', false)
      .order('created_at', { ascending: false }).limit(20)
    setListings(data ?? [])
    setTabLoading(false)
  }

  async function fetchFriends() {
    if (!user || friends.length) return
    const { data } = await supabase.from('connections')
      .select('requester:profiles!requester_id(*), addressee:profiles!addressee_id(*)')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`).eq('status', 'accepted')
    const list: Profile[] = []
    for (const c of (data ?? []) as any[]) {
      const other = c.requester?.id === user.id ? c.addressee : c.requester
      if (other) list.push(other as Profile)
    }
    setFriends(list)
  }

  async function toggleLike(postId: string, liked: boolean) {
    if (!user) return
    if (liked) await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id)
    else await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id })
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, liked_by_me: !liked, likes_count: p.likes_count + (liked ? -1 : 1) } : p
    ))
  }

  async function toggleRepost(postId: string) {
    if (!user) return
    const existingId = myReposts.get(postId)
    if (existingId) {
      await supabase.from('posts').delete().eq('id', existingId)
      setMyReposts(prev => { const m = new Map(prev); m.delete(postId); return m })
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, reposts_count: Math.max(0, (p.reposts_count ?? 0) - 1) } : p
      ))
    } else {
      const { data } = await supabase.from('posts')
        .insert({ user_id: user.id, content: null, media_urls: null, repost_of_id: postId })
        .select('id').single()
      if (data) {
        setMyReposts(prev => new Map(prev).set(postId, data.id))
        setPosts(prev => prev.map(p =>
          p.id === postId ? { ...p, reposts_count: (p.reposts_count ?? 0) + 1 } : p
        ))
      }
    }
  }

  async function toggleComments(post: any) {
    const cs = getCS(post.id)
    if (!cs.open && !cs.comments.length) {
      updCS(post.id, { open: true, loading: true })
      const { data } = await supabase.from('post_comments')
        .select('*, author:profiles!post_comments_user_id_fkey(id, full_name, avatar_url, username, subscription_plan)')
        .eq('post_id', post.id).order('created_at', { ascending: true })
      updCS(post.id, { loading: false, comments: data ?? [], count: (data ?? []).length })
    } else {
      updCS(post.id, { open: !cs.open })
    }
  }

  async function submitComment(postId: string) {
    const cs = getCS(postId)
    if (!cs.text.trim() || !user) return
    updCS(postId, { submitting: true })
    const { data, error } = await supabase.from('post_comments')
      .insert({ post_id: postId, user_id: user.id, content: cs.text.trim() })
      .select('*, author:profiles!post_comments_user_id_fkey(id, full_name, avatar_url, username, subscription_plan)')
      .single()
    if (!error && data) {
      const cur = getCS(postId)
      updCS(postId, { comments: [...cur.comments, data], count: cur.count + 1, text: '', submitting: false })
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p))
    } else {
      updCS(postId, { submitting: false })
    }
  }

  async function saveEditPost(postId: string, content: string) {
    const { error } = await supabase.from('posts').update({ content: content.trim() || null }).eq('id', postId)
    if (!error) setPosts(prev => prev.map(p => p.id === postId ? { ...p, content: content.trim() || null } : p))
    setEditingPost(null)
  }

  async function confirmDelete(postId: string) {
    await supabase.from('posts').delete().eq('id', postId)
    setPosts(prev => prev.filter(p => p.id !== postId))
    setDeleteConfirm(null)
    fetchStats()
  }

  async function archivePost(postId: string) {
    await supabase.from('posts').update({ is_archived: true }).eq('id', postId)
    setPosts(prev => prev.filter(p => p.id !== postId))
    fetchStats()
  }

  async function unarchivePost(postId: string) {
    await supabase.from('posts').update({ is_archived: false }).eq('id', postId)
    setArchivedPosts(prev => prev.filter(p => p.id !== postId))
    fetchStats()
  }

  if (!profile) return null

  const tabs: { key: Tab; icon: any; label: string }[] = [
    { key: 'about',    icon: BookOpen,    label: 'About' },
    { key: 'posts',    icon: LayoutGrid,  label: `Posts${stats.posts > 0 ? ` (${stats.posts})` : ''}` },
    { key: 'reposts',  icon: Repeat2,     label: `Reposts${stats.reposts > 0 ? ` (${stats.reposts})` : ''}` },
    { key: 'tagged',   icon: Tag,         label: 'Tagged' },
    { key: 'saved',    icon: Bookmark,    label: 'Saved' },
    { key: 'listings', icon: ShoppingBag, label: `Listings${stats.listings > 0 ? ` (${stats.listings})` : ''}` },
    { key: 'archived', icon: Archive,     label: 'Archive' },
  ]

  // Reusable PostCard for own posts / archive
  function PostCard({ post, archived = false }: { post: any; archived?: boolean }) {
    const isReposted = myReposts.has(post.id)
    return (
      <Card key={post.id}>
        <div className="flex items-start justify-between mb-2.5">
          <span className="text-xs text-text-muted">{timeAgo(post.created_at)}</span>
          {archived ? (
            <button onClick={() => unarchivePost(post.id)} className="flex items-center gap-1.5 text-xs text-accent hover:text-accent-hover transition-colors px-2 py-1 rounded-xl hover:bg-accent/10">
              <ArchiveRestore className="w-3.5 h-3.5" /> Unarchive
            </button>
          ) : (
            <PostMenu onEdit={() => setEditingPost(post)} onDelete={() => setDeleteConfirm(post.id)} onArchive={() => archivePost(post.id)} />
          )}
        </div>
        {/* Text-only post → styled image card */}
        {post.content && (!post.media_urls || post.media_urls.length === 0) ? (
          <TextPostImage text={post.content} />
        ) : (
          <>
            {post.content && <p className="text-text-primary text-sm leading-relaxed mb-3 whitespace-pre-wrap">{post.content}</p>}
            {post.media_urls && post.media_urls.length > 0 && (
              <div className={cn('grid gap-2 mb-3', post.media_urls.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
                {post.media_urls.map((url: string, i: number) => (
                  <img key={i} src={url} alt="" className="rounded-2xl w-full object-cover max-h-80" />
                ))}
              </div>
            )}
          </>
        )}
        {deleteConfirm === post.id && (
          <div className="mb-3 p-3 bg-red-500/10 rounded-xl border border-red-500/20">
            <p className="text-sm text-text-primary font-medium mb-2">Are you sure you want to delete? This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => confirmDelete(post.id)} className="text-xs px-3 py-1.5 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors">Delete</button>
              <button onClick={() => setDeleteConfirm(null)} className="text-xs px-3 py-1.5 border border-surface-border rounded-xl text-text-secondary hover:bg-surface-hover transition-colors">Cancel</button>
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-surface-border text-sm text-text-muted">
          {!archived && (
            <button onClick={() => toggleLike(post.id, post.liked_by_me)} className={cn('flex items-center gap-1.5 px-2 py-1.5 rounded-xl transition-colors', post.liked_by_me ? 'text-[#FF6B9D]' : 'hover:text-[#FF6B9D] hover:bg-surface-hover')}>
              <Heart className={cn('w-4 h-4', post.liked_by_me && 'fill-current')} />
              {post.likes_count > 0 && <span className="text-xs">{post.likes_count}</span>}
            </button>
          )}
          {(() => {
            const cs = getCS(post.id)
            const count = cs.count || post.comments_count
            return (
              <button onClick={() => toggleComments(post)} className={cn('flex items-center gap-1.5 px-2 py-1.5 rounded-xl transition-colors', cs.open ? 'text-accent bg-accent/10' : 'text-text-muted hover:text-text-primary hover:bg-surface-hover')}>
                <MessageCircle className="w-4 h-4" />
                {count > 0 && <span className="text-xs">{count}</span>}
              </button>
            )
          })()}
          {!archived && (
            <button onClick={() => toggleRepost(post.id)} className={cn('flex items-center gap-1.5 px-2 py-1.5 rounded-xl transition-colors', isReposted ? 'text-green-500' : 'hover:text-green-500 hover:bg-surface-hover')}>
              <Repeat2 className="w-4 h-4" />
              {(post.reposts_count ?? 0) > 0 && <span className="text-xs">{post.reposts_count}</span>}
            </button>
          )}
          {!archived && (
            <button onClick={() => { setSharePostId(post.id); fetchFriends() }} className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl hover:text-accent hover:bg-surface-hover transition-colors">
              <Share2 className="w-4 h-4" />
            </button>
          )}
          {archived && <span className="ml-auto text-xs text-text-muted">Archived</span>}

          {(() => {
            const cs = getCS(post.id)
            if (!cs.open) return null
            return (
              <div style={{ flexBasis: '100%', order: 99, marginTop: '0.5rem' }} className="pt-3 border-t border-surface-border space-y-3">
                {cs.loading ? (
                  <div className="space-y-2">
                    {[1, 2].map(i => <div key={i} className="flex gap-2 animate-pulse"><div className="w-7 h-7 rounded-full bg-surface-hover flex-shrink-0" /><div className="flex-1 h-8 bg-surface-hover rounded-xl" /></div>)}
                  </div>
                ) : cs.comments.length === 0 ? (
                  <p className="text-xs text-text-muted text-center py-2">No comments yet. Be first!</p>
                ) : (
                  <div className="space-y-2">
                    {cs.comments.map(c => (
                      <div key={c.id} className="flex gap-2">
                        <Avatar src={c.author?.avatar_url} name={c.author?.full_name} size="xs" />
                        <div className="flex-1 bg-surface-hover rounded-2xl px-3 py-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-xs font-semibold text-text-primary">{c.author?.full_name ?? 'Unknown'}</p>
                            {c.author?.subscription_plan === 'gold' && <Crown className="w-3 h-3 text-yellow-500" />}
                            <span className="text-[11px] text-text-muted">{timeAgo(c.created_at)}</span>
                          </div>
                          <p className="text-sm text-text-secondary mt-0.5 whitespace-pre-wrap">{c.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 bg-surface-hover rounded-2xl px-3 py-2">
                  <input
                    type="text" placeholder="Write a comment…" value={cs.text}
                    onChange={e => updCS(post.id, { text: e.target.value })}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(post.id) } }}
                    className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
                  />
                  <button onClick={() => submitComment(post.id)} disabled={!cs.text.trim() || cs.submitting} className="text-accent hover:text-accent-hover disabled:opacity-40 transition-colors">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })()}
        </div>
      </Card>
    )
  }

  // Grid cell for reposts / saved
  function GridCell({ item, isSaved = false }: { item: any; isSaved?: boolean }) {
    const display = item.original_post ?? item
    const media = display.media_urls?.[0]
    const isRepost = !!item.repost_of_id

    return (
      <button
        onClick={() => setSelectedPost(item)}
        className="aspect-square relative overflow-hidden bg-surface-hover hover:opacity-90 transition-opacity group"
      >
        {media ? (
          <img src={media} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-start justify-start p-2.5 bg-surface-hover">
            <p className="text-[10px] text-text-secondary leading-relaxed line-clamp-5 text-left">
              {(display.content ?? '').slice(0, 100)}
            </p>
          </div>
        )}
        {/* Badge overlay */}
        <div className="absolute top-1.5 right-1.5">
          {isRepost && (
            <div className="bg-black/50 rounded-md p-0.5 backdrop-blur-sm">
              <Repeat2 className="w-3 h-3 text-green-400" />
            </div>
          )}
          {isSaved && (
            <div className="bg-black/50 rounded-md p-0.5 backdrop-blur-sm">
              <Bookmark className="w-3 h-3 text-accent" />
            </div>
          )}
        </div>
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="flex items-center gap-3 text-white text-xs font-semibold">
            <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5 fill-current" /> {display.likes_count ?? 0}</span>
            <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5 fill-current" /> {display.comments_count ?? 0}</span>
          </div>
        </div>
      </button>
    )
  }

  const isGold   = profile.subscription_plan === 'gold'
  const isSilver = profile.subscription_plan === 'silver'

  return (
    <div className="space-y-0 animate-fade-in">
      {/* Modals */}
      {editingPost && <EditPostModal post={editingPost} onSave={saveEditPost} onClose={() => setEditingPost(null)} />}
      {sharePostId && <ShareModal friends={friends} onClose={() => setSharePostId(null)} />}
      {selectedPost && <PostDetailOverlay post={selectedPost} myName={profile.full_name} onClose={() => setSelectedPost(null)} />}

      {/* ── Redesigned Profile Header ── */}
      <div className="rounded-3xl overflow-hidden bg-surface border border-surface-border shadow-sm mb-0">
        {/* Cover — only shown when a cover photo is set */}
        {profile.cover_url && (
          <div className="relative h-40 overflow-hidden">
            <img src={profile.cover_url} className="w-full h-full object-cover" alt="" />
            <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[var(--color-surface)] to-transparent" />
          </div>
        )}

        {/* Avatar + Info */}
        <div className="px-5 py-5" style={{ marginTop: profile.cover_url ? '-2.5rem' : '0' }}>
          <div className="flex gap-4">

            {/* Left column: avatar circle + username */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className={cn(
                'w-20 h-20 rounded-full border-[3px] border-surface overflow-hidden bg-surface-hover shadow-md',
                isGold   ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-[var(--color-surface)]' :
                isSilver ? 'ring-2 ring-gray-400  ring-offset-1 ring-offset-[var(--color-surface)]' :
                profile.verification_status === 'verified' ? 'ring-2 ring-orange-400 ring-offset-1 ring-offset-[var(--color-surface)]' : ''
              )}>
                {profile.avatar_url
                  ? <img src={profile.avatar_url} className="w-full h-full object-cover" alt={profile.full_name} />
                  : <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-text-muted bg-gradient-to-br from-accent/20 to-purple-500/20">{profile.full_name?.[0]?.toUpperCase()}</div>
                }
              </div>
              {profile.username && (
                <p className="text-[11px] text-text-muted font-medium">@{profile.username}</p>
              )}
            </div>

            {/* Right column: name, bio, stats, edit button */}
            <div className="flex-1 min-w-0">

              {/* Name row + Edit Profile */}
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  <h1 className="text-base font-bold text-text-primary leading-tight">{profile.full_name}</h1>
                  {isGold   && <Crown className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />}
                  {isSilver && <Crown className="w-3.5 h-3.5 text-gray-400  flex-shrink-0" />}
                  {profile.verification_status === 'verified' && <BadgeCheck className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />}
                  {profile.is_admin  && <Badge variant="accent">Admin</Badge>}
                  {(profile.is_alumni || (profile.graduation_year && profile.graduation_year <= new Date().getFullYear())) && <Badge variant="default">Alumni</Badge>}
                </div>
                <button
                  onClick={() => onEditProfile ? onEditProfile() : navigate('/settings')}
                  className="flex-shrink-0 flex items-center gap-1 text-xs font-medium border border-surface-border text-text-secondary hover:bg-surface-hover px-2.5 py-1.5 rounded-xl transition-all"
                >
                  <Settings className="w-3 h-3" /> Edit Profile
                </button>
              </div>

              {/* Bio */}
              {profile.bio && (
                <p className="text-xs text-text-secondary leading-relaxed mb-2">{profile.bio}</p>
              )}
              {profile.website && (
                <a href={profile.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-accent text-xs hover:underline mb-2">
                  <Link2 className="w-3 h-3" />{profile.website.replace(/^https?:\/\//, '')}
                </a>
              )}

              {/* Inline stats — Posts + Connections only */}
              <div className="flex items-center gap-4 mt-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-bold text-text-primary tabular-nums">{stats.posts}</span>
                  <span className="text-xs text-text-muted">posts</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-bold text-text-primary tabular-nums">{stats.connections}</span>
                  <span className="text-xs text-text-muted">connections</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab bar (scrollable, border-bottom style) ── */}
      <div className="border-b border-surface-border -mb-px mt-6 overflow-x-auto scrollbar-hide">
        <div className="flex min-w-max">
          {tabs.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'flex items-center gap-1.5 px-5 py-3 text-[11px] font-semibold tracking-widest uppercase whitespace-nowrap border-b-2 -mb-px transition-colors',
                activeTab === key
                  ? 'border-text-primary text-text-primary'
                  : 'border-transparent text-text-muted hover:text-text-secondary'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="mt-4 space-y-4">

        {/* About */}
        {activeTab === 'about' && (
          <Card>
            <h2 className="font-semibold text-text-primary mb-4">Academic Info</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {(profile.university_name || (profile as any).university?.name) && (
                <div className="flex items-start gap-2.5">
                  <Building2 className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-text-muted text-xs">University</p>
                    <p className="text-text-primary font-medium">{profile.university_name ?? (profile as any).university?.name}</p>
                  </div>
                </div>
              )}
              {profile.degree && (
                <div className="flex items-start gap-2.5">
                  <GraduationCap className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-text-muted text-xs">Degree</p>
                    <p className="text-text-primary font-medium">{profile.degree}</p>
                  </div>
                </div>
              )}
              {profile.major && (
                <div className="flex items-start gap-2.5">
                  <BookOpen className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-text-muted text-xs">Major</p>
                    <p className="text-text-primary font-medium">{profile.major}</p>
                  </div>
                </div>
              )}
              {profile.enrollment_year && (
                <div className="flex items-start gap-2.5">
                  <Calendar className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-text-muted text-xs">Enrollment</p>
                    <p className="text-text-primary font-medium">{profile.enrollment_year}</p>
                  </div>
                </div>
              )}
              {profile.graduation_year && (
                <div className="flex items-start gap-2.5">
                  <Calendar className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-text-muted text-xs">Graduation</p>
                    <p className="text-text-primary font-medium">{profile.graduation_year}</p>
                  </div>
                </div>
              )}
              {profile.dob && (
                <div className="flex items-start gap-2.5">
                  <Calendar className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-text-muted text-xs">Date of Birth</p>
                    <p className="text-text-primary font-medium">{formatDate(profile.dob)}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-text-muted text-xs">Member since</p>
                  <p className="text-text-primary font-medium">{formatDate(profile.created_at)}</p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Posts */}
        {activeTab === 'posts' && (
          tabLoading ? (
            [1, 2, 3].map(i => <Card key={i} className="animate-pulse"><div className="h-4 bg-surface-hover rounded-full w-1/3 mb-2" /><div className="h-16 bg-surface-hover rounded-2xl" /></Card>)
          ) : posts.length === 0 ? (
            <Card className="text-center py-16">
              <LayoutGrid className="w-8 h-8 text-text-muted mx-auto mb-3" />
              <p className="text-text-secondary font-medium">No posts yet</p>
              <p className="text-text-muted text-sm mt-1">Share something with the community!</p>
            </Card>
          ) : posts.map(post => <PostCard key={post.id} post={post} />)
        )}

        {/* Reposts */}
        {activeTab === 'reposts' && (
          tabLoading ? (
            <div className="grid grid-cols-3 gap-0.5">
              {[1,2,3,4,5,6].map(i => <div key={i} className="aspect-square bg-surface-hover animate-pulse" />)}
            </div>
          ) : reposts.length === 0 ? (
            <Card className="text-center py-16">
              <Repeat2 className="w-8 h-8 text-text-muted mx-auto mb-3" />
              <p className="text-text-secondary font-medium">No reposts yet</p>
              <p className="text-text-muted text-sm mt-1">Reposts you make will appear here.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-3 gap-0.5 rounded-2xl overflow-hidden border border-surface-border">
              {reposts.map(item => <GridCell key={item.id} item={item} />)}
            </div>
          )
        )}

        {/* Saved */}
        {activeTab === 'saved' && (
          tabLoading ? (
            <div className="grid grid-cols-3 gap-0.5">
              {[1,2,3,4,5,6].map(i => <div key={i} className="aspect-square bg-surface-hover animate-pulse" />)}
            </div>
          ) : savedPosts.length === 0 ? (
            <Card className="text-center py-16">
              <Bookmark className="w-8 h-8 text-text-muted mx-auto mb-3" />
              <p className="text-text-secondary font-medium">No saved posts</p>
              <p className="text-text-muted text-sm mt-1">Bookmark posts from the home feed to find them here.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-3 gap-0.5 rounded-2xl overflow-hidden border border-surface-border">
              {savedPosts.map(item => <GridCell key={item.id} item={item} isSaved />)}
            </div>
          )
        )}

        {/* Tagged */}
        {activeTab === 'tagged' && (
          tabLoading ? (
            <div className="grid grid-cols-3 gap-0.5">
              {[1,2,3,4,5,6].map(i => <div key={i} className="aspect-square bg-surface-hover animate-pulse" />)}
            </div>
          ) : taggedPosts.length === 0 ? (
            <Card className="text-center py-16">
              <Tag className="w-8 h-8 text-text-muted mx-auto mb-3" />
              <p className="text-text-secondary font-medium">No tagged posts</p>
              <p className="text-text-muted text-sm mt-1">Posts where friends tag you will appear here.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-3 gap-0.5 rounded-2xl overflow-hidden border border-surface-border">
              {taggedPosts.map(item => <GridCell key={item.id} item={item} />)}
            </div>
          )
        )}

        {/* Archive */}
        {activeTab === 'archived' && (
          tabLoading ? (
            [1, 2, 3].map(i => <Card key={i} className="animate-pulse"><div className="h-4 bg-surface-hover rounded-full w-1/3 mb-2" /><div className="h-16 bg-surface-hover rounded-2xl" /></Card>)
          ) : archivedPosts.length === 0 ? (
            <Card className="text-center py-16">
              <Archive className="w-8 h-8 text-text-muted mx-auto mb-3" />
              <p className="text-text-secondary font-medium">No archived posts</p>
              <p className="text-text-muted text-sm mt-1">Archived posts are only visible to you.</p>
            </Card>
          ) : archivedPosts.map(post => <PostCard key={post.id} post={post} archived />)
        )}

        {/* Listings */}
        {activeTab === 'listings' && (
          <div className="grid grid-cols-2 gap-4">
            {tabLoading ? (
              [1, 2].map(i => <Card key={i} className="animate-pulse"><div className="aspect-video bg-surface-hover rounded-2xl mb-3" /><div className="h-4 bg-surface-hover rounded-full w-3/4 mb-2" /></Card>)
            ) : listings.length === 0 ? (
              <div className="col-span-2">
                <Card className="text-center py-16">
                  <ShoppingBag className="w-8 h-8 text-text-muted mx-auto mb-3" />
                  <p className="text-text-secondary font-medium">No listings yet</p>
                  <p className="text-text-muted text-sm mt-1">Head to MarketSpot to list something!</p>
                </Card>
              </div>
            ) : listings.map(listing => (
              <Card key={listing.id} padding="none" className="overflow-hidden">
                <div className="aspect-video bg-surface-hover relative">
                  {listing.images && listing.images.length > 0 ? (
                    <img src={listing.images[0]} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-8 h-8 text-surface-border" /></div>
                  )}
                  <div className="absolute top-2 left-2">
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full',
                      listing.listing_type === 'sell' ? 'bg-green-500/20 text-green-600 dark:text-green-400' :
                      listing.listing_type === 'rent' ? 'bg-accent/20 text-accent' : 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                    )}>{TYPE_LABEL[listing.listing_type]}</span>
                  </div>
                  <div className="absolute top-2 right-2">
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', listing.status === 'active' ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-surface text-text-muted')}>
                      {listing.status === 'active' ? 'Active' : listing.status}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-text-primary text-sm truncate">{listing.title}</h3>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-bold text-[#10B981] text-sm">{formatPrice(listing.price)}</span>
                    {listing.condition && <span className="text-xs text-text-muted">{CONDITION_LABEL[listing.condition] ?? listing.condition}</span>}
                  </div>
                  <p className="text-xs text-text-muted mt-2">{timeAgo(listing.created_at)}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
