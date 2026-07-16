import { useState, useEffect, useRef } from 'react'
import { Heart, X, Star, Flame, Settings2, Shield, Upload, PauseCircle, PlayCircle, Plus, Trash2, MessageCircle, RotateCcw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import type { DatingProfile } from '../../types'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { Modal } from '../../components/ui/Modal'
import { Avatar } from '../../components/ui/Avatar'
import { cn } from '../../lib/utils'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { CropModal } from '../../components/ui/CropModal'
import { useNavigate } from 'react-router-dom'

const RELIGIONS = ['No preference', 'Christian', 'Catholic', 'Jewish', 'Muslim', 'Hindu', 'Buddhist', 'Sikh', 'Atheist / Agnostic', 'Spiritual but not religious', 'Other']
const ETHNICITIES = ['Asian', 'Black / African American', 'Hispanic / Latino', 'Middle Eastern', 'Mixed / Multiracial', 'Native American', 'Pacific Islander', 'South Asian', 'Southeast Asian', 'White / Caucasian', 'Other', 'Prefer not to say']

// ── Categorised interests ────────────────────────────────────────────────────
const INTEREST_CATEGORIES: { label: string; emoji: string; items: string[] }[] = [
  {
    label: 'Sports',
    emoji: '🏏',
    items: ['Cricket', 'Football / Soccer', 'Basketball', 'Tennis', 'Hockey', 'Badminton', 'Table Tennis', 'Volleyball', 'Swimming', 'Cycling', 'Running', 'Martial Arts', 'Wrestling', 'Baseball', 'Rugby'],
  },
  {
    label: 'Movies & TV',
    emoji: '🎬',
    items: ['Bollywood / Indian Cinema', 'Hollywood Blockbusters', 'Horror Films', 'Romantic Films', 'Comedy Films', 'Sci-Fi & Fantasy', 'Documentaries', 'Anime', 'K-Dramas', 'True Crime Series', 'Indie Films', 'Classic Cinema'],
  },
  {
    label: 'Music',
    emoji: '🎵',
    items: ['Pop', 'Hip-Hop / Rap', 'Rock', 'Classical', 'Jazz & Blues', 'EDM / Electronic', 'R&B / Soul', 'Country', 'Indie / Alternative', 'Metal', 'Bollywood Music', 'K-Pop', 'Reggae / Dancehall', 'Folk'],
  },
  {
    label: 'Outdoor & Adventure',
    emoji: '🏕️',
    items: ['Hiking / Trekking', 'Cycling', 'Swimming', 'Live Concerts', 'Camping', 'Rock Climbing', 'Surfing', 'Kayaking / Canoeing', 'Skiing / Snowboarding', 'Road Trips', 'Backpacking', 'Birdwatching'],
  },
  {
    label: 'Food & Drink',
    emoji: '🍜',
    items: ['Cooking', 'Baking', 'Coffee Culture', 'Foodie / Restaurant Hopping', 'Street Food', 'Vegetarian / Vegan Cuisine', 'Craft Beer & Breweries', 'Tea Enthusiast', 'Wine Tasting', 'Meal Prepping'],
  },
  {
    label: 'Arts & Creativity',
    emoji: '🎨',
    items: ['Painting', 'Drawing / Illustration', 'Photography', 'Graphic Design', 'Pottery / Ceramics', 'Sculpture', 'Dance', 'Theatre & Acting', 'Writing / Poetry', 'Calligraphy', 'Fashion Design', 'DIY / Crafts'],
  },
  {
    label: 'Gaming & Tech',
    emoji: '🎮',
    items: ['Video Games', 'PC Gaming', 'Console Gaming', 'Mobile Gaming', 'Board Games', 'Chess', 'VR / AR', 'Programming / Coding', 'Robotics', 'Cybersecurity', 'AI / Machine Learning', 'Esports'],
  },
  {
    label: 'Fitness & Wellness',
    emoji: '🧘',
    items: ['Gym / Weight Training', 'Yoga', 'Meditation / Mindfulness', 'CrossFit', 'Pilates', 'Dance Fitness', 'Marathons', 'Martial Arts', 'Rock Climbing', 'Mental Health Advocacy'],
  },
  {
    label: 'Reading & Learning',
    emoji: '📚',
    items: ['Fiction', 'Non-Fiction', 'Science & Technology', 'History & Politics', 'Philosophy', 'Self-Help', 'Graphic Novels / Comics', 'Podcasts', 'Language Learning', 'Online Courses'],
  },
  {
    label: 'Travel & Culture',
    emoji: '✈️',
    items: ['Solo Travel', 'Group Travel', 'Backpacking', 'Cultural Exploration', 'Museum Hopping', 'Historical Sites', 'Beach Getaways', 'Mountain Escapes', 'City Life', 'Voluntourism'],
  },
  {
    label: 'Social & Community',
    emoji: '🤝',
    items: ['Volunteering / Community Service', 'Activism', 'Entrepreneurship', 'Networking Events', 'Student Government', 'Mentoring', 'Book Clubs', 'Debate / MUN'],
  },
  {
    label: 'Lifestyle',
    emoji: '🌿',
    items: ['Sustainability / Eco Living', 'Thrift Shopping', 'Astrology', 'Journaling', 'Minimalism', 'Pets & Animals', 'Gardening', 'Home Décor', 'Spirituality'],
  },
]

interface DatingCard extends Omit<DatingProfile, 'profile'> {
  profile: { id: string; full_name: string; avatar_url: string | null; major: string | null; graduation_year: number; university?: { name: string } }
}

interface FormState {
  bio: string
  sex: string
  religion: string
  ethnicity: string
  height_cm: string
  looking_for: string[]
  age_range_min: number
  age_range_max: number
  interests: string[]
  photos: string[]
}

const DEFAULT_FORM: FormState = {
  bio: '', sex: '', religion: '', ethnicity: '', height_cm: '',
  looking_for: [], age_range_min: 18, age_range_max: 30,
  interests: [], photos: [],
}

interface LikedYouItem {
  swiper_id: string
  direction: string
  created_at: string
  profile: { id: string; full_name: string; avatar_url: string | null; major: string | null; graduation_year: number | null }
  photos: string[]
  bio: string | null
  is_match: boolean
}

export function DatesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [myDatingProfile, setMyDatingProfile] = useState<DatingProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [cards, setCards] = useState<DatingCard[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showSetup, setShowSetup] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [dragging, setDragging] = useState<'left' | 'right' | null>(null)
  const [deactivating, setDeactivating] = useState(false)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [datesTab, setDatesTab] = useState<'discover' | 'liked_you'>('discover')
  const [likedYou, setLikedYou] = useState<LikedYouItem[]>([])
  const [loadingLikes, setLoadingLikes] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resettingDating, setResettingDating] = useState(false)

  async function fetchMyProfile() {
    if (!user) return
    const { data } = await supabase
      .from('dating_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    setMyDatingProfile(data)
    setLoadingProfile(false)
  }

  async function fetchCards() {
    if (!user || !myDatingProfile) return
    const { data: swiped } = await supabase
      .from('dating_swipes')
      .select('swiped_id')
      .eq('swiper_id', user.id)

    const swipedIds = swiped?.map((s) => s.swiped_id) ?? []

    const { data } = await supabase
      .from('dating_profiles')
      .select(`
        *,
        profile:profiles!dating_profiles_user_id_fkey(
          id, full_name, avatar_url, major, graduation_year,
          university:universities(name)
        )
      `)
      .eq('is_active', true)
      .neq('user_id', user.id)
      .not('user_id', 'in', `(${[user.id, ...swipedIds].join(',')})`)
      .limit(20)

    setCards((data as DatingCard[]) ?? [])
  }

  useEffect(() => { fetchMyProfile() }, [user])
  useEffect(() => { if (myDatingProfile) fetchCards() }, [myDatingProfile])
  useEffect(() => { if (datesTab === 'liked_you' && myDatingProfile) fetchLikedYou() }, [datesTab, myDatingProfile])

  async function fetchLikedYou() {
    if (!user) return
    setLoadingLikes(true)
    const { data: swipes } = await supabase
      .from('dating_swipes')
      .select('swiper_id, direction, created_at, profile:profiles!dating_swipes_swiper_id_fkey(id, full_name, avatar_url, major, graduation_year)')
      .eq('swiped_id', user.id)
      .in('direction', ['like', 'super_like'])
      .order('created_at', { ascending: false })

    if (!swipes?.length) { setLikedYou([]); setLoadingLikes(false); return }

    const swiperIds = swipes.map((s: any) => s.swiper_id)

    const [datingProfilesRes, matchesRes] = await Promise.all([
      supabase.from('dating_profiles').select('user_id, photos, bio').in('user_id', swiperIds),
      supabase.from('dating_matches').select('user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`),
    ])

    const dpMap: Record<string, { photos: string[]; bio: string | null }> = {}
    datingProfilesRes.data?.forEach((dp: any) => { dpMap[dp.user_id] = { photos: dp.photos ?? [], bio: dp.bio } })

    const matchedIds = new Set<string>()
    matchesRes.data?.forEach((m: any) => {
      matchedIds.add(m.user1_id === user.id ? m.user2_id : m.user1_id)
    })

    setLikedYou(swipes.map((s: any) => ({
      swiper_id: s.swiper_id,
      direction: s.direction,
      created_at: s.created_at,
      profile: s.profile,
      photos: dpMap[s.swiper_id]?.photos ?? [],
      bio: dpMap[s.swiper_id]?.bio ?? null,
      is_match: matchedIds.has(s.swiper_id),
    })))
    setLoadingLikes(false)
  }

  async function chatWithLike(personId: string) {
    if (!user) return
    const { data: convId, error } = await supabase.rpc('get_or_create_direct_conversation', {
      other_user_id: personId,
    })
    if (error || !convId) { toast.error('Could not start chat'); return }
    toast.success('Chat started! Head to Chats.')
    navigate('/chats')
  }

  async function resetDatingProfile() {
    if (!user) return
    setResettingDating(true)
    await supabase.from('dating_swipes').delete().eq('swiper_id', user.id)
    await supabase.from('dating_swipes').delete().eq('swiped_id', user.id)
    await supabase.from('dating_matches').delete().or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    toast.success('Dating profile reset — all likes and matches cleared.')
    setResettingDating(false)
    setShowResetConfirm(false)
    setLikedYou([])
    setCurrentIndex(0)
    fetchCards()
  }

  async function swipe(direction: 'like' | 'pass' | 'super_like') {
    const current = cards[currentIndex]
    if (!current || !user) return

    await supabase.from('dating_swipes').insert({
      swiper_id: user.id,
      swiped_id: current.user_id,
      direction,
    })

    if (direction === 'like' || direction === 'super_like') {
      const { data: matchCheck } = await supabase
        .from('dating_matches')
        .select('id')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${current.user_id}),and(user1_id.eq.${current.user_id},user2_id.eq.${user.id})`)
        .maybeSingle()
      if (matchCheck) toast("It's a match!", { icon: '💜' })
    }

    setCurrentIndex((i) => i + 1)
    setDragging(null)
  }

  async function saveProfile() {
    if (!user) return
    if (!form.sex) { toast.error('Please select your gender'); return }
    if (form.looking_for.length === 0) { toast.error("Please select who you're interested in"); return }
    if (form.photos.length < 6) { toast.error('Please upload at least 6 photos'); return }

    const upsertData = {
      user_id:       user.id,
      bio:           form.bio || null,
      sex:           form.sex,
      religion:      form.religion || null,
      ethnicity:     form.ethnicity || null,
      height_cm:     form.height_cm ? parseInt(form.height_cm) : null,
      looking_for:   form.looking_for,
      age_range_min: form.age_range_min,
      age_range_max: form.age_range_max,
      interests:     form.interests,
      photos:        form.photos,
    }

    const { error } = myDatingProfile
      ? await supabase.from('dating_profiles').update(upsertData).eq('user_id', user.id)
      : await supabase.from('dating_profiles').insert(upsertData)

    if (error) toast.error('Failed to save profile')
    else {
      toast.success('Dating profile saved!')
      setShowSetup(false)
      setShowSettings(false)
      fetchMyProfile()
    }
  }

  async function toggleActive() {
    if (!user || !myDatingProfile) return
    setDeactivating(true)
    const next = !myDatingProfile.is_active
    const { error } = await supabase
      .from('dating_profiles')
      .update({ is_active: next })
      .eq('user_id', user.id)
    if (error) toast.error('Failed to update status')
    else {
      toast.success(next ? 'Dating profile activated' : 'Dating profile paused')
      fetchMyProfile()
    }
    setDeactivating(false)
  }

  function openSettings() {
    if (!myDatingProfile) return
    setForm({
      bio:           myDatingProfile.bio ?? '',
      sex:           myDatingProfile.sex ?? '',
      religion:      myDatingProfile.religion ?? '',
      ethnicity:     myDatingProfile.ethnicity ?? '',
      height_cm:     myDatingProfile.height_cm?.toString() ?? '',
      looking_for:   myDatingProfile.looking_for ?? [],
      age_range_min: myDatingProfile.age_range_min ?? 18,
      age_range_max: myDatingProfile.age_range_max ?? 30,
      interests:     myDatingProfile.interests ?? [],
      photos:        (myDatingProfile as any).photos ?? [],
    })
    setShowSettings(true)
  }

  const hasMore = currentIndex < cards.length

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!myDatingProfile) {
    return (
      <div className="animate-fade-in">
        <div className="max-w-md mx-auto text-center py-20">
          <div className="w-20 h-20 rounded-3xl bg-[#FF6B9D]/10 border border-[#FF6B9D]/20 flex items-center justify-center mx-auto mb-6">
            <Heart className="w-10 h-10 text-[#FF6B9D]" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-3">Dates</h1>
          <p className="text-text-secondary mb-2">Meet fellow students at your university.</p>
          <p className="text-text-muted text-sm mb-8">
            Create a dating profile to start connecting. This is completely separate from your main profile.
          </p>
          <div className="bg-[#FF6B9D]/5 border border-[#FF6B9D]/20 rounded-2xl p-4 mb-8 text-left">
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-[#FF6B9D] mt-0.5 flex-shrink-0" />
              <p className="text-sm text-text-secondary">
                Your dating profile is private and only visible to other verified students with a dating profile.
              </p>
            </div>
          </div>
          <Button size="lg" onClick={() => { setForm(DEFAULT_FORM); setShowSetup(true) }} className="bg-[#FF6B9D] hover:bg-[#F05080]">
            <Heart className="w-5 h-5" />
            Create Dating Profile
          </Button>
        </div>

        <DatingProfileModal
          open={showSetup}
          onClose={() => setShowSetup(false)}
          form={form}
          setForm={setForm}
          onSave={saveProfile}
          userId={user?.id}
        />
      </div>
    )
  }

  return (
    <div className="animate-fade-in" data-section="dates">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dates</h1>
          <p className="text-text-muted text-sm">
            {myDatingProfile.is_active ? 'Your profile is visible' : 'Profile paused — not visible to others'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleActive}
            disabled={deactivating}
            title={myDatingProfile.is_active ? 'Pause dating profile' : 'Activate dating profile'}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-semibold border transition-all',
              myDatingProfile.is_active
                ? 'border-yellow-400/40 text-yellow-500 hover:bg-yellow-400/10'
                : 'border-green-400/40 text-green-500 hover:bg-green-400/10'
            )}
          >
            {myDatingProfile.is_active
              ? <><PauseCircle className="w-3.5 h-3.5" /> Pause</>
              : <><PlayCircle className="w-3.5 h-3.5" /> Activate</>
            }
          </button>
          <Button variant="ghost" size="sm" onClick={openSettings}>
            <Settings2 className="w-4 h-4" />
          </Button>
          <button
            onClick={() => setShowResetConfirm(true)}
            title="Reset dating profile"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-semibold border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>

      {!myDatingProfile.is_active && (
        <div className="mb-6 px-4 py-3 bg-yellow-400/10 border border-yellow-400/30 rounded-2xl text-sm text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
          <PauseCircle className="w-4 h-4 flex-shrink-0" />
          Your dating profile is paused. Other users cannot see you. Activate to start matching again.
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-hover p-1 rounded-2xl w-fit mb-6">
        {([
          { key: 'discover', label: 'Discover' },
          { key: 'liked_you', label: `Liked You` },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setDatesTab(key)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
              datesTab === key ? 'bg-[#FF6B9D] text-white shadow-sm' : 'text-text-muted hover:text-text-primary'
            )}
          >
            {label}
            {key === 'liked_you' && likedYou.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/20 text-[10px] font-bold">
                {likedYou.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Liked You tab */}
      {datesTab === 'liked_you' && (
        <div>
          {loadingLikes ? (
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="animate-pulse">
                  <div className="aspect-square bg-surface-hover rounded-2xl mb-3" />
                  <div className="h-4 bg-surface-hover rounded-full w-3/4 mb-2" />
                  <div className="h-3 bg-surface-hover rounded-full w-1/2" />
                </Card>
              ))}
            </div>
          ) : likedYou.length === 0 ? (
            <Card className="text-center py-20">
              <Heart className="w-12 h-12 text-[#FF6B9D]/30 mx-auto mb-4" />
              <p className="text-text-secondary font-medium">No likes yet</p>
              <p className="text-text-muted text-sm mt-1">People who like your profile will appear here</p>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {likedYou.map((item) => (
                <Card key={item.swiper_id} padding="none" className="overflow-hidden">
                  <div className="aspect-square relative">
                    {item.photos.length > 0 ? (
                      <img src={item.photos[0]} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-surface-hover">
                        <Avatar src={item.profile?.avatar_url} name={item.profile?.full_name} size="xl" />
                      </div>
                    )}
                    {item.direction === 'super_like' && (
                      <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center">
                        <Star className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                      <p className="font-bold text-sm">{item.profile?.full_name}</p>
                      {item.profile?.major && (
                        <p className="text-xs text-white/80">{item.profile.major}</p>
                      )}
                    </div>
                  </div>
                  <div className="p-3">
                    {item.bio && (
                      <p className="text-xs text-text-secondary line-clamp-2 mb-2">{item.bio}</p>
                    )}
                    {item.is_match ? (
                      <Button
                        size="sm"
                        fullWidth
                        onClick={() => chatWithLike(item.swiper_id)}
                        className="bg-[#FF6B9D] hover:bg-[#F05080] text-white"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        Chat
                      </Button>
                    ) : (
                      <div className="w-full py-1.5 text-center text-xs text-text-muted border border-surface-border rounded-2xl">
                        Like them back to chat
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Card stack */}
      {datesTab === 'discover' && (
      <div className="relative rounded-3xl">
        {!hasMore ? (
          <Card className="text-center py-20 border-[#FF6B9D]/20">
            <Flame className="w-12 h-12 text-[#FF6B9D]/40 mx-auto mb-4" />
            <p className="text-text-secondary font-medium">You've seen everyone!</p>
            <p className="text-text-muted text-sm mt-1">Check back later for new profiles</p>
          </Card>
        ) : (
          <div className="relative h-[520px]">
            {cards.slice(currentIndex, currentIndex + 2).reverse().map((card, reverseIdx) => {
              const isTop = reverseIdx === (Math.min(2, cards.length - currentIndex) - 1)
              const cardPhotos: string[] = (card as any).photos ?? []
              return (
                <motion.div
                  key={card.user_id}
                  className={cn(
                    'absolute inset-0 rounded-3xl overflow-hidden border-2 border-[#FF6B9D]/15',
                    isTop ? 'z-10' : 'z-0 scale-95 translate-y-2 opacity-60'
                  )}
                  animate={{
                    x: isTop && dragging === 'left' ? -80 : isTop && dragging === 'right' ? 80 : 0,
                    rotate: isTop && dragging === 'left' ? -8 : isTop && dragging === 'right' ? 8 : 0,
                  }}
                >
                  <div className="absolute inset-0 bg-surface-hover">
                    {cardPhotos.length > 0 ? (
                      <img src={cardPhotos[0]} className="w-full h-full object-cover" alt="" />
                    ) : card.profile?.avatar_url ? (
                      <img src={card.profile.avatar_url} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-8xl font-bold text-surface-border">
                        {card.profile?.full_name?.[0]}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <h2 className="text-2xl font-bold">{card.profile?.full_name}</h2>
                    <p className="text-white/80 text-sm mt-1">
                      {card.profile?.major} · Class of {card.profile?.graduation_year}
                    </p>
                    {card.bio && <p className="text-white/70 text-sm mt-2 line-clamp-2">{card.bio}</p>}
                    {card.interests && card.interests.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {card.interests.slice(0, 4).map((interest) => (
                          <span key={interest} className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-medium backdrop-blur-sm">
                            {interest}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {isTop && dragging === 'right' && (
                    <div className="absolute top-6 left-6 px-4 py-2 rounded-2xl border-2 border-green-400 rotate-[-15deg]">
                      <span className="text-green-400 font-bold text-xl">LIKE</span>
                    </div>
                  )}
                  {isTop && dragging === 'left' && (
                    <div className="absolute top-6 right-6 px-4 py-2 rounded-2xl border-2 border-red-400 rotate-[15deg]">
                      <span className="text-red-400 font-bold text-xl">NOPE</span>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}

        {hasMore && (
          <div className="flex items-center justify-center gap-6 mt-6">
            <button
              onClick={() => swipe('pass')}
              onMouseEnter={() => setDragging('left')}
              onMouseLeave={() => setDragging(null)}
              className="w-14 h-14 rounded-full bg-surface border-2 border-red-400/30 hover:border-red-400 hover:bg-red-400/10 flex items-center justify-center transition-all text-red-400 hover:scale-110 active:scale-95"
            >
              <X className="w-6 h-6" />
            </button>
            <button
              onClick={() => swipe('super_like')}
              className="w-12 h-12 rounded-full bg-surface border-2 border-blue-400/30 hover:border-blue-400 hover:bg-blue-400/10 flex items-center justify-center transition-all text-blue-400 hover:scale-110 active:scale-95"
            >
              <Star className="w-5 h-5" />
            </button>
            <button
              onClick={() => swipe('like')}
              onMouseEnter={() => setDragging('right')}
              onMouseLeave={() => setDragging(null)}
              className="w-14 h-14 rounded-full bg-surface border-2 border-[#FF6B9D]/30 hover:border-[#FF6B9D] hover:bg-[#FF6B9D]/10 flex items-center justify-center transition-all text-[#FF6B9D] hover:scale-110 active:scale-95"
            >
              <Heart className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>
      )}

      <DatingProfileModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        form={form}
        setForm={setForm}
        onSave={saveProfile}
        isEdit
        userId={user?.id}
      />

      <Modal open={showResetConfirm} onClose={() => setShowResetConfirm(false)} title="Reset Dating Profile?" size="sm">
        <div className="space-y-4">
          <p className="text-text-secondary text-sm">
            This will permanently delete all your outgoing likes, incoming likes, and matches. Your profile info (photos, bio, preferences) stays intact.
          </p>
          <p className="text-text-muted text-xs">This cannot be undone.</p>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" fullWidth onClick={() => setShowResetConfirm(false)}>
              Cancel
            </Button>
            <Button
              fullWidth
              loading={resettingDating}
              onClick={resetDatingProfile}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Reset
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ── Dating Profile Modal ─────────────────────────────────────────────────────

function PhotoUploader({ photos, setPhotos, userId }: {
  photos: string[]
  setPhotos: (photos: string[]) => void
  userId?: string
}) {
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [cropQueue, setCropQueue] = useState<File[]>([])
  // keep a ref to the growing url list across async crop callbacks
  const pendingUrls = useRef<string[]>([])

  function startCropQueue(files: File[]) {
    const remaining = 10 - photos.length
    const toProcess = files.filter(f => f.type.startsWith('image/')).slice(0, remaining)
    if (toProcess.length === 0) { toast.error('Maximum 10 photos allowed'); return }
    pendingUrls.current = []
    setCropQueue(toProcess.slice(1))
    setCropSrc(URL.createObjectURL(toProcess[0]))
  }

  async function uploadBlob(blob: Blob): Promise<string | null> {
    if (!userId) return null
    const path = `dating/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
    const { error } = await supabase.storage.from('media').upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
    if (error) { toast.error(`Upload failed: ${error.message}`); return null }
    const { data } = supabase.storage.from('media').getPublicUrl(path)
    return data.publicUrl
  }

  async function handleCropDone(blob: Blob) {
    setUploading(true)
    const url = await uploadBlob(blob)
    if (url) pendingUrls.current = [...pendingUrls.current, url]

    if (cropQueue.length > 0) {
      const [next, ...rest] = cropQueue
      setCropQueue(rest)
      setCropSrc(URL.createObjectURL(next))
    } else {
      setCropSrc(null)
      setCropQueue([])
      const newPhotos = [...photos, ...pendingUrls.current].slice(0, 10)
      setPhotos(newPhotos)
      if (pendingUrls.current.length > 0)
        toast.success(`${pendingUrls.current.length} photo${pendingUrls.current.length > 1 ? 's' : ''} uploaded`)
      pendingUrls.current = []
    }
    setUploading(false)
  }

  function removePhoto(idx: number) {
    setPhotos(photos.filter((_, i) => i !== idx))
  }

  return (
    <>
    {cropSrc && (
      <CropModal
        src={cropSrc}
        aspect={1}
        title="Crop Dating Photo"
        onDone={handleCropDone}
        onCancel={() => { setCropSrc(null); setCropQueue([]); pendingUrls.current = [] }}
      />
    )}
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-text-secondary">
          Photos * <span className="text-text-muted font-normal">({photos.length}/10, min 6)</span>
        </p>
        {photos.length < 10 && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1 text-xs text-accent hover:underline"
          >
            <Plus className="w-3.5 h-3.5" />
            {uploading ? 'Uploading…' : 'Add photos'}
          </button>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => { startCropQueue(Array.from(e.target.files ?? [])); e.target.value = '' }}
      />

      {photos.length === 0 ? (
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-[#FF6B9D]/30 hover:border-[#FF6B9D]/60 rounded-2xl p-8 text-center cursor-pointer transition-colors"
        >
          <Upload className="w-8 h-8 text-[#FF6B9D]/50 mx-auto mb-2" />
          <p className="text-sm text-text-secondary">Upload at least 6 photos</p>
          <p className="text-xs text-text-muted mt-1">JPG, PNG, WebP · max 8 MB each</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((url, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden group">
              <img src={url} className="w-full h-full object-cover" alt={`photo ${i + 1}`} />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3 h-3" />
              </button>
              {i === 0 && (
                <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white rounded px-1">Main</span>
              )}
            </div>
          ))}
          {photos.length < 10 && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-[#FF6B9D]/30 hover:border-[#FF6B9D]/60 flex items-center justify-center transition-colors"
            >
              <Plus className="w-6 h-6 text-[#FF6B9D]/50" />
            </button>
          )}
        </div>
      )}
      {photos.length > 0 && photos.length < 6 && (
        <p className="text-xs text-yellow-500">Need {6 - photos.length} more photo{6 - photos.length > 1 ? 's' : ''} to save</p>
      )}
    </div>
    </>
  )
}

function InterestPicker({ interests, setInterests }: {
  interests: string[]
  setInterests: (v: string[]) => void
}) {
  function toggle(item: string) {
    if (interests.includes(item)) {
      setInterests(interests.filter((i) => i !== item))
    } else if (interests.length < 15) {
      setInterests([...interests, item])
    } else {
      toast.error('Maximum 15 interests')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-text-secondary">Interests ({interests.length}/15)</p>
        {interests.length > 0 && (
          <button type="button" onClick={() => setInterests([])} className="text-xs text-text-muted hover:text-red-400">
            Clear all
          </button>
        )}
      </div>

      {INTEREST_CATEGORIES.map(({ label, emoji, items }) => (
        <div key={label}>
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
            {emoji} {label}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {items.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => toggle(item)}
                className={cn(
                  'px-2.5 py-1 rounded-xl text-xs font-medium border transition-all',
                  interests.includes(item)
                    ? 'bg-[#FF6B9D]/10 border-[#FF6B9D] text-[#FF6B9D]'
                    : 'border-surface-border text-text-muted hover:border-[#FF6B9D]/40 hover:text-text-secondary'
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function DatingProfileModal({ open, onClose, form, setForm, onSave, isEdit, userId }: {
  open: boolean
  onClose: () => void
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  onSave: () => void
  isEdit?: boolean
  userId?: string
}) {
  function update<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function toggleLookingFor(val: string) {
    const arr = form.looking_for
    update('looking_for', arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val])
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Dating Profile' : 'Create Dating Profile'} size="lg">
      <div className="space-y-6 max-h-[75vh] overflow-y-auto scrollbar-hide pr-1">

        {/* Photos */}
        <PhotoUploader
          photos={form.photos}
          setPhotos={(p) => update('photos', p)}
          userId={userId}
        />

        {/* Bio */}
        <Textarea
          label="About me"
          placeholder="Tell potential matches about yourself…"
          rows={3}
          value={form.bio}
          onChange={(e) => update('bio', e.target.value)}
        />

        {/* Identity */}
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="I am a... *"
            value={form.sex}
            onChange={(e) => update('sex', e.target.value)}
          >
            <option value="">Select</option>
            <option value="male">Man</option>
            <option value="female">Woman</option>
            <option value="non_binary">Non-binary</option>
            <option value="other">Other</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </Select>
          <Input
            label="Height (cm, optional)"
            type="number"
            placeholder="175"
            value={form.height_cm}
            onChange={(e) => update('height_cm', e.target.value)}
          />
        </div>

        {/* Looking for */}
        <div>
          <p className="text-sm font-medium text-text-secondary mb-2">Interested in... *</p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Men', val: 'male' },
              { label: 'Women', val: 'female' },
              { label: 'Non-binary', val: 'non_binary' },
              { label: 'Everyone', val: 'everyone' },
            ].map(({ label, val }) => (
              <button
                key={val}
                type="button"
                onClick={() => toggleLookingFor(val)}
                className={cn(
                  'px-3 py-1.5 rounded-2xl text-sm font-medium border transition-all',
                  form.looking_for.includes(val)
                    ? 'bg-[#FF6B9D]/10 border-[#FF6B9D] text-[#FF6B9D]'
                    : 'border-surface-border text-text-muted hover:border-[#FF6B9D]/50'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Background */}
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Religion"
            value={form.religion}
            onChange={(e) => update('religion', e.target.value)}
          >
            <option value="">Prefer not to say</option>
            {RELIGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
          <Select
            label="Ethnicity"
            value={form.ethnicity}
            onChange={(e) => update('ethnicity', e.target.value)}
          >
            <option value="">Prefer not to say</option>
            {ETHNICITIES.map((e) => <option key={e} value={e}>{e}</option>)}
          </Select>
        </div>

        {/* Age range */}
        <div>
          <p className="text-sm font-medium text-text-secondary mb-2">Age range</p>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min={18}
              max={100}
              value={form.age_range_min}
              onChange={(e) => update('age_range_min', parseInt(e.target.value) || 18)}
            />
            <span className="text-text-muted flex-shrink-0">to</span>
            <Input
              type="number"
              min={18}
              max={100}
              value={form.age_range_max}
              onChange={(e) => update('age_range_max', parseInt(e.target.value) || 30)}
            />
          </div>
        </div>

        {/* Interests */}
        <InterestPicker
          interests={form.interests}
          setInterests={(v) => update('interests', v)}
        />

        <div className="flex gap-3 pt-2 sticky bottom-0 bg-surface pt-4 border-t border-surface-border">
          <Button variant="outline" fullWidth onClick={onClose}>Cancel</Button>
          <Button fullWidth onClick={onSave} className="bg-[#FF6B9D] hover:bg-[#F05080]">
            {isEdit ? 'Save Changes' : 'Create Profile'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
