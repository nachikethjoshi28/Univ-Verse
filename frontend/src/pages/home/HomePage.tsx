import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Image, Send, Heart, MessageCircle, Bookmark, MoreHorizontal, Flag,
  Crown, Repeat2, Share2, Pencil, Trash2, X, Search, Plus,
  MapPin, Music, Tag, ChevronDown, BadgeCheck, GraduationCap,
} from 'lucide-react'
import { createPortal } from 'react-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import type { Post, Profile } from '../../types'
import { Card } from '../../components/ui/Card'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { cn, timeAgo } from '../../lib/utils'
import { NewsPanel } from '../../components/home/NewsPanel'
import { TextPostImage } from '../../components/home/TextPostImage'
import { CropModal } from '../../components/ui/CropModal'
import toast from 'react-hot-toast'
import { useDropzone } from 'react-dropzone'

const GREETINGS = [
  { word: 'Welcome', lang: 'en' },
  { word: 'Hola', lang: 'es' },
  { word: 'Namaste', lang: 'hi' },
  { word: 'Bonjour', lang: 'fr' },
  { word: 'Ciao', lang: 'it' },
  { word: 'Konnichiwa', lang: 'ja' },
  { word: 'Olá', lang: 'pt' },
  { word: 'Annyeong', lang: 'ko' },
  { word: 'Marhaba', lang: 'ar' },
]

export function HomePage() {
  const { user, profile } = useAuth()
  const [posts, setPosts]               = useState<Post[]>([])
  const [loading, setLoading]           = useState(true)
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set())
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingPost, setEditingPost]   = useState<Post | null>(null)
  const [sharingPost, setSharingPost]   = useState<Post | null>(null)

  const [showNews, setShowNews] = useState(true)

  useEffect(() => {
    if (user?.id) {
      const val = localStorage.getItem(`uv:show-news:${user.id}`)
      setShowNews(val === null || val === 'true')
    }
  }, [user?.id])

  const [greetingIdx, setGreetingIdx] = useState(() => Math.floor(Math.random() * GREETINGS.length))
  useEffect(() => {
    const id = setInterval(() => setGreetingIdx((i) => (i + 1) % GREETINGS.length), 4000)
    return () => clearInterval(id)
  }, [])
  const greeting = GREETINGS[greetingIdx]

  // Map: original_post_id → my repost post id (so we can toggle repost)
  const myReposts = useMemo(() => {
    const m = new Map<string, string>()
    posts.forEach(p => {
      if (p.user_id === user?.id && p.repost_of_id) m.set(p.repost_of_id, p.id)
    })
    return m
  }, [posts, user?.id])

  async function fetchPosts() {
    if (!user) return
    const myUniversityId = profile?.university_id ?? null
    // Don't use self-referential join for original_post — PostgREST silently returns null.
    // Fetch reposts separately below.
    const { data } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles!posts_user_id_fkey(id, full_name, avatar_url, username, verification_status, subscription_plan, university_id, is_alumni, graduation_year),
        liked_by_me:post_likes!left(user_id)
      `)
      .eq('is_flagged', false)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!data) { setLoading(false); return }

    // Client-side university filter (defense-in-depth alongside RLS)
    const sameUniData = myUniversityId
      ? data.filter((p: any) => p.user_id === user.id || p.author?.university_id === myUniversityId)
      : data.filter((p: any) => p.user_id === user.id)

    // Fetch original posts for all reposts with a normal (non-self-referential) query
    const repostOfIds = [...new Set(
      sameUniData.filter((p: any) => p.repost_of_id).map((p: any) => p.repost_of_id as string)
    )]
    const originalPostsMap: Record<string, any> = {}
    if (repostOfIds.length > 0) {
      const { data: originals } = await supabase
        .from('posts')
        .select(`
          id, user_id, content, media_urls, location, music_track, likes_count, comments_count, reposts_count, created_at, is_flagged,
          author:profiles!posts_user_id_fkey(id, full_name, avatar_url, username, verification_status, subscription_plan, university_id, is_alumni, graduation_year)
        `)
        .in('id', repostOfIds)
      // Filter originals to same university too
      const filteredOriginals = myUniversityId
        ? (originals ?? []).filter((o: any) => o.user_id === user.id || o.author?.university_id === myUniversityId)
        : (originals ?? []).filter((o: any) => o.user_id === user.id)
      filteredOriginals.forEach((o: any) => { originalPostsMap[o.id] = o })
    }

    // Single likes check for all post IDs (own + original)
    const allIds = Array.from(new Set(
      sameUniData.flatMap((p: any) => [p.id, p.repost_of_id].filter(Boolean))
    ))
    const { data: myLikes } = await supabase
      .from('post_likes').select('post_id')
      .eq('user_id', user.id).in('post_id', allIds)
    const likedSet = new Set((myLikes ?? []).map((l: any) => l.post_id))

    const formatted = sameUniData.map((p: any) => {
      const orig = p.repost_of_id ? originalPostsMap[p.repost_of_id] ?? null : null
      return {
        ...p,
        liked_by_me: likedSet.has(p.id),
        original_post: orig ? { ...orig, liked_by_me: likedSet.has(orig.id) } : null,
      }
    })
    setPosts(formatted.slice(0, 30))
    setLoading(false)
  }

  async function fetchSaved() {
    if (!user) return
    const { data } = await supabase.from('saved_posts').select('post_id').eq('user_id', user.id)
    if (data) setSavedPostIds(new Set(data.map((r: any) => r.post_id)))
  }

  useEffect(() => { fetchPosts(); fetchSaved() }, [user?.id, profile?.university_id])

  // Realtime
  useEffect(() => {
    if (!user) return
    const ch = supabase.channel('home-posts-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, () => fetchPosts())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, (payload) => {
        const u = payload.new as any
        setPosts(prev => prev.map(p =>
          p.id === u.id
            ? { ...p, likes_count: u.likes_count, comments_count: u.comments_count, reposts_count: u.reposts_count ?? p.reposts_count }
            : p.original_post?.id === u.id
              ? { ...p, original_post: { ...p.original_post!, likes_count: u.likes_count, comments_count: u.comments_count } }
              : p
        ))
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [user?.id])

  // ─── Post actions ─────────────────────────────────────────────────────────

  async function submitPost(
    content: string,
    mediaFiles: File[],
    taggedUserIds: string[],
    location: string,
    musicTrack: string,
  ) {
    if (!user) return
    let mediaUrls: string[] = []
    for (const file of mediaFiles) {
      const path = `posts/${user.id}/${Date.now()}-${file.name}`
      const { error: upErr } = await supabase.storage.from('media').upload(path, file)
      if (!upErr) {
        const { data } = supabase.storage.from('media').getPublicUrl(path)
        mediaUrls.push(data.publicUrl)
      }
    }
    const { data: postData, error } = await supabase.from('posts').insert({
      user_id: user.id,
      content: content.trim() || null,
      media_urls: mediaUrls.length ? mediaUrls : null,
      location: location.trim() || null,
      music_track: musicTrack.trim() || null,
    }).select('id').single()
    if (error || !postData) { toast.error('Failed to post'); return }
    if (taggedUserIds.length > 0) {
      await supabase.from('post_tags').insert(
        taggedUserIds.map(uid => ({ post_id: postData.id, tagged_user_id: uid, tagger_id: user.id }))
      )
    }
    toast.success('Posted!')
    fetchPosts()
  }

  async function handleEditSave(postId: string, newContent: string) {
    const { error } = await supabase.from('posts').update({ content: newContent.trim() || null }).eq('id', postId)
    if (error) { toast.error('Could not save'); return }
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, content: newContent.trim() || null } : p))
    setEditingPost(null)
    toast.success('Post updated')
  }

  async function handleDelete(postId: string) {
    const { error } = await supabase.from('posts').delete().eq('id', postId)
    if (error) { toast.error('Could not delete'); return }
    setPosts(prev => prev.filter(p => p.id !== postId))
    toast.success('Post deleted')
  }

  async function toggleLike(post: Post) {
    if (!user) return
    const liking = !post.liked_by_me
    // Optimistic update — applies whether the post is top-level or is the original inside a repost card
    setPosts(prev => prev.map(p => {
      if (p.id === post.id)
        return { ...p, liked_by_me: liking, likes_count: p.likes_count + (liking ? 1 : -1) }
      if (p.original_post?.id === post.id)
        return { ...p, original_post: { ...p.original_post!, liked_by_me: liking, likes_count: p.original_post!.likes_count + (liking ? 1 : -1) } }
      return p
    }))
    if (liking) {
      await supabase.from('post_likes').insert({ post_id: post.id, user_id: user.id })
      // Notification is created by DB trigger trg_notify_post_like
    } else {
      await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', user.id)
    }
  }

  async function toggleSave(postId: string) {
    if (!user) return
    const isSaved = savedPostIds.has(postId)
    if (isSaved) {
      await supabase.from('saved_posts').delete().eq('post_id', postId).eq('user_id', user.id)
      setSavedPostIds(prev => { const s = new Set(prev); s.delete(postId); return s })
    } else {
      await supabase.from('saved_posts').insert({ post_id: postId, user_id: user.id })
      setSavedPostIds(prev => new Set([...prev, postId]))
    }
  }

  async function reportPost(postId: string) {
    if (!user) return
    await supabase.from('reports').insert({ reporter_id: user.id, target_type: 'post', target_id: postId, reason: 'spam' })
    toast.success('Post reported. Our team will review it.')
  }

  async function handleRepost(post: Post) {
    if (!user) return
    const myRepostId = myReposts.get(post.id)
    if (myRepostId) {
      // Un-repost
      await supabase.from('posts').delete().eq('id', myRepostId)
      setPosts(prev => prev
        .filter(p => p.id !== myRepostId)
        .map(p => p.id === post.id ? { ...p, reposts_count: Math.max(0, (p.reposts_count ?? 0) - 1) } : p)
      )
      toast('Repost removed')
    } else {
      // Repost
      const { data, error } = await supabase.from('posts')
        .insert({ user_id: user.id, content: null, media_urls: null, repost_of_id: post.id })
        .select(`*, author:profiles!posts_user_id_fkey(id, full_name, avatar_url, username, verification_status, subscription_plan)`)
        .single()
      if (error || !data) { console.error('[repost error]', error); toast.error('Could not repost'); return }
      setPosts(prev => [
        { ...data, liked_by_me: false, reposts_count: data.reposts_count ?? 0, original_post: { ...post } },
        ...prev.map(p => p.id === post.id ? { ...p, reposts_count: (p.reposts_count ?? 0) + 1 } : p),
      ])
      // Notification is created by DB trigger trg_notify_post_repost
      toast.success('Reposted!')
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-[minmax(0,1fr)_300px] gap-6 items-start">

        {/* ── Main feed ── */}
        <div className="space-y-4 min-w-0">
          {/* Welcome banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-accent/20 via-accent/10 to-transparent border border-accent/20 px-6 py-5">
            <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-accent/10 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-accent-hover/10 blur-xl pointer-events-none" />
            <div className="relative flex items-center justify-between">
              <div>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span key={greetingIdx} className="text-xl font-bold text-accent animate-fade-in" style={{ animationDuration: '0.4s' }}>
                    {greeting.word},
                  </span>
                  <span className="text-xl font-bold text-text-primary">
                    @{profile?.username ?? profile?.full_name?.split(' ')[0] ?? 'friend'}
                  </span>
                </div>
                <p className="text-text-muted text-xs mt-1">
                  {profile?.university_name ? `${profile.university_name} · ` : ''}
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <div className="hidden sm:flex flex-col items-end gap-0.5">
                <span className="text-3xl">
                  {(() => { const h = new Date().getHours(); return h < 12 ? '🌅' : h < 17 ? '☀️' : h < 20 ? '🌇' : '🌙' })()}
                </span>
                <span className="text-[10px] text-text-muted">
                  {(() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' })()}
                </span>
              </div>
            </div>
          </div>

          {/* Feed */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-surface-hover" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-surface-hover rounded-full w-1/3" />
                      <div className="h-3 bg-surface-hover rounded-full w-1/5" />
                      <div className="h-16 bg-surface-hover rounded-2xl mt-3" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <Card className="text-center py-16">
              <p className="text-text-muted text-sm">No posts yet. Be the first to share something!</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {posts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={user?.id}
                  isSaved={savedPostIds.has(post.original_post?.id ?? post.id)}
                  repostedByMe={myReposts.has(post.original_post?.id ?? post.id)}
                  onLike={toggleLike}
                  onToggleSave={toggleSave}
                  onReport={reportPost}
                  onEdit={setEditingPost}
                  onDelete={handleDelete}
                  onRepost={handleRepost}
                  onShare={setSharingPost}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── News sidebar ── */}
        {showNews && (
          <div className="sticky top-8 h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
            <NewsPanel />
          </div>
        )}
      </div>

      {/* ── Floating action button ── */}
      <button
        onClick={() => setShowCreateModal(true)}
        style={{ zIndex: 25 }}
        className="fixed bottom-6 right-6 flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-4 py-3 rounded-2xl shadow-lg transition-all hover:scale-105 active:scale-95 font-semibold text-sm"
      >
        <Plus className="w-4 h-4" />
        New Post
      </button>

      {/* ── Modals ── */}
      {showCreateModal && (
        <CreatePostModal
          avatarUrl={profile?.avatar_url}
          fullName={profile?.full_name ?? 'U'}
          userId={user?.id ?? ''}
          onClose={() => setShowCreateModal(false)}
          onSubmit={submitPost}
        />
      )}
      {editingPost && (
        <EditPostModal
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onSave={handleEditSave}
        />
      )}
      {sharingPost && user && (
        <ShareModal
          post={sharingPost}
          currentUserId={user.id}
          onClose={() => setSharingPost(null)}
        />
      )}
    </div>
  )
}

// ─── CreatePostModal ──────────────────────────────────────────────────────────

type TaggableUser = { id: string; full_name: string; username: string | null; avatar_url: string | null }

function CreatePostModal({
  avatarUrl, fullName, userId, onClose, onSubmit,
}: {
  avatarUrl?: string | null
  fullName: string
  userId: string
  onClose: () => void
  onSubmit: (content: string, files: File[], taggedUserIds: string[], location: string, musicTrack: string) => Promise<void>
}) {
  const [content, setContent]         = useState('')
  const [mediaFiles, setMediaFiles]   = useState<File[]>([])
  const [submitting, setSubmitting]   = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [cropSrc, setCropSrc]         = useState<string | null>(null)
  const [cropQueue, setCropQueue]     = useState<File[]>([])

  // Tag panel
  const [showTagPanel, setShowTagPanel]     = useState(false)
  const [tagSearch, setTagSearch]           = useState('')
  const [tagResults, setTagResults]         = useState<TaggableUser[]>([])
  const [taggedUsers, setTaggedUsers]       = useState<TaggableUser[]>([])
  const tagSearchRef = useRef<HTMLInputElement>(null)

  // Location panel
  const [showLocationPanel, setShowLocationPanel] = useState(false)
  const [location, setLocation]                   = useState('')

  // Music panel
  const [showMusicPanel, setShowMusicPanel] = useState(false)
  const [musicTrack, setMusicTrack]         = useState('')

  useEffect(() => {
    textareaRef.current?.focus()
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape' && !cropSrc) onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [cropSrc])

  // Search connections for tagging
  useEffect(() => {
    if (!tagSearch.trim()) { setTagResults([]); return }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, allow_tagging')
        .ilike('full_name', `%${tagSearch}%`)
        .eq('allow_tagging', true)
        .neq('id', userId)
        .limit(8)
      setTagResults((data ?? []) as TaggableUser[])
    }, 250)
    return () => clearTimeout(t)
  }, [tagSearch, userId])

  function toggleTag(u: TaggableUser) {
    setTaggedUsers(prev => {
      const exists = prev.find(t => t.id === u.id)
      return exists ? prev.filter(t => t.id !== u.id) : [...prev, u]
    })
  }

  function queueFilesForCrop(files: File[]) {
    const allowed = 4 - mediaFiles.length
    const toProcess = files.filter(f => f.type.startsWith('image/')).slice(0, allowed)
    const videos    = files.filter(f => f.type.startsWith('video/')).slice(0, allowed - toProcess.length)
    if (videos.length) setMediaFiles(prev => [...prev, ...videos].slice(0, 4))
    if (toProcess.length === 0) return
    setCropQueue(toProcess.slice(1))
    setCropSrc(URL.createObjectURL(toProcess[0]))
  }

  function onCropDone(blob: Blob) {
    const file = new File([blob], `image_${Date.now()}.jpg`, { type: 'image/jpeg' })
    setMediaFiles(prev => [...prev, file].slice(0, 4))
    if (cropQueue.length > 0 && mediaFiles.length < 3) {
      const [next, ...rest] = cropQueue
      setCropQueue(rest)
      setCropSrc(URL.createObjectURL(next))
    } else {
      setCropSrc(null)
      setCropQueue([])
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [], 'video/*': [] },
    maxFiles: 4,
    onDrop: queueFilesForCrop,
  })

  async function handlePost() {
    if (!content.trim() && !mediaFiles.length) return
    setSubmitting(true)
    await onSubmit(content, mediaFiles, taggedUsers.map(u => u.id), location, musicTrack)
    setSubmitting(false)
    onClose()
  }

  function openTagPanel() {
    setShowTagPanel(true)
    setShowLocationPanel(false)
    setShowMusicPanel(false)
    setTimeout(() => tagSearchRef.current?.focus(), 50)
  }

  function openLocationPanel() {
    setShowLocationPanel(true)
    setShowTagPanel(false)
    setShowMusicPanel(false)
  }

  function openMusicPanel() {
    setShowMusicPanel(true)
    setShowTagPanel(false)
    setShowLocationPanel(false)
  }

  return (
    <>
      {cropSrc && (
        <CropModal
          src={cropSrc}
          title="Crop Image"
          onDone={onCropDone}
          onCancel={() => { setCropSrc(null); setCropQueue([]) }}
        />
      )}
      {createPortal(
      <div
        className="fixed inset-0 flex items-center justify-center p-4"
        style={{ zIndex: 50, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={e => { if (e.target === e.currentTarget) onClose() }}
      >
      <div className="bg-surface border border-surface-border rounded-3xl shadow-glass-dark w-full max-w-lg p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Avatar src={avatarUrl} name={fullName} size="sm" />
            <span className="font-semibold text-sm text-text-primary">{fullName}</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-text-muted hover:bg-surface-hover">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Text */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="What's on your mind?"
          rows={3}
          className="w-full bg-transparent text-text-primary placeholder:text-text-muted text-sm leading-relaxed resize-none outline-none"
        />

        {/* Tagged users chips */}
        {taggedUsers.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {taggedUsers.map(u => (
              <span key={u.id} className="inline-flex items-center gap-1 bg-accent/10 text-accent text-xs px-2 py-0.5 rounded-full">
                @{u.username ?? u.full_name}
                <button onClick={() => toggleTag(u)} className="hover:text-red-400"><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
        )}

        {/* Location badge */}
        {location.trim() && (
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <MapPin className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-text-primary">{location}</span>
            <button onClick={() => setLocation('')} className="ml-auto hover:text-red-400"><X className="w-3 h-3" /></button>
          </div>
        )}

        {/* Music badge */}
        {musicTrack.trim() && (
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <Music className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-text-primary">{musicTrack}</span>
            <button onClick={() => setMusicTrack('')} className="ml-auto hover:text-red-400"><X className="w-3 h-3" /></button>
          </div>
        )}

        {/* Tag panel */}
        {showTagPanel && (
          <div className="border border-surface-border rounded-2xl p-3 space-y-2">
            <div className="flex items-center gap-2 bg-surface-hover rounded-xl px-3 py-1.5">
              <Search className="w-3.5 h-3.5 text-text-muted shrink-0" />
              <input
                ref={tagSearchRef}
                value={tagSearch}
                onChange={e => setTagSearch(e.target.value)}
                placeholder="Search people to tag..."
                className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
              />
            </div>
            {tagResults.length > 0 && (
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {tagResults.map(u => {
                  const isTagged = taggedUsers.some(t => t.id === u.id)
                  return (
                    <button
                      key={u.id}
                      onClick={() => toggleTag(u)}
                      className={cn(
                        'w-full flex items-center gap-2 px-2 py-1.5 rounded-xl text-left transition-colors',
                        isTagged ? 'bg-accent/10' : 'hover:bg-surface-hover'
                      )}
                    >
                      <Avatar src={u.avatar_url} name={u.full_name} size="xs" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{u.full_name}</p>
                        {u.username && <p className="text-xs text-text-muted">@{u.username}</p>}
                      </div>
                      {isTagged && <Tag className="w-3.5 h-3.5 text-accent shrink-0" />}
                    </button>
                  )
                })}
              </div>
            )}
            {tagSearch.trim() && tagResults.length === 0 && (
              <p className="text-xs text-text-muted text-center py-1">No results</p>
            )}
            <button
              onClick={() => setShowTagPanel(false)}
              className="text-xs text-text-muted hover:text-text-primary flex items-center gap-1 ml-auto"
            >
              <ChevronDown className="w-3 h-3" /> Done
            </button>
          </div>
        )}

        {/* Location panel */}
        {showLocationPanel && (
          <div className="border border-surface-border rounded-2xl p-3 space-y-2">
            <div className="flex items-center gap-2 bg-surface-hover rounded-xl px-3 py-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <input
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="Add a location..."
                className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
                autoFocus
              />
              {location && (
                <button onClick={() => setLocation('')} className="text-text-muted hover:text-red-400">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowLocationPanel(false)}
              className="text-xs text-text-muted hover:text-text-primary flex items-center gap-1 ml-auto"
            >
              <ChevronDown className="w-3 h-3" /> Done
            </button>
          </div>
        )}

        {/* Music panel */}
        {showMusicPanel && (
          <div className="border border-surface-border rounded-2xl p-3 space-y-2">
            <div className="flex items-center gap-2 bg-surface-hover rounded-xl px-3 py-1.5">
              <Music className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <input
                value={musicTrack}
                onChange={e => setMusicTrack(e.target.value)}
                placeholder="Song name – Artist"
                className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
                autoFocus
              />
              {musicTrack && (
                <button onClick={() => setMusicTrack('')} className="text-text-muted hover:text-red-400">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowMusicPanel(false)}
              className="text-xs text-text-muted hover:text-text-primary flex items-center gap-1 ml-auto"
            >
              <ChevronDown className="w-3 h-3" /> Done
            </button>
          </div>
        )}

        {/* Media previews */}
        {mediaFiles.length > 0 && (
          <div className={cn('grid gap-2', mediaFiles.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
            {mediaFiles.map((f, i) => (
              <div key={i} className="relative rounded-2xl overflow-hidden bg-surface-hover aspect-video">
                <img src={URL.createObjectURL(f)} className="w-full h-full object-cover" alt="" />
                <button
                  onClick={() => setMediaFiles(prev => prev.filter((_, j) => j !== i))}
                  className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white hover:bg-black/80"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Dropzone */}
        {mediaFiles.length < 4 && (
          <div
            {...getRootProps()}
            className={cn(
              'border border-dashed border-surface-border rounded-2xl p-3 text-center text-sm text-text-muted cursor-pointer hover:border-accent/50 transition-colors',
              isDragActive && 'border-accent bg-accent/5'
            )}
          >
            <input {...getInputProps()} />
            <span className="flex items-center justify-center gap-2">
              <Image className="w-4 h-4" />
              {isDragActive ? 'Drop here' : 'Add photos / videos'}
            </span>
          </div>
        )}

        {/* Add-ons bar */}
        <div className="flex items-center gap-1 border-t border-surface-border pt-3">
          <span className="text-xs text-text-muted mr-1">Add:</span>
          <button
            onClick={openTagPanel}
            className={cn(
              'flex items-center gap-1 text-xs px-2.5 py-1 rounded-xl transition-colors',
              showTagPanel || taggedUsers.length > 0
                ? 'bg-accent/15 text-accent'
                : 'text-text-muted hover:bg-surface-hover hover:text-text-primary'
            )}
          >
            <Tag className="w-3.5 h-3.5" />
            Tag
            {taggedUsers.length > 0 && <span className="ml-0.5 font-semibold">({taggedUsers.length})</span>}
          </button>
          <button
            onClick={openLocationPanel}
            className={cn(
              'flex items-center gap-1 text-xs px-2.5 py-1 rounded-xl transition-colors',
              showLocationPanel || location.trim()
                ? 'bg-rose-500/15 text-rose-400'
                : 'text-text-muted hover:bg-surface-hover hover:text-text-primary'
            )}
          >
            <MapPin className="w-3.5 h-3.5" />
            Location
          </button>
          <button
            onClick={openMusicPanel}
            className={cn(
              'flex items-center gap-1 text-xs px-2.5 py-1 rounded-xl transition-colors',
              showMusicPanel || musicTrack.trim()
                ? 'bg-purple-500/15 text-purple-400'
                : 'text-text-muted hover:bg-surface-hover hover:text-text-primary'
            )}
          >
            <Music className="w-3.5 h-3.5" />
            Music
          </button>
          <div className="flex-1" />
          <Button onClick={handlePost} loading={submitting} disabled={!content.trim() && !mediaFiles.length} size="sm">
            <Send className="w-4 h-4" />
            Post
          </Button>
        </div>
      </div>
    </div>,
    document.body
    )}
    </>
  )
}

// ─── EditPostModal ────────────────────────────────────────────────────────────

function EditPostModal({ post, onClose, onSave }: {
  post: Post
  onClose: () => void
  onSave: (id: string, content: string) => Promise<void>
}) {
  const [content, setContent] = useState(post.content ?? '')
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  async function handleSave() {
    setSaving(true)
    await onSave(post.id, content)
    setSaving(false)
  }

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 50, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-surface border border-surface-border rounded-3xl shadow-glass-dark w-full max-w-lg p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-sm text-text-primary">Edit Post</p>
          <button onClick={onClose} className="p-1.5 rounded-xl text-text-muted hover:bg-surface-hover">
            <X className="w-4 h-4" />
          </button>
        </div>
        <textarea
          autoFocus
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={5}
          className="w-full bg-surface-hover rounded-2xl px-4 py-3 text-text-primary text-sm leading-relaxed resize-none outline-none"
        />
        {post.media_urls && post.media_urls.length > 0 && (
          <p className="text-xs text-text-muted">Media cannot be changed — delete and repost to update photos/videos.</p>
        )}
        <div className="flex justify-end gap-2 pt-1 border-t border-surface-border">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} loading={saving} disabled={!content.trim()}>Save</Button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── ShareModal ───────────────────────────────────────────────────────────────

function ShareModal({ post, currentUserId, onClose }: {
  post: Post
  currentUserId: string
  onClose: () => void
}) {
  const [friends, setFriends]   = useState<Profile[]>([])
  const [query, setQuery]       = useState('')
  const [sending, setSending]   = useState<string | null>(null)
  const [sent, setSent]         = useState<Set<string>>(new Set())

  useEffect(() => {
    async function load() {
      const { data: conns } = await supabase
        .from('connections')
        .select('requester_id, addressee_id')
        .or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`)
        .eq('status', 'accepted')
      if (!conns?.length) return
      const ids = conns.map((c: any) => c.requester_id === currentUserId ? c.addressee_id : c.requester_id)
      const { data: profiles } = await supabase
        .from('profiles').select('id, full_name, avatar_url, username')
        .in('id', ids)
      setFriends((profiles ?? []) as Profile[])
    }
    load()
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const filtered = friends.filter(f =>
    query.trim() === '' ||
    f.full_name.toLowerCase().includes(query.toLowerCase()) ||
    (f.username ?? '').toLowerCase().includes(query.toLowerCase())
  )

  // The "effective" post being shared (original if this is a repost wrapper)
  const sharePost = post.original_post ?? post

  async function sendToFriend(friend: Profile) {
    if (sending) return
    setSending(friend.id)
    const { data: convId, error } = await supabase.rpc('get_or_create_direct_conversation', {
      other_user_id: friend.id,
    })
    if (error || !convId) { toast.error('Could not open chat'); setSending(null); return }

    const preview = sharePost.content
      ? `"${sharePost.content.slice(0, 120)}${sharePost.content.length > 120 ? '…' : ''}"`
      : sharePost.media_urls?.length ? '[📷 Photo/Video]' : ''
    const msg = `📌 Shared a post from @${sharePost.author?.username ?? 'someone'}:\n${preview}`

    await supabase.from('messages').insert({
      conversation_id: convId,
      sender_id: currentUserId,
      content: msg,
    })
    setSent(prev => new Set([...prev, friend.id]))
    setSending(null)
    toast.success(`Sent to ${friend.full_name}`)
  }

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 50, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-surface border border-surface-border rounded-3xl shadow-glass-dark w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-sm text-text-primary">Send to friend</p>
          <button onClick={onClose} className="p-1.5 rounded-xl text-text-muted hover:bg-surface-hover">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Post preview */}
        <div className="bg-surface-hover rounded-2xl px-3 py-2 text-xs text-text-muted line-clamp-2">
          {sharePost.content ?? (sharePost.media_urls?.length ? '📷 Photo/Video post' : 'Post')}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-surface-hover rounded-2xl px-3 py-2">
          <Search className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Search friends…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
          />
        </div>

        {/* Friends list */}
        <div className="space-y-1 max-h-64 overflow-y-auto scrollbar-hide">
          {filtered.length === 0 && (
            <p className="text-xs text-text-muted text-center py-4">No friends found</p>
          )}
          {filtered.map(friend => (
            <button
              key={friend.id}
              onClick={() => sendToFriend(friend)}
              disabled={sending === friend.id || sent.has(friend.id)}
              className={cn(
                'flex items-center gap-3 w-full px-3 py-2 rounded-2xl text-left transition-colors',
                sent.has(friend.id)
                  ? 'opacity-60'
                  : 'hover:bg-surface-hover'
              )}
            >
              <Avatar src={friend.avatar_url} name={friend.full_name} size="xs" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{friend.full_name}</p>
                <p className="text-xs text-text-muted">@{friend.username}</p>
              </div>
              <span className="text-xs text-accent flex-shrink-0">
                {sent.has(friend.id) ? '✓ Sent' : sending === friend.id ? '…' : 'Send'}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── PostCard ─────────────────────────────────────────────────────────────────

function PostCard({
  post, currentUserId, isSaved, repostedByMe,
  onLike, onToggleSave, onReport, onEdit, onDelete, onRepost, onShare,
}: {
  post: Post
  currentUserId?: string
  isSaved: boolean
  repostedByMe: boolean
  onLike: (p: Post) => void
  onToggleSave: (id: string) => void
  onReport: (id: string) => void
  onEdit: (p: Post) => void
  onDelete: (id: string) => void
  onRepost: (p: Post) => void
  onShare: (p: Post) => void
}) {
  const navigate      = useNavigate()
  const isRepost      = !!post.repost_of_id
  // The effective post for actions (original if this is a repost wrapper)
  const effective    = isRepost && post.original_post ? post.original_post : post
  const isEffectiveOwn = effective.user_id === currentUserId

  return (
    <Card className="group relative">
      {/* Repost header */}
      {isRepost && (
        <div className="flex items-center gap-1.5 text-xs text-text-muted mb-3">
          <Repeat2 className="w-3.5 h-3.5 text-accent" />
          <span><span className="font-medium text-accent">{post.author?.full_name ?? 'Someone'}</span> reposted</span>
          <span className="ml-auto">{timeAgo(post.created_at)}</span>
        </div>
      )}

      {/* Author */}
      <div className="flex items-start justify-between mb-3">
        <button
          className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
          onClick={() => effective.author?.id && navigate(`/profile/${effective.author.id}`)}
        >
          <Avatar src={effective.author?.avatar_url} name={effective.author?.full_name ?? 'Unknown'} />
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-text-primary text-sm">{effective.author?.full_name ?? 'Unknown'}</span>
              {effective.author?.verification_status === 'verified' && (
                <BadgeCheck className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
              )}
              {(effective.author as any)?.is_alumni || ((effective.author as any)?.graduation_year && (effective.author as any).graduation_year <= new Date().getFullYear()) ? (
                <GraduationCap className="w-3.5 h-3.5 text-accent flex-shrink-0" />
              ) : null}
              {effective.author?.subscription_plan === 'gold'   && <Crown className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />}
              {effective.author?.subscription_plan === 'silver' && <Crown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
            </div>
            <p className="text-xs text-text-muted">
              @{effective.author?.username ?? '—'}{!isRepost && ` · ${timeAgo(post.created_at)}`}
            </p>
          </div>
        </button>

        {/* ⋯ menu */}
        <PostMenu
          isOwn={isEffectiveOwn}
          onEdit={isEffectiveOwn ? () => onEdit(effective) : undefined}
          onDelete={isEffectiveOwn ? () => onDelete(isRepost ? post.id : effective.id) : undefined}
          onReport={!isEffectiveOwn ? () => onReport(effective.id) : undefined}
        />
      </div>

      {/* Content — text-only posts become styled image cards */}
      {effective.content && (!effective.media_urls || effective.media_urls.length === 0) ? (
        <TextPostImage text={effective.content} />
      ) : (
        <>
          {effective.content && (
            <p className="text-text-primary text-sm leading-relaxed mb-3 whitespace-pre-wrap">{effective.content}</p>
          )}
          {effective.media_urls && effective.media_urls.length > 0 && (
            <div className={cn('grid gap-2 mb-3', effective.media_urls.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
              {effective.media_urls.map((url, i) => (
                <img key={i} src={url} alt="" className="rounded-2xl w-full object-cover max-h-80" />
              ))}
            </div>
          )}
        </>
      )}

      {/* Location & Music metadata */}
      {(effective.location || effective.music_track) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-xs text-text-muted">
          {effective.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-rose-400" />
              {effective.location}
            </span>
          )}
          {effective.music_track && (
            <span className="flex items-center gap-1">
              <Music className="w-3 h-3 text-purple-400" />
              {effective.music_track}
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 pt-2 border-t border-surface-border">
        {/* Like */}
        <button
          onClick={() => onLike(effective)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm transition-colors',
            effective.liked_by_me ? 'text-[#FF6B9D]' : 'text-text-muted hover:text-[#FF6B9D] hover:bg-surface-hover'
          )}
        >
          <Heart className={cn('w-4 h-4', effective.liked_by_me && 'fill-current')} />
          {(effective.likes_count ?? 0) > 0 && effective.likes_count}
        </button>

        {/* Comment */}
        <CommentSection post={effective} currentUserId={currentUserId} />

        {/* Repost */}
        <button
          onClick={() => onRepost(effective)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm transition-colors',
            repostedByMe ? 'text-accent' : 'text-text-muted hover:text-accent hover:bg-surface-hover'
          )}
          title={repostedByMe ? 'Remove repost' : 'Repost'}
        >
          <Repeat2 className="w-4 h-4" />
          {(effective.reposts_count ?? 0) > 0 && effective.reposts_count}
        </button>

        {/* Share */}
        <button
          onClick={() => onShare(effective)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm text-text-muted hover:text-accent hover:bg-surface-hover transition-colors"
          title="Send to friend"
        >
          <Share2 className="w-4 h-4" />
        </button>

        {/* Save */}
        <button
          onClick={() => onToggleSave(effective.id)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm transition-colors ml-auto',
            isSaved ? 'text-accent' : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
          )}
        >
          <Bookmark className={cn('w-4 h-4', isSaved && 'fill-current')} />
        </button>
      </div>
    </Card>
  )
}

// ─── PostMenu ─────────────────────────────────────────────────────────────────

function PostMenu({ onEdit, onDelete, onReport }: {
  isOwn?: boolean
  onEdit?: () => void
  onDelete?: () => void
  onReport?: () => void
}) {
  const [open, setOpen]             = useState(false)
  const [confirmDelete, setConfirm] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setConfirm(false) }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(v => !v); setConfirm(false) }}
        className="p-1.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-hover opacity-0 group-hover:opacity-100 transition-all"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 bg-surface border border-surface-border rounded-2xl shadow-glass-dark py-1.5 z-10 min-w-[160px]">
          {onEdit && (
            <button
              onClick={() => { onEdit(); setOpen(false) }}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-text-secondary hover:bg-surface-hover"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit post
            </button>
          )}
          {onDelete && !confirmDelete && (
            <button
              onClick={() => setConfirm(true)}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-400 hover:bg-surface-hover"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete post
            </button>
          )}
          {onDelete && confirmDelete && (
            <div className="px-4 py-2 space-y-1.5">
              <p className="text-xs text-text-secondary">Delete this post?</p>
              <div className="flex gap-2">
                <button onClick={() => { onDelete?.(); setOpen(false) }} className="text-xs font-semibold text-red-400 hover:text-red-300">Delete</button>
                <button onClick={() => setConfirm(false)} className="text-xs text-text-muted">Cancel</button>
              </div>
            </div>
          )}
          {onReport && (
            <button
              onClick={() => { onReport(); setOpen(false) }}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-text-secondary hover:bg-surface-hover"
            >
              <Flag className="w-3.5 h-3.5" /> Report post
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── CommentSection ───────────────────────────────────────────────────────────

function CommentSection({ post, currentUserId }: {
  post: Post
  currentUserId?: string
}) {
  const [open, setOpen]             = useState(false)
  const [comments, setComments]     = useState<any[]>([])
  const [loading, setLoading]       = useState(false)
  const [text, setText]             = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [count, setCount]           = useState(post.comments_count)

  useEffect(() => { setCount(post.comments_count) }, [post.comments_count])

  async function loadComments() {
    setLoading(true)
    const { data } = await supabase
      .from('post_comments')
      .select('*, author:profiles!post_comments_user_id_fkey(id, full_name, avatar_url, username, subscription_plan)')
      .eq('post_id', post.id).order('created_at', { ascending: true })
    setComments(data ?? [])
    setLoading(false)
  }

  function toggle() {
    if (!open && !comments.length) loadComments()
    setOpen(v => !v)
  }

  useEffect(() => {
    if (!open) return
    const ch = supabase.channel(`comments-rt-${post.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post_comments', filter: `post_id=eq.${post.id}` },
        async (payload) => {
          const { data } = await supabase
            .from('post_comments')
            .select('*, author:profiles!post_comments_user_id_fkey(id, full_name, avatar_url, username, subscription_plan)')
            .eq('id', (payload.new as any).id).single()
          if (data) {
            setComments(prev => prev.find(c => c.id === data.id) ? prev : [...prev, data])
            if (data.user_id !== currentUserId) setCount(c => c + 1)
          }
        })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [open, post.id])

  async function submit() {
    if (!text.trim() || !currentUserId) return
    setSubmitting(true)
    const trimmed = text.trim()
    const { data, error } = await supabase
      .from('post_comments')
      .insert({ post_id: post.id, user_id: currentUserId, content: trimmed })
      .select('*, author:profiles!post_comments_user_id_fkey(id, full_name, avatar_url, username, subscription_plan)')
      .single()
    if (!error && data) {
      setComments(prev => prev.find(c => c.id === data.id) ? prev : [...prev, data])
      setCount(c => c + 1)
      setText('')
      // Notification is created by DB trigger trg_notify_post_comment
    }
    setSubmitting(false)
  }

  return (
    <>
      <button
        onClick={toggle}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm transition-colors',
          open ? 'text-accent bg-accent/10' : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
        )}
      >
        <MessageCircle className="w-4 h-4" />
        {count > 0 && count}
      </button>

      {open && (
        <div className="col-span-full mt-3 pt-3 border-t border-surface-border space-y-3 w-full">
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map(i => (
                <div key={i} className="flex gap-2 animate-pulse">
                  <div className="w-7 h-7 rounded-full bg-surface-hover flex-shrink-0" />
                  <div className="flex-1 h-8 bg-surface-hover rounded-xl" />
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-2">No comments yet. Be first!</p>
          ) : (
            <div className="space-y-2">
              {comments.map(c => (
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
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-surface-hover rounded-2xl px-3 py-2">
              <input
                type="text"
                placeholder="Write a comment…"
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
                className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
              />
              <button
                onClick={submit}
                disabled={!text.trim() || submitting}
                className="text-accent hover:text-accent-hover disabled:opacity-40 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
