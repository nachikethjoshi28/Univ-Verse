-- ============================================================
--  UNI-VERSE — Complete Database Schema
--  Paste this entire file into Supabase SQL Editor → Run
--  Safe to re-run: uses IF NOT EXISTS / DROP IF EXISTS / OR REPLACE
-- ============================================================

-- ─── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ─── Tables ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.universities (
  id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name   TEXT NOT NULL UNIQUE,
  domain TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email               TEXT NOT NULL,
  username            TEXT UNIQUE,
  full_name           TEXT NOT NULL DEFAULT '',
  bio                 TEXT,
  website             TEXT,
  phone               TEXT,
  avatar_url          TEXT,
  cover_url           TEXT,
  dob                 DATE,
  major               TEXT,
  degree              TEXT,
  university_id       UUID REFERENCES public.universities(id),
  university_name     TEXT,
  enrollment_year     INTEGER,
  graduation_year     INTEGER,
  is_alumni           BOOLEAN NOT NULL DEFAULT FALSE,
  verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  is_admin            BOOLEAN NOT NULL DEFAULT FALSE,
  is_flagged          BOOLEAN NOT NULL DEFAULT FALSE,
  connection_count    INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Add any columns that may be missing in existing installations
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS university_name    TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cover_url          TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone              TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website            TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address            TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS alternative_email  TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS branch             TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS student_id_number  TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS student_id_url     TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS connection_count   INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.connections (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id)
);

CREATE TABLE IF NOT EXISTS public.posts (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content        TEXT NOT NULL,
  media_urls     TEXT[] DEFAULT '{}',
  likes_count    INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  is_flagged     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.post_likes (
  post_id    UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.post_comments (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id    UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.saved_posts (
  post_id    UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  saved_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.dating_profiles (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  bio           TEXT,
  photos        TEXT[] DEFAULT '{}',
  sex           TEXT NOT NULL CHECK (sex IN ('male', 'female', 'non_binary', 'other', 'prefer_not_to_say')),
  race          TEXT,
  religion      TEXT,
  ethnicity     TEXT,
  height_cm     INTEGER,
  looking_for   TEXT[] DEFAULT '{}',
  age_range_min INTEGER NOT NULL DEFAULT 18,
  age_range_max INTEGER NOT NULL DEFAULT 30,
  interests     TEXT[] DEFAULT '{}',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.dating_swipes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  swiper_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  swiped_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  direction  TEXT NOT NULL CHECK (direction IN ('like', 'pass', 'super_like')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(swiper_id, swiped_id)
);

CREATE TABLE IF NOT EXISTS public.dating_matches (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user2_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user1_id, user2_id)
);

CREATE TABLE IF NOT EXISTS public.marketplace_listings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  university_id UUID REFERENCES public.universities(id),
  listing_type  TEXT NOT NULL CHECK (listing_type IN ('sell', 'rent', 'buy_request')),
  title         TEXT NOT NULL,
  description   TEXT,
  price         NUMERIC(10,2),
  rental_period TEXT,
  category      TEXT,
  condition     TEXT CHECK (condition IN ('new', 'like_new', 'good', 'fair', 'poor')),
  images        TEXT[] DEFAULT '{}',
  status        TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'sold', 'rented', 'closed')),
  is_flagged    BOOLEAN NOT NULL DEFAULT FALSE,
  views_count   INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.conversations (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.conversation_participants (
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_at    TIMESTAMPTZ,
  PRIMARY KEY(conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  media_url       TEXT,
  is_flagged      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.communities (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  university_id UUID REFERENCES public.universities(id),
  name          TEXT NOT NULL,
  description   TEXT,
  avatar_url    TEXT,
  cover_url     TEXT,
  is_private    BOOLEAN NOT NULL DEFAULT FALSE,
  is_flagged    BOOLEAN NOT NULL DEFAULT FALSE,
  member_count  INTEGER NOT NULL DEFAULT 1,
  post_count    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.community_members (
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role         TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('member', 'moderator', 'admin')),
  status       TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'pending', 'banned')),
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(community_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.community_posts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content      TEXT NOT NULL,
  media_urls   TEXT[] DEFAULT '{}',
  likes_count  INTEGER NOT NULL DEFAULT 0,
  is_flagged   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.community_post_likes (
  post_id    UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.community_post_comments (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id    UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  data       JSONB,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reports (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL
    CHECK (target_type IN ('profile', 'post', 'listing', 'community', 'message')),
  target_id   UUID NOT NULL,
  reason      TEXT NOT NULL,
  details     TEXT,
  status      TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_actions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id    UUID NOT NULL REFERENCES public.profiles(id),
  action_type TEXT NOT NULL,
  target_type TEXT,
  target_id   UUID,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_verification ON public.profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_posts_user            ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created         ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_likes_post       ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user       ON public.post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post    ON public.post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_mkt_seller            ON public.marketplace_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_mkt_status            ON public.marketplace_listings(status);
CREATE INDEX IF NOT EXISTS idx_mkt_type              ON public.marketplace_listings(listing_type);
CREATE INDEX IF NOT EXISTS idx_mkt_created           ON public.marketplace_listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_convo        ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifs_user           ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifs_unread         ON public.notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_dating_active         ON public.dating_profiles(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_connections_req       ON public.connections(requester_id);
CREATE INDEX IF NOT EXISTS idx_connections_addr      ON public.connections(addressee_id);
CREATE INDEX IF NOT EXISTS idx_comm_members_user     ON public.community_members(user_id);

-- ─── Enable Row Level Security ────────────────────────────────────────────────
ALTER TABLE public.profiles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dating_profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dating_swipes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dating_matches            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_listings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_posts               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_post_likes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_post_comments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_actions             ENABLE ROW LEVEL SECURITY;

-- ─── Helper function: is_conversation_participant() ──────────────────────────
-- SECURITY DEFINER bypasses RLS so it can query conversation_participants
-- without causing infinite recursion in the conv_participants_select policy
CREATE OR REPLACE FUNCTION public.is_conversation_participant(conv_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = conv_id AND user_id = auth.uid()
  )
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public STABLE;

-- ─── RPC: count conversations with unread messages for the current user ───────
CREATE OR REPLACE FUNCTION public.get_unread_conversation_count()
RETURNS INTEGER AS $$
  SELECT COUNT(DISTINCT m.conversation_id)::INTEGER
  FROM public.messages m
  JOIN public.conversation_participants cp
    ON cp.conversation_id = m.conversation_id AND cp.user_id = auth.uid()
  WHERE m.sender_id != auth.uid()
    AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at)
    AND NOT COALESCE(m.is_deleted, FALSE)
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public STABLE;

-- ─── RPC: find or create a direct conversation between auth.uid() and other_user_id ──
CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(other_user_id UUID)
RETURNS UUID AS $$
DECLARE
  conv_id UUID;
BEGIN
  SELECT cp1.conversation_id INTO conv_id
  FROM public.conversation_participants cp1
  JOIN public.conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
  JOIN public.conversations c ON c.id = cp1.conversation_id
  WHERE cp1.user_id = auth.uid()
    AND cp2.user_id = other_user_id
    AND c.type = 'direct'
  LIMIT 1;

  IF conv_id IS NOT NULL THEN RETURN conv_id; END IF;

  INSERT INTO public.conversations (type) VALUES ('direct') RETURNING id INTO conv_id;
  INSERT INTO public.conversation_participants (conversation_id, user_id) VALUES (conv_id, auth.uid());
  INSERT INTO public.conversation_participants (conversation_id, user_id) VALUES (conv_id, other_user_id);
  RETURN conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ─── RPC: find or create an anonymous marketplace conversation ─────────────────
CREATE OR REPLACE FUNCTION public.get_or_create_marketplace_conversation(p_listing_id UUID, p_seller_id UUID)
RETURNS UUID AS $$
DECLARE
  conv_id UUID;
BEGIN
  SELECT cp1.conversation_id INTO conv_id
  FROM public.conversation_participants cp1
  JOIN public.conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
  JOIN public.conversations c ON c.id = cp1.conversation_id
  WHERE cp1.user_id = auth.uid()
    AND cp2.user_id = p_seller_id
    AND c.type = 'marketplace'
    AND c.listing_id = p_listing_id
  LIMIT 1;

  IF conv_id IS NOT NULL THEN RETURN conv_id; END IF;

  INSERT INTO public.conversations (type, listing_id) VALUES ('marketplace', p_listing_id) RETURNING id INTO conv_id;
  INSERT INTO public.conversation_participants (conversation_id, user_id) VALUES (conv_id, auth.uid());
  INSERT INTO public.conversation_participants (conversation_id, user_id) VALUES (conv_id, p_seller_id);
  RETURN conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ─── Helper function: is_admin() ──────────────────────────────────────────────
-- SECURITY DEFINER bypasses RLS so it can safely read profiles without recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    FALSE
  )
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public STABLE;

-- ─── Trigger Functions ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Auto-creates a profile row when a new auth.users record is inserted
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE v_uni_id UUID;
BEGIN
  SELECT id INTO v_uni_id
  FROM public.universities
  WHERE name = (NEW.raw_user_meta_data->>'university_name');

  INSERT INTO public.profiles (
    id, email, full_name, dob,
    university_id, university_name,
    enrollment_year, graduation_year, is_alumni
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'dob', '')::DATE,
    v_uni_id,
    NEW.raw_user_meta_data->>'university_name',
    NULLIF(NEW.raw_user_meta_data->>'enrollment_year', '')::INTEGER,
    NULLIF(NEW.raw_user_meta_data->>'graduation_year', '')::INTEGER,
    COALESCE((NEW.raw_user_meta_data->>'is_alumni')::BOOLEAN, FALSE)
  ) ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.sync_post_likes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.sync_post_comments()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.check_dating_match()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.direction IN ('like', 'super_like') THEN
    IF EXISTS (
      SELECT 1 FROM public.dating_swipes
      WHERE swiper_id = NEW.swiped_id
        AND swiped_id = NEW.swiper_id
        AND direction IN ('like', 'super_like')
    ) THEN
      INSERT INTO public.dating_matches (user1_id, user2_id)
      VALUES (
        LEAST(NEW.swiper_id, NEW.swiped_id),
        GREATEST(NEW.swiper_id, NEW.swiped_id)
      ) ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Notifies ALL verified users when a new marketplace listing is posted
CREATE OR REPLACE FUNCTION public.notify_marketplace_listing()
RETURNS TRIGGER AS $$
DECLARE
  v_name  TEXT;
  v_label TEXT;
BEGIN
  SELECT full_name INTO v_name FROM public.profiles WHERE id = NEW.seller_id;

  v_label := CASE NEW.listing_type
    WHEN 'sell'        THEN 'listed something for sale'
    WHEN 'rent'        THEN 'listed something for rent'
    WHEN 'buy_request' THEN 'posted a buy request'
    ELSE 'posted a new listing'
  END;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT
    p.id,
    'marketplace_listing',
    'New on MarketSpot: ' || NEW.title,
    COALESCE(v_name, 'Someone') || ' ' || v_label,
    jsonb_build_object(
      'listing_id',   NEW.id,
      'listing_type', NEW.listing_type,
      'seller_id',    NEW.seller_id,
      'price',        NEW.price
    )
  FROM public.profiles p
  WHERE p.id != NEW.seller_id
    AND p.verification_status = 'verified';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ─── Triggers ─────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created        ON auth.users;
DROP TRIGGER IF EXISTS trg_profiles_updated_at     ON public.profiles;
DROP TRIGGER IF EXISTS trg_posts_updated_at        ON public.posts;
DROP TRIGGER IF EXISTS trg_mkt_updated_at          ON public.marketplace_listings;
DROP TRIGGER IF EXISTS trg_communities_updated_at  ON public.communities;
DROP TRIGGER IF EXISTS trg_post_likes_sync         ON public.post_likes;
DROP TRIGGER IF EXISTS trg_post_comments_sync      ON public.post_comments;
DROP TRIGGER IF EXISTS trg_dating_match            ON public.dating_swipes;
DROP TRIGGER IF EXISTS trg_mkt_notify              ON public.marketplace_listings;
DROP TRIGGER IF EXISTS trg_marketplace_notify      ON public.marketplace_listings;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_mkt_updated_at
  BEFORE UPDATE ON public.marketplace_listings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_communities_updated_at
  BEFORE UPDATE ON public.communities
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_post_likes_sync
  AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.sync_post_likes();

CREATE TRIGGER trg_post_comments_sync
  AFTER INSERT OR DELETE ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.sync_post_comments();

CREATE TRIGGER trg_dating_match
  AFTER INSERT ON public.dating_swipes
  FOR EACH ROW EXECUTE FUNCTION public.check_dating_match();

CREATE TRIGGER trg_mkt_notify
  AFTER INSERT ON public.marketplace_listings
  FOR EACH ROW EXECUTE FUNCTION public.notify_marketplace_listing();

-- ─── RLS Policies ─────────────────────────────────────────────────────────────
-- NOTE: university_id is no longer used for access control.
--       All verified users can see all content from all universities.

-- profiles
DROP POLICY IF EXISTS "profiles_select"      ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert"      ON public.profiles;
DROP POLICY IF EXISTS "profiles_update"      ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete"      ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin());

-- connections
DROP POLICY IF EXISTS "connections_select" ON public.connections;
DROP POLICY IF EXISTS "connections_insert" ON public.connections;
DROP POLICY IF EXISTS "connections_update" ON public.connections;
DROP POLICY IF EXISTS "connections_delete" ON public.connections;

CREATE POLICY "connections_select" ON public.connections FOR SELECT
  USING (auth.uid() IN (requester_id, addressee_id));
CREATE POLICY "connections_insert" ON public.connections FOR INSERT
  WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "connections_update" ON public.connections FOR UPDATE
  USING (auth.uid() = addressee_id);
CREATE POLICY "connections_delete" ON public.connections FOR DELETE
  USING (auth.uid() IN (requester_id, addressee_id));

-- posts
DROP POLICY IF EXISTS "posts_select" ON public.posts;
DROP POLICY IF EXISTS "posts_insert" ON public.posts;
DROP POLICY IF EXISTS "posts_update" ON public.posts;
DROP POLICY IF EXISTS "posts_delete" ON public.posts;

CREATE POLICY "posts_select" ON public.posts FOR SELECT
  USING (NOT is_flagged OR auth.uid() = user_id OR public.is_admin());
CREATE POLICY "posts_insert" ON public.posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts_update" ON public.posts FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "posts_delete" ON public.posts FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin());

-- post_likes
DROP POLICY IF EXISTS "post_likes_select" ON public.post_likes;
DROP POLICY IF EXISTS "post_likes_insert" ON public.post_likes;
DROP POLICY IF EXISTS "post_likes_delete" ON public.post_likes;

CREATE POLICY "post_likes_select" ON public.post_likes FOR SELECT USING (TRUE);
CREATE POLICY "post_likes_insert" ON public.post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "post_likes_delete" ON public.post_likes FOR DELETE USING (auth.uid() = user_id);

-- post_comments
DROP POLICY IF EXISTS "post_comments_select" ON public.post_comments;
DROP POLICY IF EXISTS "post_comments_insert" ON public.post_comments;
DROP POLICY IF EXISTS "post_comments_delete" ON public.post_comments;

CREATE POLICY "post_comments_select" ON public.post_comments FOR SELECT USING (TRUE);
CREATE POLICY "post_comments_insert" ON public.post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "post_comments_delete" ON public.post_comments FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin());

-- saved_posts
DROP POLICY IF EXISTS "saved_posts_select" ON public.saved_posts;
DROP POLICY IF EXISTS "saved_posts_insert" ON public.saved_posts;
DROP POLICY IF EXISTS "saved_posts_delete" ON public.saved_posts;
CREATE POLICY "saved_posts_select" ON public.saved_posts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "saved_posts_insert" ON public.saved_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "saved_posts_delete" ON public.saved_posts FOR DELETE USING (auth.uid() = user_id);

-- dating_profiles
DROP POLICY IF EXISTS "dating_profiles_select" ON public.dating_profiles;
DROP POLICY IF EXISTS "dating_profiles_insert" ON public.dating_profiles;
DROP POLICY IF EXISTS "dating_profiles_update" ON public.dating_profiles;
DROP POLICY IF EXISTS "dating_profiles_delete" ON public.dating_profiles;

CREATE POLICY "dating_profiles_select" ON public.dating_profiles FOR SELECT
  USING (is_active OR auth.uid() = user_id);
CREATE POLICY "dating_profiles_insert" ON public.dating_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "dating_profiles_update" ON public.dating_profiles FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "dating_profiles_delete" ON public.dating_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- dating_swipes
DROP POLICY IF EXISTS "dating_swipes_select" ON public.dating_swipes;
DROP POLICY IF EXISTS "dating_swipes_insert" ON public.dating_swipes;

CREATE POLICY "dating_swipes_select" ON public.dating_swipes FOR SELECT
  USING (auth.uid() = swiper_id OR auth.uid() = swiped_id);
CREATE POLICY "dating_swipes_insert" ON public.dating_swipes FOR INSERT
  WITH CHECK (auth.uid() = swiper_id);
CREATE POLICY "dating_swipes_delete" ON public.dating_swipes FOR DELETE
  USING (auth.uid() = swiper_id OR auth.uid() = swiped_id);

-- dating_matches
DROP POLICY IF EXISTS "dating_matches_select" ON public.dating_matches;
DROP POLICY IF EXISTS "dating_matches_delete" ON public.dating_matches;

CREATE POLICY "dating_matches_select" ON public.dating_matches FOR SELECT
  USING (auth.uid() IN (user1_id, user2_id));
CREATE POLICY "dating_matches_delete" ON public.dating_matches FOR DELETE
  USING (auth.uid() IN (user1_id, user2_id));

-- marketplace_listings
DROP POLICY IF EXISTS "marketplace_select" ON public.marketplace_listings;
DROP POLICY IF EXISTS "marketplace_insert" ON public.marketplace_listings;
DROP POLICY IF EXISTS "marketplace_update" ON public.marketplace_listings;
DROP POLICY IF EXISTS "marketplace_delete" ON public.marketplace_listings;

CREATE POLICY "marketplace_select" ON public.marketplace_listings FOR SELECT
  USING ((status = 'active' AND NOT is_flagged) OR auth.uid() = seller_id OR public.is_admin());
CREATE POLICY "marketplace_insert" ON public.marketplace_listings FOR INSERT
  WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "marketplace_update" ON public.marketplace_listings FOR UPDATE
  USING (auth.uid() = seller_id OR public.is_admin());
CREATE POLICY "marketplace_delete" ON public.marketplace_listings FOR DELETE
  USING (auth.uid() = seller_id OR public.is_admin());

-- conversations
DROP POLICY IF EXISTS "conversations_select" ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert" ON public.conversations;

CREATE POLICY "conversations_select" ON public.conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = id AND user_id = auth.uid()
    )
  );
CREATE POLICY "conversations_insert" ON public.conversations FOR INSERT WITH CHECK (TRUE);

-- conversation_participants
DROP POLICY IF EXISTS "conv_participants_select" ON public.conversation_participants;
DROP POLICY IF EXISTS "conv_participants_insert" ON public.conversation_participants;
DROP POLICY IF EXISTS "conv_participants_update" ON public.conversation_participants;

CREATE POLICY "conv_participants_select" ON public.conversation_participants FOR SELECT
  USING (public.is_conversation_participant(conversation_id));
CREATE POLICY "conv_participants_insert" ON public.conversation_participants FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "conv_participants_update" ON public.conversation_participants FOR UPDATE
  USING (auth.uid() = user_id);

-- messages
DROP POLICY IF EXISTS "messages_select" ON public.messages;
DROP POLICY IF EXISTS "messages_insert" ON public.messages;

CREATE POLICY "messages_select" ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
  );
CREATE POLICY "messages_insert" ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
  );

-- communities
DROP POLICY IF EXISTS "communities_select" ON public.communities;
DROP POLICY IF EXISTS "communities_insert" ON public.communities;
DROP POLICY IF EXISTS "communities_update" ON public.communities;

CREATE POLICY "communities_select" ON public.communities FOR SELECT
  USING (NOT is_flagged OR auth.uid() = creator_id OR public.is_admin());
CREATE POLICY "communities_insert" ON public.communities FOR INSERT
  WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "communities_update" ON public.communities FOR UPDATE
  USING (auth.uid() = creator_id OR public.is_admin());

-- community_members
DROP POLICY IF EXISTS "community_members_select" ON public.community_members;
DROP POLICY IF EXISTS "community_members_insert" ON public.community_members;
DROP POLICY IF EXISTS "community_members_update" ON public.community_members;

CREATE POLICY "community_members_select" ON public.community_members FOR SELECT USING (TRUE);
CREATE POLICY "community_members_insert" ON public.community_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "community_members_update" ON public.community_members FOR UPDATE
  USING (auth.uid() = user_id);

-- community_posts
DROP POLICY IF EXISTS "community_posts_select" ON public.community_posts;
DROP POLICY IF EXISTS "community_posts_insert" ON public.community_posts;
DROP POLICY IF EXISTS "community_posts_delete" ON public.community_posts;

CREATE POLICY "community_posts_select" ON public.community_posts FOR SELECT
  USING (NOT is_flagged OR auth.uid() = user_id);
CREATE POLICY "community_posts_insert" ON public.community_posts FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.community_members
      WHERE community_id = community_posts.community_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
  );
CREATE POLICY "community_posts_delete" ON public.community_posts FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin());

-- community_post_likes
DROP POLICY IF EXISTS "community_post_likes_select" ON public.community_post_likes;
DROP POLICY IF EXISTS "community_post_likes_insert" ON public.community_post_likes;
DROP POLICY IF EXISTS "community_post_likes_delete" ON public.community_post_likes;

CREATE POLICY "community_post_likes_select" ON public.community_post_likes FOR SELECT USING (TRUE);
CREATE POLICY "community_post_likes_insert" ON public.community_post_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "community_post_likes_delete" ON public.community_post_likes FOR DELETE
  USING (auth.uid() = user_id);

-- community_post_comments
DROP POLICY IF EXISTS "community_post_comments_select" ON public.community_post_comments;
DROP POLICY IF EXISTS "community_post_comments_insert" ON public.community_post_comments;

CREATE POLICY "community_post_comments_select" ON public.community_post_comments FOR SELECT USING (TRUE);
CREATE POLICY "community_post_comments_insert" ON public.community_post_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- notifications
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete" ON public.notifications;

CREATE POLICY "notifications_select" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notifications_delete" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- reports
DROP POLICY IF EXISTS "reports_insert" ON public.reports;
DROP POLICY IF EXISTS "reports_select" ON public.reports;
DROP POLICY IF EXISTS "reports_update" ON public.reports;

CREATE POLICY "reports_insert" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "reports_select" ON public.reports FOR SELECT
  USING (auth.uid() = reporter_id OR public.is_admin());
CREATE POLICY "reports_update" ON public.reports FOR UPDATE USING (public.is_admin());

-- admin_actions
DROP POLICY IF EXISTS "admin_actions_select" ON public.admin_actions;
DROP POLICY IF EXISTS "admin_actions_insert" ON public.admin_actions;

CREATE POLICY "admin_actions_select" ON public.admin_actions FOR SELECT USING (public.is_admin());
CREATE POLICY "admin_actions_insert" ON public.admin_actions FOR INSERT
  WITH CHECK (auth.uid() = admin_id AND public.is_admin());

-- ─── Backfill: set university_name/university_id for existing profiles ─────────
UPDATE public.profiles p
SET
  university_name = u.raw_user_meta_data->>'university_name',
  university_id   = (
    SELECT id FROM public.universities
    WHERE name = u.raw_user_meta_data->>'university_name'
  )
FROM auth.users u
WHERE p.id = u.id
  AND p.university_name IS NULL
  AND u.raw_user_meta_data->>'university_name' IS NOT NULL;

-- ─── Ensure unique constraints exist on universities ─────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.universities'::regclass
      AND contype = 'u'
      AND conname = 'universities_domain_key'
  ) THEN
    ALTER TABLE public.universities ADD CONSTRAINT universities_domain_key UNIQUE (domain);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.universities'::regclass
      AND contype = 'u'
      AND conname = 'universities_name_key'
  ) THEN
    ALTER TABLE public.universities ADD CONSTRAINT universities_name_key UNIQUE (name);
  END IF;
END $$;

-- ─── Seed: Universities ───────────────────────────────────────────────────────
INSERT INTO public.universities (name, domain) VALUES
  ('Harvard University',                               'harvard.edu'),
  ('Stanford University',                              'stanford.edu'),
  ('Massachusetts Institute of Technology',            'mit.edu'),
  ('California Institute of Technology',               'caltech.edu'),
  ('University of Chicago',                            'uchicago.edu'),
  ('Princeton University',                             'princeton.edu'),
  ('Yale University',                                  'yale.edu'),
  ('Columbia University',                              'columbia.edu'),
  ('University of Pennsylvania',                       'upenn.edu'),
  ('Cornell University',                               'cornell.edu'),
  ('Duke University',                                  'duke.edu'),
  ('Northwestern University',                          'northwestern.edu'),
  ('Johns Hopkins University',                         'jhu.edu'),
  ('Dartmouth College',                                'dartmouth.edu'),
  ('Brown University',                                 'brown.edu'),
  ('Vanderbilt University',                            'vanderbilt.edu'),
  ('Rice University',                                  'rice.edu'),
  ('Washington University in St. Louis',               'wustl.edu'),
  ('University of Notre Dame',                         'nd.edu'),
  ('Georgetown University',                            'georgetown.edu'),
  ('Emory University',                                 'emory.edu'),
  ('Carnegie Mellon University',                       'cmu.edu'),
  ('University of California, Berkeley',               'berkeley.edu'),
  ('University of California, Los Angeles',            'ucla.edu'),
  ('University of Michigan',                           'umich.edu'),
  ('University of Virginia',                           'virginia.edu'),
  ('University of North Carolina at Chapel Hill',      'unc.edu'),
  ('University of Southern California',                'usc.edu'),
  ('Wake Forest University',                           'wfu.edu'),
  ('Tufts University',                                 'tufts.edu'),
  ('New York University',                              'nyu.edu'),
  ('Boston College',                                   'bc.edu'),
  ('Boston University',                                'bu.edu'),
  ('University of Rochester',                          'rochester.edu'),
  ('Brandeis University',                              'brandeis.edu'),
  ('Tulane University',                                'tulane.edu'),
  ('Case Western Reserve University',                  'case.edu'),
  ('Lehigh University',                                'lehigh.edu'),
  ('Northeastern University',                          'northeastern.edu'),
  ('University of Miami',                              'miami.edu'),
  ('University of California, San Diego',              'ucsd.edu'),
  ('University of California, Davis',                  'ucdavis.edu'),
  ('University of California, Santa Barbara',          'ucsb.edu'),
  ('University of California, Irvine',                 'uci.edu'),
  ('University of Illinois Urbana-Champaign',          'illinois.edu'),
  ('University of Wisconsin-Madison',                  'wisc.edu'),
  ('University of Minnesota',                          'umn.edu'),
  ('Ohio State University',                            'osu.edu'),
  ('Penn State University',                            'psu.edu'),
  ('Purdue University',                                'purdue.edu'),
  ('University of Washington',                         'uw.edu'),
  ('University of Texas at Austin',                    'utexas.edu'),
  ('Texas A&M University',                             'tamu.edu'),
  ('Georgia Institute of Technology',                  'gatech.edu'),
  ('University of Georgia',                            'uga.edu'),
  ('University of Florida',                            'ufl.edu'),
  ('Florida State University',                         'fsu.edu'),
  ('University of South Florida',                      'usf.edu'),
  ('University of Colorado Boulder',                   'colorado.edu'),
  ('University of Arizona',                            'arizona.edu'),
  ('Arizona State University',                         'asu.edu'),
  ('University of Maryland',                           'umd.edu'),
  ('University of Pittsburgh',                         'pitt.edu'),
  ('Temple University',                                'temple.edu'),
  ('Rutgers University',                               'rutgers.edu'),
  ('Michigan State University',                        'msu.edu'),
  ('Indiana University Bloomington',                   'indiana.edu'),
  ('University of Iowa',                               'uiowa.edu'),
  ('Iowa State University',                            'iastate.edu'),
  ('University of Kansas',                             'ku.edu'),
  ('University of Missouri',                           'missouri.edu'),
  ('University of Nebraska-Lincoln',                   'unl.edu'),
  ('University of Oklahoma',                           'ou.edu'),
  ('Oklahoma State University',                        'okstate.edu'),
  ('University of Arkansas',                           'uark.edu'),
  ('Louisiana State University',                       'lsu.edu'),
  ('University of Tennessee',                          'utk.edu'),
  ('University of Kentucky',                           'uky.edu'),
  ('University of Alabama',                            'ua.edu'),
  ('Auburn University',                                'auburn.edu'),
  ('University of Mississippi',                        'olemiss.edu'),
  ('Mississippi State University',                     'msstate.edu'),
  ('Clemson University',                               'clemson.edu'),
  ('University of South Carolina',                     'sc.edu'),
  ('Virginia Tech',                                    'vt.edu'),
  ('George Mason University',                          'gmu.edu'),
  ('American University',                              'american.edu'),
  ('George Washington University',                     'gwu.edu'),
  ('Howard University',                                'howard.edu'),
  ('Drexel University',                                'drexel.edu'),
  ('Syracuse University',                              'syr.edu'),
  ('Fordham University',                               'fordham.edu'),
  ('Rensselaer Polytechnic Institute',                 'rpi.edu'),
  ('Worcester Polytechnic Institute',                  'wpi.edu'),
  ('Stevens Institute of Technology',                  'stevens.edu'),
  ('Illinois Institute of Technology',                 'iit.edu'),
  ('Marquette University',                             'marquette.edu'),
  ('DePaul University',                                'depaul.edu'),
  ('Loyola University Chicago',                        'luc.edu'),
  ('Saint Louis University',                           'slu.edu'),
  ('University of Denver',                             'du.edu'),
  ('University of Utah',                               'utah.edu'),
  ('Brigham Young University',                         'byu.edu'),
  ('University of Nevada, Las Vegas',                  'unlv.edu'),
  ('University of New Mexico',                         'unm.edu'),
  ('University of Hawaii at Manoa',                    'hawaii.edu'),
  ('University of Oregon',                             'uoregon.edu'),
  ('Oregon State University',                          'oregonstate.edu'),
  ('Portland State University',                        'pdx.edu'),
  ('University of Montana',                            'umt.edu'),
  ('University of Idaho',                              'uidaho.edu'),
  ('Boise State University',                           'boisestate.edu'),
  ('University of Wyoming',                            'uwyo.edu'),
  ('South Dakota State University',                    'sdstate.edu'),
  ('North Dakota State University',                    'ndsu.edu'),
  ('University of North Dakota',                       'und.edu'),
  ('University of South Dakota',                       'usd.edu'),
  ('Montana State University',                         'montana.edu'),
  ('University of Vermont',                            'uvm.edu'),
  ('University of Maine',                              'umaine.edu'),
  ('University of New Hampshire',                      'unh.edu'),
  ('University of Connecticut',                        'uconn.edu'),
  ('University of Rhode Island',                       'uri.edu'),
  ('University of Delaware',                           'udel.edu'),
  ('West Virginia University',                         'wvu.edu'),
  ('University of Cincinnati',                         'uc.edu'),
  ('Miami University',                                 'miamioh.edu'),
  ('Ohio University',                                  'ohio.edu'),
  ('Kent State University',                            'kent.edu'),
  ('Bowling Green State University',                   'bgsu.edu'),
  ('University of Akron',                              'uakron.edu'),
  ('Duquesne University',                              'duq.edu'),
  ('Villanova University',                             'villanova.edu'),
  ('La Salle University',                              'lasalle.edu'),
  ('University of Scranton',                           'scranton.edu'),
  ('Bucknell University',                              'bucknell.edu'),
  ('Lafayette College',                                'lafayette.edu'),
  ('Gettysburg College',                               'gettysburg.edu'),
  ('Dickinson College',                                'dickinson.edu'),
  ('Susquehanna University',                           'susqu.edu'),
  ('Spelman College',                                  'spelman.edu'),
  ('Morehouse College',                                'morehouse.edu'),
  ('Hampton University',                               'hamptonu.edu'),
  ('Xavier University of Louisiana',                   'xula.edu'),
  ('Fisk University',                                  'fisk.edu')
ON CONFLICT DO NOTHING;

-- ─── Add photos column to existing dating_profiles ────────────────────────────
ALTER TABLE public.dating_profiles ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}';
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS comments_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'direct';
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS listing_id UUID REFERENCES public.marketplace_listings(id) ON DELETE SET NULL;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.messages ALTER COLUMN content DROP NOT NULL;

-- Allow updating last_read_at and message read tracking
DROP POLICY IF EXISTS "messages_update" ON public.messages;
CREATE POLICY "messages_update" ON public.messages FOR UPDATE
  USING (public.is_conversation_participant(conversation_id));

-- ─── Function: delete_my_account (called client-side, cleans up auth + data) ──
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS VOID AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ─── Community post like/comment count triggers ────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_community_post_likes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.sync_community_post_comments()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_community_post_likes_sync ON public.community_post_likes;
CREATE TRIGGER trg_community_post_likes_sync
  AFTER INSERT OR DELETE ON public.community_post_likes
  FOR EACH ROW EXECUTE FUNCTION public.sync_community_post_likes();

DROP TRIGGER IF EXISTS trg_community_post_comments_sync ON public.community_post_comments;
CREATE TRIGGER trg_community_post_comments_sync
  AFTER INSERT OR DELETE ON public.community_post_comments
  FOR EACH ROW EXECUTE FUNCTION public.sync_community_post_comments();

-- ─── After running: grant yourself admin + verified ────────────────────────────
-- Uncomment and replace the email below, then run it separately:
-- UPDATE public.profiles
-- SET verification_status = 'verified', is_admin = TRUE
-- WHERE email = 'your-email@usf.edu';
