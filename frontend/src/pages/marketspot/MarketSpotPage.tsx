import { useState, useEffect } from 'react'
import { Plus, Search, ShoppingBag, Tag, RotateCcw, Filter } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import type { MarketplaceListing } from '../../types'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { cn, formatPrice, timeAgo } from '../../lib/utils'
import toast from 'react-hot-toast'

type ListingType = 'sell' | 'rent' | 'buy_request'
type Tab = 'all' | 'sell' | 'rent' | 'buy_request' | 'mine'

const CATEGORIES = ['Textbooks', 'Electronics', 'Clothing', 'Furniture', 'Bikes', 'Appliances', 'Sports', 'Musical Instruments', 'Kitchen', 'Study Materials', 'Other']
const CONDITIONS: { value: string; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
]
const CONDITION_LABEL: Record<string, string> = {
  new: 'New', like_new: 'Like New', good: 'Good', fair: 'Fair', poor: 'Poor',
}

export function MarketSpotPage() {
  const { user } = useAuth()
  const [listings, setListings] = useState<MarketplaceListing[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null)
  const [form, setForm] = useState({
    listing_type: 'sell' as ListingType,
    title: '',
    description: '',
    price: '',
    rental_period: '',
    category: '',
    condition: '',
  })
  const [images, setImages] = useState<File[]>([])
  const [creating, setCreating] = useState(false)

  async function fetchListings() {
    if (!user) return
    let query = supabase
      .from('marketplace_listings')
      .select('*, seller:profiles!marketplace_listings_seller_id_fkey(id, full_name, avatar_url, username)')
      .eq('is_flagged', false)
      .eq('status', 'active')
      .ilike('title', search ? `%${search}%` : '%')
      .order('created_at', { ascending: false })

    if (tab !== 'all' && tab !== 'mine') query = query.eq('listing_type', tab)
    if (tab === 'mine' && user) query = query.eq('seller_id', user.id)

    const { data } = await query.limit(40)
    setListings((data as MarketplaceListing[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchListings() }, [user?.id, tab, search])

  async function createListing() {
    if (!user) return
    if (!form.title.trim()) { toast.error('Title is required'); return }
    setCreating(true)

    let imageUrls: string[] = []
    for (const file of images) {
      const path = `marketplace/${user.id}/${Date.now()}-${file.name}`
      const { error: upErr } = await supabase.storage.from('media').upload(path, file)
      if (!upErr) {
        const { data } = supabase.storage.from('media').getPublicUrl(path)
        imageUrls.push(data.publicUrl)
      }
    }

    const { error } = await supabase.from('marketplace_listings').insert({
      seller_id: user.id,
      listing_type: form.listing_type,
      title: form.title.trim(),
      description: form.description.trim() || null,
      price: form.price ? parseFloat(form.price) : null,
      rental_period: form.rental_period || null,
      category: form.category || null,
      condition: form.condition || null,
      images: imageUrls,
    })

    if (error) toast.error('Failed to create listing')
    else {
      toast.success('Listing created!')
      setShowCreate(false)
      setForm({ listing_type: 'sell', title: '', description: '', price: '', rental_period: '', category: '', condition: '' })
      setImages([])
      fetchListings()
    }
    setCreating(false)
  }

  async function buyNow(listing: MarketplaceListing) {
    if (!user) return
    if (listing.seller_id === user.id) { toast('That\'s your own listing!'); return }

    const { data: convId, error } = await supabase.rpc('get_or_create_marketplace_conversation', {
      p_listing_id: listing.id,
      p_seller_id: listing.seller_id,
    })
    if (error || !convId) { toast.error('Failed to start chat'); return }

    toast.success('Chat started anonymously! Head to Chats to talk with the seller.')
    setSelectedListing(null)
  }

  const tabs: { key: Tab; label: string; icon: typeof ShoppingBag }[] = [
    { key: 'all', label: 'All', icon: ShoppingBag },
    { key: 'sell', label: 'For Sale', icon: Tag },
    { key: 'rent', label: 'For Rent', icon: RotateCcw },
    { key: 'buy_request', label: 'Wanted', icon: Filter },
  ]

  const typeColor: Record<ListingType, string> = {
    sell: 'success',
    rent: 'accent',
    buy_request: 'warning',
  }

  const typeLabel: Record<ListingType, string> = {
    sell: 'For Sale',
    rent: 'For Rent',
    buy_request: 'Wanted',
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">MarketSpot</h1>
          <p className="text-text-muted text-sm mt-1">Buy, sell, and rent within your campus</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" />
          List Item
        </Button>
      </div>

      {/* Search */}
      <Input
        placeholder="Search listings..."
        leftIcon={<Search className="w-4 h-4" />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-hover p-1 rounded-2xl overflow-x-auto scrollbar-hide">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap',
              tab === key ? 'bg-surface text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'
            )}
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => setTab('mine')}
          className={cn(
            'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap',
            tab === 'mine' ? 'bg-surface text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'
          )}
        >
          My Listings
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="aspect-video bg-surface-hover rounded-2xl mb-3" />
              <div className="h-4 bg-surface-hover rounded-full w-3/4 mb-2" />
              <div className="h-3 bg-surface-hover rounded-full w-1/2" />
            </Card>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <Card className="text-center py-16">
          <ShoppingBag className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <p className="text-text-secondary font-medium">No listings found</p>
          <p className="text-text-muted text-sm mt-1">Be the first to list something!</p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {listings.map((listing) => (
            <Card
              key={listing.id}
              hover
              padding="none"
              className="overflow-hidden cursor-pointer"
              onClick={() => setSelectedListing(listing)}
            >
              {/* Image */}
              <div className="aspect-video bg-surface-hover relative">
                {listing.images && listing.images.length > 0 ? (
                  <img src={listing.images[0]} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingBag className="w-10 h-10 text-surface-border" />
                  </div>
                )}
                <div className="absolute top-2 left-2">
                  <Badge variant={typeColor[listing.listing_type] as any}>
                    {typeLabel[listing.listing_type]}
                  </Badge>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-text-primary text-sm truncate">{listing.title}</h3>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-bold text-[#10B981]">
                    {listing.listing_type === 'buy_request' ? 'Offering ' : ''}
                    {formatPrice(listing.price)}
                    {listing.listing_type === 'rent' && listing.rental_period
                      ? ` / ${listing.rental_period.replace('per_', '')}`
                      : ''}
                  </span>
                  {listing.category && (
                    <Badge variant="default" className="text-xs">{listing.category}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs text-text-muted">Anonymous Seller</span>
                  <span className="text-xs text-text-muted ml-auto">{timeAgo(listing.created_at)}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create listing modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Listing" size="lg">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto scrollbar-hide pr-1">
          <div className="flex gap-2">
            {(['sell', 'rent', 'buy_request'] as ListingType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setForm((f) => ({ ...f, listing_type: type }))}
                className={cn(
                  'flex-1 py-2.5 rounded-2xl text-sm font-medium border transition-all',
                  form.listing_type === type
                    ? 'bg-[#10B981]/10 border-[#10B981] text-[#10B981]'
                    : 'border-surface-border text-text-muted hover:border-[#10B981]/50'
                )}
              >
                {typeLabel[type]}
              </button>
            ))}
          </div>

          <Input
            label="Title"
            placeholder="e.g. Calculus Textbook 3rd Edition"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
          <Textarea
            label="Description"
            placeholder="Describe the item, its condition, what's included..."
            rows={3}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Price (USD)"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            />
            {form.listing_type === 'rent' && (
              <Select
                label="Rental Period"
                value={form.rental_period}
                onChange={(e) => setForm((f) => ({ ...f, rental_period: e.target.value }))}
              >
                <option value="per_day">Per Day</option>
                <option value="per_week">Per Week</option>
                <option value="per_month">Per Month</option>
              </Select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Category"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
              <option value="">Select category</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
            {form.listing_type !== 'buy_request' && (
              <Select
                label="Condition"
                value={form.condition}
                onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))}
              >
                <option value="">Select condition</option>
                {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </Select>
            )}
          </div>

          {/* Image upload */}
          <div>
            <label className="text-sm font-medium text-text-secondary mb-1.5 block">Photos</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []).slice(0, 4)
                setImages(files)
              }}
              className="w-full text-sm text-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-2xl file:border-0 file:text-sm file:font-medium file:bg-accent-subtle file:text-accent hover:file:bg-accent/20"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" fullWidth onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button fullWidth loading={creating} onClick={createListing}>
              Create Listing
            </Button>
          </div>
        </div>
      </Modal>

      {/* Listing detail modal */}
      {selectedListing && (
        <Modal open={!!selectedListing} onClose={() => setSelectedListing(null)} title={selectedListing.title} size="lg">
          <div className="space-y-4">
            {selectedListing.images && selectedListing.images.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {selectedListing.images.map((img, i) => (
                  <img key={i} src={img} className="rounded-2xl w-full aspect-video object-cover" />
                ))}
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-[#10B981]">
                {formatPrice(selectedListing.price)}
              </span>
              <Badge variant={typeColor[selectedListing.listing_type] as any}>
                {typeLabel[selectedListing.listing_type]}
              </Badge>
            </div>
            {selectedListing.description && (
              <p className="text-text-secondary text-sm">{selectedListing.description}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {selectedListing.category && <Badge variant="default">{selectedListing.category}</Badge>}
              {selectedListing.condition && <Badge variant="outline">{CONDITION_LABEL[selectedListing.condition] ?? selectedListing.condition}</Badge>}
            </div>
            <div className="flex items-center gap-3 py-3 border-t border-surface-border">
              <div className="w-9 h-9 rounded-full bg-surface-hover flex items-center justify-center flex-shrink-0">
                <ShoppingBag className="w-4 h-4 text-text-muted" />
              </div>
              <div>
                <p className="font-medium text-text-primary text-sm">Anonymous Seller</p>
                <p className="text-xs text-text-muted">Listed {timeAgo(selectedListing.created_at)}</p>
              </div>
            </div>
            {selectedListing.seller_id !== user?.id && (
              <Button
                fullWidth
                onClick={() => buyNow(selectedListing)}
                className="bg-[#10B981] hover:bg-[#0D9F72] text-white"
              >
                <ShoppingBag className="w-4 h-4" />
                Buy Now — Chat Anonymously
              </Button>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
