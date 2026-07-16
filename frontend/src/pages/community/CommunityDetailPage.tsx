import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Globe, Lock, Users, Send, MessageCircle, Heart, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Textarea } from '../../components/ui/Textarea'
import { cn, timeAgo } from '../../lib/utils'
import toast from 'react-hot-toast'

interface CommunityPost {
  id: string
  community_id: string
  user_id: string
  content: string
  likes_count: number
  comments_count: number
  created_at: string
  liked_by_me?: boolean
  author: {
    id: string
    full_name: string
    avatar_url: string | null
    username: string | null
  }
}

interface PostComment {
  id: string
  content: string
  created_at: string
  author: {
    id: string
    full_name: string
    avatar_url: string | null
    username: string | null
  }
}

interface Community {
  id: string
  name: string
  description: string | null
  is_private: boolean
  member_count: number
  avatar_image: string | null
  creator_id: string
}

export function CommunityDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [community, setCommunity] = useState<Community | null>(null)
  const [_memberRole, setMemberRole] = useState<string | null>(null)
  const [memberStatus, setMemberStatus] = useState<string | null>(null)
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [loading, setLoading] = useState(true)
  const [postContent, setPostContent] = useState('')
  const [submittingPost, setSubmittingPost] = useState(false)
  const [requestingJoin, setRequestingJoin] = useState(false)

  useEffect(() => {
    if (id && user) {
      fetchCommunity()
      fetchMembership()
    }
  }, [id, user?.id])

  useEffect(() => {
    if (community && (memberStatus === 'active' || !community.is_private)) {
      fetchPosts()
    } else if (community && community.is_private && memberStatus !== 'active') {
      setLoading(false)
    }
  }, [community, memberStatus])

  async function fetchCommunity() {
    const { data } = await supabase
      .from('communities')
      .select('*')
      .eq('id', id)
      .single()
    if (data) setCommunity(data)
  }

  async function fetchMembership() {
    if (!user || !id) return
    const { data } = await supabase
      .from('community_members')
      .select('role, status')
      .eq('community_id', id)
      .eq('user_id', user.id)
      .single()
    if (data) {
      setMemberRole(data.role)
      setMemberStatus(data.status)
    } else {
      setMemberRole(null)
      setMemberStatus(null)
    }
  }

  async function fetchPosts() {
    setLoading(true)
    const { data } = await supabase
      .from('community_posts')
      .select(`
        *,
        author:profiles!community_posts_user_id_fkey(id, full_name, avatar_url, username),
        liked_by_me:community_post_likes!left(user_id)
      `)
      .eq('community_id', id)
      .eq('is_flagged', false)
      .order('created_at', { ascending: false })
      .limit(50)

    if (data) {
      const formatted = data.map((p: any) => ({
        ...p,
        liked_by_me: Array.isArray(p.liked_by_me)
          ? p.liked_by_me.some((l: any) => l.user_id === user?.id)
          : false,
      }))
      setPosts(formatted)
    }
    setLoading(false)
  }

  async function submitPost() {
    if (!postContent.trim() || !user || !id) return
    setSubmittingPost(true)
    const { error } = await supabase.from('community_posts').insert({
      community_id: id,
      user_id: user.id,
      content: postContent.trim(),
    })
    if (error) toast.error('Failed to post')
    else {
      setPostContent('')
      fetchPosts()
    }
    setSubmittingPost(false)
  }

  async function requestJoin() {
    if (!user || !community) return
    setRequestingJoin(true)
    const { error } = await supabase.from('community_members').insert({
      community_id: community.id,
      user_id: user.id,
      status: community.is_private ? 'pending' : 'active',
    })
    if (error) toast.error('Already requested or joined')
    else {
      toast.success(community.is_private ? 'Join request sent!' : 'Joined successfully!')
      fetchMembership()
      if (!community.is_private) fetchPosts()
    }
    setRequestingJoin(false)
  }

  const isMember = memberStatus === 'active'
  const isPending = memberStatus === 'pending'
  const canPost = isMember
  const canSeeContent = isMember || !community?.is_private

  if (!community && !loading) {
    return (
      <div className="text-center py-20">
        <p className="text-text-muted">Community not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/community')}>
          Back to Communities
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/community')}
          className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        {community ? (
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">
              {community.avatar_image
                ? <img src={community.avatar_image} className="w-full h-full object-cover" alt="" />
                : <span>{community.name[0]}</span>
              }
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-text-primary truncate">{community.name}</h1>
                {community.is_private
                  ? <Lock className="w-4 h-4 text-text-muted flex-shrink-0" />
                  : <Globe className="w-4 h-4 text-text-muted flex-shrink-0" />
                }
                {isMember && <Badge variant="success" size="sm">Member</Badge>}
                {isPending && <Badge variant="warning" size="sm">Pending</Badge>}
              </div>
              <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
                <Users className="w-3.5 h-3.5" />
                <span>{community.member_count} member{community.member_count !== 1 ? 's' : ''}</span>
                {community.description && (
                  <>
                    <span>·</span>
                    <span className="truncate">{community.description}</span>
                  </>
                )}
              </div>
            </div>
            {!isMember && !isPending && (
              <Button size="sm" onClick={requestJoin} loading={requestingJoin}>
                {community.is_private ? 'Request to Join' : 'Join'}
              </Button>
            )}
          </div>
        ) : (
          <div className="h-8 bg-surface-hover rounded-full w-48 animate-pulse" />
        )}
      </div>

      {/* Private community — non-member wall */}
      {community?.is_private && !isMember && (
        <Card className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-surface-hover flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-text-muted" />
          </div>
          <h2 className="text-lg font-semibold text-text-primary mb-2">Private Community</h2>
          {isPending ? (
            <>
              <div className="flex items-center justify-center gap-2 text-yellow-500 mb-2">
                <Clock className="w-4 h-4" />
                <p className="text-sm font-medium">Request pending approval</p>
              </div>
              <p className="text-text-muted text-sm">An admin will review your request soon.</p>
            </>
          ) : (
            <>
              <p className="text-text-muted text-sm mb-4">Request to join to see posts and participate.</p>
              <Button onClick={requestJoin} loading={requestingJoin}>Request to Join</Button>
            </>
          )}
        </Card>
      )}

      {/* Public community — non-member join banner */}
      {community && !community.is_private && !isMember && (
        <div className="flex items-center justify-between px-4 py-3 bg-accent/10 border border-accent/20 rounded-2xl">
          <p className="text-sm text-text-secondary">Join this community to post and comment</p>
          <Button size="sm" onClick={requestJoin} loading={requestingJoin}>Join</Button>
        </div>
      )}

      {/* Post composer — members only */}
      {canPost && (
        <Card>
          <Textarea
            placeholder="Share something with the community…"
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end mt-3">
            <Button
              size="sm"
              onClick={submitPost}
              loading={submittingPost}
              disabled={!postContent.trim()}
            >
              <Send className="w-4 h-4" />
              Post
            </Button>
          </div>
        </Card>
      )}

      {/* Posts feed */}
      {canSeeContent && (
        loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-full bg-surface-hover" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-surface-hover rounded-full w-1/3" />
                    <div className="h-12 bg-surface-hover rounded-2xl mt-2" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <Card className="text-center py-16">
            <MessageCircle className="w-10 h-10 text-text-muted mx-auto mb-3" />
            <p className="text-text-secondary font-medium">No posts yet</p>
            {isMember && <p className="text-text-muted text-sm mt-1">Be the first to post something!</p>}
          </Card>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <CommunityPostCard
                key={post.id}
                post={post}
                currentUserId={user?.id}
                canComment={canPost}
                onLikeChange={(postId, delta) => {
                  setPosts((prev) => prev.map((p) =>
                    p.id === postId
                      ? { ...p, liked_by_me: !p.liked_by_me, likes_count: p.likes_count + delta }
                      : p
                  ))
                }}
              />
            ))}
          </div>
        )
      )}
    </div>
  )
}

function CommunityPostCard({
  post,
  currentUserId,
  canComment,
  onLikeChange,
}: {
  post: CommunityPost
  currentUserId?: string
  canComment: boolean
  onLikeChange: (postId: string, delta: number) => void
}) {
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<PostComment[]>([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [localCommentsCount, setLocalCommentsCount] = useState(post.comments_count ?? 0)

  async function loadComments() {
    setLoadingComments(true)
    const { data } = await supabase
      .from('community_post_comments')
      .select('*, author:profiles!community_post_comments_user_id_fkey(id, full_name, avatar_url, username)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true })
    setComments(data ?? [])
    setLoadingComments(false)
  }

  function toggleComments() {
    if (!showComments && comments.length === 0) loadComments()
    setShowComments((v) => !v)
  }

  async function submitComment() {
    if (!commentText.trim() || !currentUserId) return
    setSubmittingComment(true)
    const { data, error } = await supabase
      .from('community_post_comments')
      .insert({ post_id: post.id, user_id: currentUserId, content: commentText.trim() })
      .select('*, author:profiles!community_post_comments_user_id_fkey(id, full_name, avatar_url, username)')
      .single()
    if (!error && data) {
      setComments((prev) => [...prev, data])
      setLocalCommentsCount((c) => c + 1)
      setCommentText('')
    }
    setSubmittingComment(false)
  }

  async function toggleLike() {
    if (!currentUserId) return
    if (post.liked_by_me) {
      await supabase.from('community_post_likes').delete()
        .eq('post_id', post.id).eq('user_id', currentUserId)
      onLikeChange(post.id, -1)
    } else {
      await supabase.from('community_post_likes').insert({ post_id: post.id, user_id: currentUserId })
      onLikeChange(post.id, 1)
    }
  }

  return (
    <Card className="group">
      {/* Author */}
      <div className="flex items-start gap-3 mb-3">
        <Avatar src={post.author?.avatar_url} name={post.author?.full_name ?? 'Unknown'} />
        <div className="flex-1">
          <p className="font-semibold text-text-primary text-sm">{post.author?.full_name ?? 'Unknown'}</p>
          <p className="text-xs text-text-muted">
            @{post.author?.username ?? '—'} · {timeAgo(post.created_at)}
          </p>
        </div>
      </div>

      {/* Content */}
      <p className="text-text-primary text-sm leading-relaxed mb-3 whitespace-pre-wrap">{post.content}</p>

      {/* Actions */}
      <div className="flex items-center gap-1 pt-2 border-t border-surface-border">
        <button
          onClick={toggleLike}
          disabled={!currentUserId}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm transition-colors',
            post.liked_by_me
              ? 'text-[#FF6B9D]'
              : 'text-text-muted hover:text-[#FF6B9D] hover:bg-surface-hover disabled:cursor-not-allowed'
          )}
        >
          <Heart className={cn('w-4 h-4', post.liked_by_me && 'fill-current')} />
          {post.likes_count > 0 && post.likes_count}
        </button>

        <button
          onClick={toggleComments}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm transition-colors',
            showComments
              ? 'text-accent bg-accent-subtle'
              : 'text-text-muted hover:text-text-primary hover:bg-surface-hover'
          )}
        >
          <MessageCircle className="w-4 h-4" />
          {localCommentsCount > 0 && localCommentsCount}
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="mt-3 pt-3 border-t border-surface-border space-y-3">
          {loadingComments ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
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
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2">
                  <Avatar src={c.author?.avatar_url} name={c.author?.full_name} size="xs" />
                  <div className="flex-1 bg-surface-hover rounded-2xl px-3 py-2">
                    <p className="text-xs font-semibold text-text-primary">
                      {c.author?.full_name ?? 'Unknown'}
                      <span className="font-normal text-text-muted ml-1.5">{timeAgo(c.created_at)}</span>
                    </p>
                    <p className="text-sm text-text-secondary mt-0.5 whitespace-pre-wrap">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {canComment && (
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 bg-surface-hover rounded-2xl px-3 py-2">
                <input
                  type="text"
                  placeholder="Write a comment…"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment() } }}
                  className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
                />
                <button
                  onClick={submitComment}
                  disabled={!commentText.trim() || submittingComment}
                  className="text-accent hover:text-accent-hover disabled:opacity-40 transition-colors flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
