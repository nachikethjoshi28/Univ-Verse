import { useState, useEffect } from 'react'
import { Plus, Search, Globe, Lock, Users, Filter } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import type { Community } from '../../types'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { cn } from '../../lib/utils'
import toast from 'react-hot-toast'

export function CommunityPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [communities, setCommunities] = useState<Community[]>([])
  const [myCommunities, setMyCommunities] = useState<Community[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [activeTab, setActiveTab] = useState<'discover' | 'mine'>('discover')
  const [mineFilter, setMineFilter] = useState<'all' | 'created'>('all')
  const [form, setForm] = useState({ name: '', description: '', is_private: false })
  const [creating, setCreating] = useState(false)

  async function fetchCommunities() {
    if (!user) return
    const { data: all } = await supabase
      .from('communities')
      .select('*, creator:profiles!communities_creator_id_fkey(id, full_name, avatar_url)')
      .eq('is_flagged', false)
      .ilike('name', search ? `%${search}%` : '%')
      .order('member_count', { ascending: false })
      .limit(30)

    const { data: mine } = await supabase
      .from('community_members')
      .select('community:communities(*, creator:profiles!communities_creator_id_fkey(id, full_name, avatar_url))')
      .eq('user_id', user.id)
      .eq('status', 'active')

    setCommunities((all as Community[]) ?? [])
    setMyCommunities(mine?.map((m: any) => m.community) ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchCommunities() }, [user?.id, search])

  async function joinCommunity(communityId: string, isPrivate: boolean) {
    if (!user) return
    const { error } = await supabase.from('community_members').insert({
      community_id: communityId,
      user_id: user.id,
      status: isPrivate ? 'pending' : 'active',
    })
    if (error) toast.error('Already a member or request pending')
    else toast.success(isPrivate ? 'Join request sent!' : 'Joined successfully!')
    fetchCommunities()
  }

  async function createCommunity() {
    if (!user) return
    if (!form.name.trim()) { toast.error('Community name is required'); return }
    setCreating(true)

    const { data, error } = await supabase.from('communities').insert({
      name: form.name.trim(),
      description: form.description.trim() || null,
      creator_id: user.id,
      is_private: form.is_private,
    }).select().single()

    if (error) { toast.error('Failed to create community'); setCreating(false); return }

    await supabase.from('community_members').insert({
      community_id: data.id,
      user_id: user.id,
      role: 'admin',
      status: 'active',
    })

    toast.success('Community created!')
    setShowCreate(false)
    setForm({ name: '', description: '', is_private: false })
    fetchCommunities()
    setCreating(false)
  }

  const myIds = new Set(myCommunities.map((c) => c.id))

  const filteredMyCommunities = mineFilter === 'created'
    ? myCommunities.filter((c) => (c as any).creator?.id === user?.id)
    : myCommunities

  const displayList = activeTab === 'mine' ? filteredMyCommunities : communities

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Community</h1>
          <p className="text-text-muted text-sm mt-1">Groups and clubs at your university</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" />
          Create
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-surface-hover p-1 rounded-2xl">
          {(['discover', 'mine'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 capitalize',
                activeTab === tab ? 'bg-surface text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'
              )}
            >
              {tab === 'mine' ? 'My Communities' : 'Discover'}
            </button>
          ))}
        </div>

        {/* Filter for My Communities */}
        {activeTab === 'mine' && (
          <div className="flex gap-1 bg-surface-hover p-1 rounded-2xl">
            {([
              { value: 'all', label: 'All' },
              { value: 'created', label: 'Created by me' },
            ] as const).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setMineFilter(value)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200',
                  mineFilter === value ? 'bg-surface text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'
                )}
              >
                {value === 'created' && <Filter className="w-3 h-3" />}
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search */}
      <Input
        placeholder="Search communities..."
        leftIcon={<Search className="w-4 h-4" />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="flex gap-4">
                <div className="w-14 h-14 rounded-2xl bg-surface-hover" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-surface-hover rounded-full w-1/3" />
                  <div className="h-3 bg-surface-hover rounded-full w-2/3" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : displayList.length === 0 ? (
        <Card className="text-center py-16">
          <Globe className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <p className="text-text-secondary font-medium">
            {activeTab === 'mine'
              ? mineFilter === 'created' ? 'No communities created by you yet' : 'You haven\'t joined any communities yet'
              : 'No communities found'}
          </p>
          <p className="text-text-muted text-sm mt-1">
            {activeTab === 'mine' ? 'Discover and join communities from the Discover tab' : 'Be the first to create one!'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {displayList.map((community) => {
            const isMember = myIds.has(community.id)
            return (
              <Card
                key={community.id}
                hover
                className="flex items-start gap-4 cursor-pointer"
                onClick={() => navigate(`/community/${community.id}`)}
              >
                {/* Avatar */}
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
                  {community.avatar_image
                    ? <img src={community.avatar_image} className="w-full h-full object-cover" alt="" />
                    : <span>{community.name[0]}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-text-primary">{community.name}</h3>
                    {community.is_private
                      ? <Lock className="w-3.5 h-3.5 text-text-muted" />
                      : <Globe className="w-3.5 h-3.5 text-text-muted" />
                    }
                  </div>
                  {community.description && (
                    <p className="text-sm text-text-secondary mt-0.5 line-clamp-2">{community.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="flex items-center gap-1 text-xs text-text-muted">
                      <Users className="w-3.5 h-3.5" />
                      {community.member_count} member{community.member_count !== 1 ? 's' : ''}
                    </span>
                    {community.is_private && <Badge variant="outline">Private</Badge>}
                  </div>
                </div>
                <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  {isMember ? (
                    <Badge variant="success">Joined</Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => { e.stopPropagation(); joinCommunity(community.id, community.is_private) }}
                    >
                      {community.is_private ? 'Request' : 'Join'}
                    </Button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Community" size="md">
        <div className="space-y-4">
          <Input
            label="Community Name"
            placeholder="e.g. Chess Club, Yoga Society..."
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Textarea
            label="Description (optional)"
            placeholder="What is this community about?"
            rows={3}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded accent-accent"
              checked={form.is_private}
              onChange={(e) => setForm((f) => ({ ...f, is_private: e.target.checked }))}
            />
            <div>
              <span className="text-sm font-medium text-text-primary">Private community</span>
              <p className="text-xs text-text-muted">Members must request to join</p>
            </div>
          </label>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" fullWidth onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button fullWidth loading={creating} onClick={createCommunity}>Create Community</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
