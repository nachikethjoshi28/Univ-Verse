import { useState, useEffect, useRef } from 'react'
import { Send, Search, MessageCircle, UserPlus, ShoppingBag, Users, Image, X, Check, Lock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { deriveSharedKey, encryptMsg, decryptMsg } from '../../lib/e2e'
import type { E2EKeyPair } from '../../lib/e2e'
import type { Message, Profile } from '../../types'
import { Avatar } from '../../components/ui/Avatar'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { cn } from '../../lib/utils'
import toast from 'react-hot-toast'

interface Friend { profile: Profile }
interface MarketplaceConv { conversationId: string; listingTitle: string | null; createdAt: string }
interface SearchResult { profile: Profile; connStatus: 'none' | 'pending_sent' | 'pending_received' | 'connected' }
interface ActiveChat {
  conversationId: string
  type: 'direct' | 'marketplace'
  otherUser: Profile | null
  listingTitle: string | null
}

function Ticks({ isRead }: { isRead: boolean }) {
  return (
    <span className={cn('inline-flex -space-x-1.5 flex-shrink-0', isRead ? 'text-blue-400' : 'text-white/50')}>
      <Check className="w-3 h-3" strokeWidth={3} />
      <Check className="w-3 h-3" strokeWidth={3} />
    </span>
  )
}

export function ChatsPage() {
  const { user, profile: myProfile, e2eKeyPair } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [friends, setFriends] = useState<Friend[]>([])
  const [marketplaceConvs, setMarketplaceConvs] = useState<MarketplaceConv[]>([])
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [loadingLeft, setLoadingLeft] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [openingChat, setOpeningChat] = useState<string | null>(null)

  const [activeChat, setActiveChat] = useState<ActiveChat | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [otherLastReadAt, setOtherLastReadAt] = useState<string | null>(null)
  const [pendingImage, setPendingImage] = useState<{ file: File; previewUrl: string } | null>(null)
  const [e2eEnabled, setE2eEnabled] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const activeChatRef = useRef<ActiveChat | null>(null)
  activeChatRef.current = activeChat

  // E2EE: own key pair comes from AuthContext (initialized on login); per-peer shared keys cached here
  const myKeyPairRef = useRef<E2EKeyPair | null>(null)
  const sharedKeysRef = useRef<Map<string, CryptoKey>>(new Map())

  // Sync the key pair from context into the ref so openDirectChat can read it synchronously
  useEffect(() => {
    myKeyPairRef.current = e2eKeyPair
  }, [e2eKeyPair])

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // ── Fetch friends list ──
  async function fetchFriendsAndConvs() {
    if (!user) return
    setLoadingLeft(true)

    const { data: conns } = await supabase
      .from('connections')
      .select('requester_id, addressee_id')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq('status', 'accepted')

    const friendIds = (conns ?? []).map((c: any) =>
      c.requester_id === user.id ? c.addressee_id : c.requester_id
    )

    if (friendIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, username, major, graduation_year')
        .in('id', friendIds)
      setFriends((profiles ?? []).map((p: any) => ({ profile: p as Profile })))
    } else {
      setFriends([])
    }

    const { data: myParts } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id)

    if (myParts && myParts.length > 0) {
      const myConvIds = myParts.map((p: any) => p.conversation_id)
      const { data: mpConvs } = await supabase
        .from('conversations')
        .select('id, listing_id, created_at, listing:marketplace_listings(title)')
        .in('id', myConvIds)
        .eq('type', 'marketplace')
        .order('created_at', { ascending: false })

      setMarketplaceConvs((mpConvs ?? []).map((c: any) => ({
        conversationId: c.id,
        listingTitle: c.listing?.title ?? null,
        createdAt: c.created_at,
      })))
    }

    setLoadingLeft(false)
  }

  async function searchUsers(query: string) {
    if (!user || !query.trim()) { setSearchResults([]); return }
    setSearchLoading(true)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, username, major, graduation_year')
      .neq('id', user.id)
      .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
      .limit(20)

    const { data: conns } = await supabase
      .from('connections')
      .select('requester_id, addressee_id, status')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)

    const connMap: Record<string, SearchResult['connStatus']> = {}
    conns?.forEach((c: any) => {
      const otherId = c.requester_id === user.id ? c.addressee_id : c.requester_id
      if (c.status === 'accepted') connMap[otherId] = 'connected'
      else if (c.status === 'pending' && c.requester_id === user.id) connMap[otherId] = 'pending_sent'
      else if (c.status === 'pending' && c.addressee_id === user.id) connMap[otherId] = 'pending_received'
    })
    setSearchResults((profiles ?? []).map((p: any) => ({
      profile: p as Profile,
      connStatus: connMap[p.id] ?? 'none',
    })))
    setSearchLoading(false)
  }

  useEffect(() => {
    fetchFriendsAndConvs()
  }, [user?.id])

  useEffect(() => {
    const t = setTimeout(() => searchUsers(searchQuery), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  // ── Decrypt a single raw message row ──
  // Returns an extra _encrypted flag so the UI can show a per-message lock icon.
  async function decryptMessage(raw: any, key: CryptoKey | undefined): Promise<any> {
    if (!raw.iv) {
      // No IV — stored as plaintext (historical message before E2EE was enabled)
      return { ...raw, _encrypted: false }
    }
    if (!key) {
      // Has IV (was encrypted) but we have no key — can't decrypt
      return { ...raw, content: '🔒 Encrypted message', iv: null, _encrypted: true }
    }
    try {
      const plaintext = await decryptMsg(raw.content, raw.iv, key)
      return { ...raw, content: plaintext, iv: null, _encrypted: true }
    } catch {
      return { ...raw, content: '🔒 Encrypted message', iv: null, _encrypted: true }
    }
  }

  // ── Open direct chat via SECURITY DEFINER RPC ──
  async function openDirectChat(friend: Profile) {
    if (!user) return
    setOpeningChat(friend.id)
    const { data: convId, error } = await supabase.rpc('get_or_create_direct_conversation', {
      other_user_id: friend.id,
    })
    setOpeningChat(null)
    if (error || !convId) {
      toast.error('Could not open chat — run the SQL setup in Supabase first.')
      return
    }

    // Derive shared E2EE key for this friend (cache so we don't redo on revisit)
    let ready = sharedKeysRef.current.has(friend.id)
    if (!ready && myKeyPairRef.current) {
      const { data: otherProf } = await supabase
        .from('profiles')
        .select('public_key')
        .eq('id', friend.id)
        .maybeSingle()
      const pubKeyStr = (otherProf as any)?.public_key as string | null
      if (pubKeyStr) {
        try {
          const theirJwk = JSON.parse(pubKeyStr) as JsonWebKey
          const sk = await deriveSharedKey(myKeyPairRef.current.privateKey, theirJwk)
          sharedKeysRef.current.set(friend.id, sk)
          ready = true
        } catch { /* no E2EE for this friend */ }
      }
    }
    setE2eEnabled(ready)

    setActiveChat({ conversationId: convId, type: 'direct', otherUser: friend, listingTitle: null })
    setMessages([])
    setOtherLastReadAt(null)
    setPendingImage(null)
    fetchMessages(convId, friend.id)
    markAsRead(convId)
    fetchOtherLastReadAt(convId)
  }

  async function openMarketplaceChat(mc: MarketplaceConv) {
    if (!user) return
    // Find the other participant so we can derive an E2EE key for marketplace chats too
    let otherUser: Profile | null = null
    let ready = false
    try {
      const { data: parts } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', mc.conversationId)
        .neq('user_id', user.id)
        .limit(1)
      const otherId = (parts?.[0] as any)?.user_id as string | undefined
      if (otherId && myKeyPairRef.current) {
        const { data: otherProf } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, username, public_key')
          .eq('id', otherId)
          .maybeSingle()
        if (otherProf) {
          otherUser = otherProf as unknown as Profile
          const pubKeyStr = (otherProf as any).public_key as string | null
          if (pubKeyStr && !sharedKeysRef.current.has(otherId)) {
            const sk = await deriveSharedKey(myKeyPairRef.current.privateKey, JSON.parse(pubKeyStr))
            sharedKeysRef.current.set(otherId, sk)
            ready = true
          } else if (sharedKeysRef.current.has(otherId)) {
            ready = true
          }
        }
      }
    } catch { /* fallback — no E2EE for this chat */ }

    setE2eEnabled(ready)
    setActiveChat({ conversationId: mc.conversationId, type: 'marketplace', otherUser, listingTitle: mc.listingTitle })
    setMessages([])
    setOtherLastReadAt(null)
    setPendingImage(null)
    fetchMessages(mc.conversationId, otherUser?.id)
    markAsRead(mc.conversationId)
    fetchOtherLastReadAt(mc.conversationId)
  }

  async function fetchMessages(convId: string, otherUserId?: string) {
    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url)')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
      .limit(100)

    const raws = ((data as any[]) ?? []).filter((m) => !m.is_deleted)
    const key = otherUserId ? sharedKeysRef.current.get(otherUserId) : undefined
    const decrypted = await Promise.all(raws.map((m) => decryptMessage(m, key)))
    setMessages(decrypted as Message[])
    setTimeout(scrollToBottom, 100)
  }

  async function markAsRead(convId: string) {
    if (!user) return
    await supabase
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', convId)
      .eq('user_id', user.id)
  }

  async function fetchOtherLastReadAt(convId: string) {
    if (!user) return
    const { data } = await supabase
      .from('conversation_participants')
      .select('user_id, last_read_at')
      .eq('conversation_id', convId)
      .neq('user_id', user.id)
      .maybeSingle()
    setOtherLastReadAt((data as any)?.last_read_at ?? null)
  }

  // ── Realtime: new messages + read-receipt updates ──
  useEffect(() => {
    if (!activeChat) return

    const msgCh = supabase
      .channel(`msgs:${activeChat.conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${activeChat.conversationId}`,
      }, async (payload) => {
        const raw = payload.new as any
        const { data: senderData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', raw.sender_id)
          .single()

        const otherUserId = activeChatRef.current?.otherUser?.id
        const key = otherUserId ? sharedKeysRef.current.get(otherUserId) : undefined
        const decrypted = await decryptMessage({ ...raw, sender: senderData ?? undefined }, key)

        setMessages((prev) =>
          prev.find((m) => m.id === decrypted.id) ? prev : [...prev, decrypted as Message]
        )
        setTimeout(scrollToBottom, 50)
        if (raw.sender_id !== user?.id) {
          const cid = activeChatRef.current?.conversationId
          if (cid) markAsRead(cid)
        }
      })
      .subscribe()

    const partCh = supabase
      .channel(`parts:${activeChat.conversationId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversation_participants',
        filter: `conversation_id=eq.${activeChat.conversationId}`,
      }, (payload) => {
        const updated = payload.new as any
        if (updated.user_id !== user?.id) setOtherLastReadAt(updated.last_read_at ?? null)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(msgCh)
      supabase.removeChannel(partCh)
    }
  }, [activeChat?.conversationId])

  async function sendMessage() {
    if ((!newMessage.trim() && !pendingImage) || !activeChat || !user) return
    setSending(true)

    let mediaUrl: string | null = null
    if (pendingImage) {
      const path = `chats/${user.id}/${Date.now()}-${pendingImage.file.name}`
      const { error } = await supabase.storage.from('media').upload(path, pendingImage.file)
      if (!error) {
        const { data } = supabase.storage.from('media').getPublicUrl(path)
        mediaUrl = data.publicUrl
      } else {
        toast.error('Image upload failed')
      }
      URL.revokeObjectURL(pendingImage.previewUrl)
      setPendingImage(null)
    }

    let content: string | null = newMessage.trim() || null
    let msgIv: string | null = null
    const plaintextContent = content

    if (content) {
      const sharedKey = activeChat.otherUser?.id
        ? sharedKeysRef.current.get(activeChat.otherUser.id)
        : undefined

      if (sharedKey) {
        // E2EE key available — encrypt
        try {
          const enc = await encryptMsg(content, sharedKey)
          content = enc.ciphertext
          msgIv = enc.iv
        } catch {
          toast.error('Encryption failed — message not sent')
          setSending(false)
          return
        }
      } else {
        // No shared key — block the send rather than sending plaintext silently
        toast.error('Secure channel not ready. Reopen the chat or ask the other person to open Uni-verse.')
        setSending(false)
        return
      }
    }

    if (content || mediaUrl) {
      const { data: insertedMsg, error } = await supabase.from('messages').insert({
        conversation_id: activeChat.conversationId,
        sender_id: user.id,
        content,
        media_url: mediaUrl,
        iv: msgIv,
      }).select('*, sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url)').single()

      if (error) {
        toast.error('Failed to send message')
      } else if (insertedMsg) {
        // Show sender the plaintext immediately; realtime will be deduped by id
        const display = { ...insertedMsg, content: plaintextContent, iv: null, _encrypted: true } as Message
        setMessages((prev) => prev.find((m) => m.id === display.id) ? prev : [...prev, display])
        setTimeout(scrollToBottom, 50)
      }
    }

    setNewMessage('')
    setSending(false)
  }

  async function sendConnectionRequest(addresseeId: string) {
    if (!user) return
    const { error } = await supabase.from('connections').insert({ requester_id: user.id, addressee_id: addresseeId })
    if (error) { toast.error('Request already sent'); return }
    toast.success('Connection request sent!')
    await supabase.from('notifications').insert({
      user_id: addresseeId,
      type: 'connection_request',
      title: 'New connection request',
      body: `${myProfile?.full_name} wants to connect with you`,
      data: { requester_id: user.id, requester_name: myProfile?.full_name },
    })
    setSearchResults((prev) => prev.map((r) => r.profile.id === addresseeId ? { ...r, connStatus: 'pending_sent' } : r))
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be under 10 MB'); return }
    setPendingImage({ file, previewUrl: URL.createObjectURL(file) })
    e.target.value = ''
  }

  const isSearchMode = searchQuery.trim().length > 0

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-text-primary mb-6">Chats</h1>

      <div className="bg-surface border border-surface-border rounded-3xl overflow-hidden flex h-[calc(100vh-12rem)]">

        {/* ── Left panel ── */}
        <div className="w-72 border-r border-surface-border flex flex-col flex-shrink-0">
          <div className="p-3 border-b border-surface-border">
            <Input
              placeholder="Search people..."
              leftIcon={<Search className="w-4 h-4" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {isSearchMode ? (
              searchLoading ? (
                <div className="p-4 text-center text-sm text-text-muted">Searching…</div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-center text-sm text-text-muted">No results found</div>
              ) : (
                searchResults.map((r) => (
                  <div key={r.profile.id} className="flex items-center gap-3 px-3 py-3 hover:bg-surface-hover">
                    <Avatar src={r.profile.avatar_url} name={r.profile.full_name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-primary text-sm truncate">{r.profile.full_name}</p>
                      <p className="text-xs text-text-muted truncate">@{r.profile.username ?? '—'}</p>
                    </div>
                    <div className="flex-shrink-0">
                      {r.connStatus === 'connected' ? (
                        <button onClick={() => openDirectChat(r.profile)} className="text-xs font-medium text-accent hover:underline flex items-center gap-1">
                          <MessageCircle className="w-3.5 h-3.5" /> Message
                        </button>
                      ) : r.connStatus === 'pending_sent' ? (
                        <span className="text-xs text-text-muted">Pending</span>
                      ) : r.connStatus === 'pending_received' ? (
                        <span className="text-xs text-green-500">Respond</span>
                      ) : (
                        <button onClick={() => sendConnectionRequest(r.profile.id)} className="text-xs font-medium text-accent hover:underline flex items-center gap-1">
                          <UserPlus className="w-3.5 h-3.5" /> Connect
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )
            ) : loadingLeft ? (
              <div className="p-3 space-y-1">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                    <div className="w-9 h-9 rounded-full bg-surface-hover flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-surface-hover rounded-full w-2/3" />
                      <div className="h-2.5 bg-surface-hover rounded-full w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* Friends */}
                {friends.length > 0 && (
                  <>
                    <p className="px-3 pt-3 pb-1 text-[10px] font-semibold text-text-muted uppercase tracking-widest">
                      Friends — {friends.length}
                    </p>
                    {friends.map(({ profile: f }) => (
                      <button
                        key={f.id}
                        onClick={() => openDirectChat(f)}
                        disabled={openingChat === f.id}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-3 hover:bg-surface-hover transition-colors text-left relative',
                          activeChat?.type === 'direct' && activeChat.otherUser?.id === f.id
                            ? 'bg-accent/8 border-r-2 border-accent'
                            : ''
                        )}
                      >
                        <Avatar src={f.avatar_url} name={f.full_name} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-text-primary text-sm truncate">{f.full_name}</p>
                          <p className="text-xs text-text-muted truncate">@{f.username ?? '—'}</p>
                        </div>
                        {openingChat === f.id && (
                          <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </>
                )}

                {/* Marketplace */}
                {marketplaceConvs.length > 0 && (
                  <>
                    <p className="px-3 pt-3 pb-1 text-[10px] font-semibold text-text-muted uppercase tracking-widest border-t border-surface-border mt-2">
                      MarketSpot
                    </p>
                    {marketplaceConvs.map((mc) => (
                      <button
                        key={mc.conversationId}
                        onClick={() => openMarketplaceChat(mc)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-3 hover:bg-surface-hover transition-colors text-left',
                          activeChat?.conversationId === mc.conversationId ? 'bg-accent/8 border-r-2 border-accent' : ''
                        )}
                      >
                        <div className="w-9 h-9 rounded-full bg-[#10B981]/10 flex items-center justify-center flex-shrink-0">
                          <ShoppingBag className="w-4 h-4 text-[#10B981]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-text-primary text-sm truncate">{mc.listingTitle ?? 'MarketSpot Chat'}</p>
                          <p className="text-xs text-text-muted">Anonymous</p>
                        </div>
                      </button>
                    ))}
                  </>
                )}

                {friends.length === 0 && marketplaceConvs.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6 py-12">
                    <Users className="w-10 h-10 text-text-muted" />
                    <p className="text-sm text-text-secondary font-medium">No friends yet</p>
                    <p className="text-xs text-text-muted">Connect with people first</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {!activeChat ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 text-text-muted">
              <MessageCircle className="w-12 h-12" />
              <p className="font-medium text-text-secondary">Select a conversation</p>
              <p className="text-sm">Choose a friend from the left to start chatting</p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 p-4 border-b border-surface-border flex-shrink-0">
                {activeChat.type === 'marketplace' ? (
                  <>
                    <div className="w-9 h-9 rounded-full bg-[#10B981]/10 flex items-center justify-center flex-shrink-0">
                      <ShoppingBag className="w-4 h-4 text-[#10B981]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-text-primary text-sm">{activeChat.listingTitle ?? 'MarketSpot Chat'}</p>
                      <div className="flex items-center gap-1">
                        <p className="text-xs text-text-muted">Buyer and seller are anonymous</p>
                        {e2eEnabled && (
                          <span className="flex items-center gap-0.5 text-[10px] text-green-500 font-medium">
                            <Lock className="w-2.5 h-2.5" />
                            E2E encrypted
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <Avatar src={activeChat.otherUser?.avatar_url} name={activeChat.otherUser?.full_name ?? 'U'} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-text-primary text-sm">{activeChat.otherUser?.full_name}</p>
                      <div className="flex items-center gap-1">
                        <p className="text-xs text-text-muted">@{activeChat.otherUser?.username}</p>
                        {e2eEnabled ? (
                          <span className="flex items-center gap-0.5 text-[10px] text-green-500 font-medium">
                            <Lock className="w-2.5 h-2.5" />
                            E2E encrypted
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5 text-[10px] text-yellow-500 font-medium">
                            <Lock className="w-2.5 h-2.5" />
                            Establishing secure channel…
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-3 space-y-0.5">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                    {activeChat.type === 'direct' && activeChat.otherUser ? (
                      <>
                        <Avatar src={activeChat.otherUser.avatar_url} name={activeChat.otherUser.full_name} size="xl" className="ring-4 ring-surface-border" />
                        <div>
                          <p className="font-bold text-text-primary text-lg">{activeChat.otherUser.full_name}</p>
                          <p className="text-text-muted text-sm">@{activeChat.otherUser.username}</p>
                        </div>
                        <p className="text-text-muted text-sm">Say hi to start your conversation!</p>
                        {e2eEnabled && (
                          <div className="flex items-center gap-1.5 text-xs text-green-500 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1">
                            <Lock className="w-3 h-3" />
                            Messages are end-to-end encrypted
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 rounded-full bg-[#10B981]/10 flex items-center justify-center">
                          <ShoppingBag className="w-8 h-8 text-[#10B981]" />
                        </div>
                        <p className="text-text-muted text-sm">Start negotiating anonymously</p>
                        {e2eEnabled && (
                          <div className="flex items-center gap-1.5 text-xs text-green-500 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1">
                            <Lock className="w-3 h-3" />
                            Messages are end-to-end encrypted
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  messages.map((msg, i) => {
                    const isMe = msg.sender_id === user?.id
                    const prev = messages[i - 1]
                    const next = messages[i + 1]
                    const isFirstInGroup = !prev || prev.sender_id !== msg.sender_id
                    const isLastInGroup = !next || next.sender_id !== msg.sender_id
                    const isRead = !!(otherLastReadAt && msg.created_at <= otherLastReadAt)

                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          'flex items-end gap-2',
                          isMe ? 'flex-row-reverse' : 'flex-row',
                          isFirstInGroup ? 'mt-3' : 'mt-0.5'
                        )}
                      >
                        {/* Other user avatar */}
                        {!isMe && (
                          <div className="w-7 flex-shrink-0 self-end">
                            {isLastInGroup ? (
                              activeChat.type === 'marketplace'
                                ? <div className="w-7 h-7 rounded-full bg-[#10B981]/10 flex items-center justify-center"><ShoppingBag className="w-3.5 h-3.5 text-[#10B981]" /></div>
                                : <Avatar src={(msg.sender as any)?.avatar_url} name={(msg.sender as any)?.full_name ?? 'U'} size="xs" />
                            ) : <div className="w-7" />}
                          </div>
                        )}

                        {/* Bubble */}
                        <div className={cn(
                          'max-w-[70%] px-3.5 py-2 text-sm shadow-sm',
                          isMe ? 'bg-accent text-white' : 'bg-surface-hover text-text-primary',
                          msg.content === '🔒 Encrypted message' ? 'opacity-60 italic' : '',
                          isMe
                            ? isFirstInGroup && isLastInGroup ? 'rounded-[20px]'
                              : isFirstInGroup ? 'rounded-[20px] rounded-br-[6px]'
                              : isLastInGroup ? 'rounded-[20px] rounded-tr-[6px]'
                              : 'rounded-[20px] rounded-r-[6px]'
                            : isFirstInGroup && isLastInGroup ? 'rounded-[20px]'
                              : isFirstInGroup ? 'rounded-[20px] rounded-bl-[6px]'
                              : isLastInGroup ? 'rounded-[20px] rounded-tl-[6px]'
                              : 'rounded-[20px] rounded-l-[6px]'
                        )}>
                          {msg.media_url && (
                            <img
                              src={msg.media_url}
                              className={cn('rounded-xl max-w-full cursor-pointer', msg.content ? 'mb-1.5' : '')}
                              style={{ maxHeight: 260, objectFit: 'cover' }}
                              onClick={() => window.open(msg.media_url!, '_blank')}
                              alt=""
                            />
                          )}
                          {msg.content && <p className="leading-snug break-words">{msg.content}</p>}
                          <div className="flex items-center justify-end gap-1 mt-0.5">
                            {(msg as any)._encrypted === false && (
                              <span className={cn('text-[9px]', isMe ? 'text-white/40' : 'text-text-muted/60')}>
                                legacy
                              </span>
                            )}
                            {(msg as any)._encrypted === true && (
                              <Lock className={cn('w-2.5 h-2.5 flex-shrink-0', isMe ? 'text-white/50' : 'text-green-500/70')} />
                            )}
                            <span className={cn('text-[10px]', isMe ? 'text-white/60' : 'text-text-muted')}>
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isMe && <Ticks isRead={isRead} />}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Image preview */}
              {pendingImage && (
                <div className="px-4 pt-2 flex-shrink-0">
                  <div className="relative inline-block">
                    <img src={pendingImage.previewUrl} className="h-20 w-20 object-cover rounded-xl border border-surface-border" alt="" />
                    <button
                      onClick={() => { URL.revokeObjectURL(pendingImage.previewUrl); setPendingImage(null) }}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* Input bar */}
              <div className="p-3 border-t border-surface-border flex-shrink-0">
                <div className="flex gap-2 items-center">
                  <input ref={imageInputRef} type="file" accept="image/*" hidden onChange={handleImageSelect} />
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    className="w-9 h-9 rounded-xl border border-surface-border flex items-center justify-center text-text-muted hover:text-accent hover:border-accent transition-colors flex-shrink-0"
                  >
                    <Image className="w-4 h-4" />
                  </button>
                  <Input
                    placeholder={e2eEnabled ? 'Type a message… (encrypted)' : 'Type a message…'}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                    className="flex-1"
                  />
                  <Button
                    onClick={sendMessage}
                    loading={sending}
                    disabled={!newMessage.trim() && !pendingImage}
                    className="flex-shrink-0 px-3"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
