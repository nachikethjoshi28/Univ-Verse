export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected'
export type VerificationDocumentType = 'student_id' | 'diploma'
export type ConnectionStatus = 'pending' | 'accepted' | 'rejected' | 'blocked'
export type ListingType = 'sell' | 'rent' | 'buy_request'
export type ListingStatus = 'active' | 'sold' | 'rented' | 'expired' | 'pending'
export type ReportReason = 'spam' | 'harassment' | 'hate_speech' | 'nudity' | 'violence' | 'misinformation' | 'scam' | 'other'
export type ReportStatus = 'pending' | 'under_review' | 'resolved' | 'dismissed'
export type AppSection = 'home' | 'connect' | 'dates' | 'market' | 'chats' | 'community' | 'profile' | 'admin'

export interface University {
  id: string
  name: string
  domain: string
  created_at: string
}

export type SubscriptionPlan = 'free' | 'silver' | 'gold'

export interface Profile {
  id: string
  email: string
  full_name: string
  username: string | null
  dob: string
  university_id: string | null
  university_name: string | null
  enrollment_year: number
  graduation_year: number
  major: string | null
  degree: string | null
  branch: string | null
  phone: string | null
  address: string | null
  alternative_email: string | null
  student_id_number: string | null
  student_id_url: string | null
  is_alumni: boolean
  verification_status: VerificationStatus
  verification_document_type: VerificationDocumentType | null
  verification_submitted_at: string | null
  is_private: boolean
  is_deactivated: boolean
  subscription_plan: SubscriptionPlan
  subscription_status: string | null
  subscription_period_end: string | null
  stripe_customer_id: string | null
  avatar_url: string | null
  cover_url: string | null
  bio: string | null
  website: string | null
  is_admin: boolean
  theme_preference: 'light' | 'dark'
  account_type: 'user' | 'page'
  page_category: string | null
  allow_tagging: boolean
  followers_count: number
  created_at: string
  updated_at: string
  // joined fields
  university?: University
}

export interface Connection {
  id: string
  requester_id: string
  addressee_id: string
  status: ConnectionStatus
  created_at: string
  updated_at: string
  requester?: Profile
  addressee?: Profile
}

export interface Post {
  id: string
  user_id: string
  content: string | null
  media_urls: string[] | null
  location: string | null
  music_track: string | null
  likes_count: number
  comments_count: number
  reposts_count: number
  repost_of_id?: string | null
  is_flagged: boolean
  created_at: string
  updated_at: string
  author?: Profile
  liked_by_me?: boolean
  // client-side computed
  original_post?: Post | null
}

export interface PostComment {
  id: string
  post_id: string
  user_id: string
  content: string
  is_flagged: boolean
  created_at: string
  author?: Profile
}

export interface DatingProfile {
  id: string
  user_id: string
  bio: string | null
  photos: string[]
  race: string | null
  religion: string | null
  ethnicity: string | null
  sex: string | null
  height_cm: number | null
  looking_for: string[]
  age_range_min: number
  age_range_max: number
  max_distance_mi: number
  interests: string[]
  is_active: boolean
  last_active: string
  created_at: string
  updated_at: string
  profile?: Profile
}

export interface DatingMatch {
  id: string
  user1_id: string
  user2_id: string
  created_at: string
  other_user?: Profile
  other_dating_profile?: DatingProfile
}

export interface MarketplaceListing {
  id: string
  seller_id: string
  university_id: string
  listing_type: ListingType
  title: string
  description: string | null
  price: number | null
  rental_period: string | null
  category: string | null
  images: string[]
  condition: string | null
  status: ListingStatus
  stripe_account_id: string | null
  is_flagged: boolean
  created_at: string
  updated_at: string
  seller?: Profile
}

export interface Conversation {
  id: string
  type: 'direct' | 'dating' | 'marketplace'
  listing_id: string | null
  created_at: string
  participants?: Profile[]
  last_message?: Message
  unread_count?: number
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string | null
  media_url: string | null
  iv: string | null
  is_deleted: boolean
  created_at: string
  sender?: Profile
}

export interface Community {
  id: string
  name: string
  description: string | null
  creator_id: string
  university_id: string
  is_private: boolean
  cover_image: string | null
  avatar_image: string | null
  member_count: number
  is_flagged: boolean
  created_at: string
  updated_at: string
  creator?: Profile
  my_membership?: CommunityMember
}

export interface CommunityMember {
  community_id: string
  user_id: string
  role: 'owner' | 'admin' | 'moderator' | 'member'
  status: 'pending' | 'active' | 'banned'
  joined_at: string
  profile?: Profile
}

export interface CommunityPost {
  id: string
  community_id: string
  user_id: string
  content: string | null
  media_urls: string[] | null
  likes_count: number
  comments_count: number
  is_flagged: boolean
  created_at: string
  updated_at: string
  author?: Profile
  liked_by_me?: boolean
}

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  data: Record<string, unknown> | null
  is_read: boolean
  created_at: string
}

export interface ProfileChangeRequest {
  id: string
  user_id: string
  field_name: string
  current_value: string | null
  requested_value: string
  evidence_url: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  profile?: Profile
}

export interface Report {
  id: string
  reporter_id: string
  reported_type: string
  reported_id: string
  reason: ReportReason
  description: string | null
  status: ReportStatus
  resolved_by: string | null
  resolved_at: string | null
  admin_notes: string | null
  created_at: string
  reporter?: Profile
}
