-- ============================================================
-- Uni-verse — Initial Schema
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- for fuzzy search

-- ─── Universities ─────────────────────────────────────────────────────────────
CREATE TABLE universities (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL UNIQUE,
  domain      TEXT NOT NULL,  -- e.g. 'harvard.edu' for email verification
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Profiles (extends auth.users) ────────────────────────────────────────────
CREATE TABLE profiles (
  id                  UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email               TEXT NOT NULL,
  full_name           TEXT NOT NULL,
  username            TEXT UNIQUE,
  dob                 DATE NOT NULL,
  university_id       UUID REFERENCES universities(id),
  enrollment_year     INTEGER NOT NULL,
  graduation_year     INTEGER NOT NULL,
  major               TEXT,
  degree              TEXT,            -- BS, MS, PhD, MBA, etc.
  branch              TEXT,            -- Computer Science, Mechanical, etc.
  student_id_number   TEXT,
  student_id_url      TEXT,            -- Supabase Storage URL
  is_alumni           BOOLEAN DEFAULT FALSE,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  avatar_url          TEXT,
  cover_url           TEXT,
  bio                 TEXT,
  website             TEXT,
  is_admin            BOOLEAN DEFAULT FALSE,
  theme_preference    TEXT DEFAULT 'light' CHECK (theme_preference IN ('light', 'dark')),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Connections (follow / friend) ────────────────────────────────────────────
CREATE TABLE connections (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id  UUID REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id  UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id)
);

-- ─── Posts ────────────────────────────────────────────────────────────────────
CREATE TABLE posts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content         TEXT,
  media_urls      TEXT[],
  likes_count     INTEGER DEFAULT 0,
  comments_count  INTEGER DEFAULT 0,
  is_flagged      BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE post_likes (
  post_id     UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE post_comments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id     UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  is_flagged  BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Dating Profiles ──────────────────────────────────────────────────────────
CREATE TABLE dating_profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  bio             TEXT,
  photos          TEXT[],
  race            TEXT,
  religion        TEXT,
  ethnicity       TEXT,
  sex             TEXT CHECK (sex IN ('man', 'woman', 'non-binary', 'other', 'prefer_not_to_say')),
  height_cm       INTEGER,
  looking_for     TEXT[],     -- ['men', 'women', 'non-binary', 'everyone']
  age_range_min   INTEGER DEFAULT 18,
  age_range_max   INTEGER DEFAULT 30,
  max_distance_mi INTEGER DEFAULT 25,
  interests       TEXT[],
  is_active       BOOLEAN DEFAULT TRUE,
  last_active     TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE dating_swipes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  swiper_id   UUID REFERENCES profiles(id) ON DELETE CASCADE,
  swiped_id   UUID REFERENCES profiles(id) ON DELETE CASCADE,
  direction   TEXT CHECK (direction IN ('like', 'pass', 'super_like')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(swiper_id, swiped_id)
);

CREATE TABLE dating_matches (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  user2_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user1_id, user2_id)
);

-- ─── Marketplace ──────────────────────────────────────────────────────────────
CREATE TABLE marketplace_listings (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,
  university_id     UUID REFERENCES universities(id),
  listing_type      TEXT NOT NULL CHECK (listing_type IN ('sell', 'rent', 'buy_request')),
  title             TEXT NOT NULL,
  description       TEXT,
  price             NUMERIC(10, 2),
  rental_period     TEXT,   -- 'per_day', 'per_week', 'per_month'
  category          TEXT,   -- 'textbooks', 'electronics', 'clothing', 'furniture', 'other'
  images            TEXT[],
  condition         TEXT CHECK (condition IN ('new', 'like_new', 'good', 'fair', 'poor')),
  status            TEXT DEFAULT 'active' CHECK (status IN ('active', 'sold', 'rented', 'expired', 'pending')),
  stripe_account_id TEXT,
  is_flagged        BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Conversations & Messages ──────────────────────────────────────────────────
CREATE TABLE conversations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type        TEXT DEFAULT 'direct' CHECK (type IN ('direct', 'dating', 'marketplace')),
  listing_id  UUID REFERENCES marketplace_listings(id) ON DELETE SET NULL,  -- for marketplace convos
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE conversation_participants (
  conversation_id  UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id          UUID REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at     TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE messages (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id  UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id        UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content          TEXT,
  media_url        TEXT,
  is_deleted       BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Communities ──────────────────────────────────────────────────────────────
CREATE TABLE communities (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  description   TEXT,
  creator_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  university_id UUID REFERENCES universities(id),
  is_private    BOOLEAN DEFAULT FALSE,
  cover_image   TEXT,
  avatar_image  TEXT,
  member_count  INTEGER DEFAULT 1,
  is_flagged    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE community_members (
  community_id  UUID REFERENCES communities(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role          TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'moderator', 'member')),
  status        TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'banned')),
  joined_at     TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (community_id, user_id)
);

CREATE TABLE community_posts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id    UUID REFERENCES communities(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content         TEXT,
  media_urls      TEXT[],
  likes_count     INTEGER DEFAULT 0,
  comments_count  INTEGER DEFAULT 0,
  is_flagged      BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE community_post_likes (
  post_id     UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE community_post_comments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id     UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  is_flagged  BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Notifications ────────────────────────────────────────────────────────────
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,  -- 'connection_request', 'message', 'like', 'comment', 'match', 'verification', etc.
  title       TEXT NOT NULL,
  body        TEXT,
  data        JSONB,
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Reports / Moderation ─────────────────────────────────────────────────────
CREATE TABLE reports (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reported_type  TEXT NOT NULL CHECK (reported_type IN ('post', 'user', 'listing', 'community', 'comment', 'dating_profile', 'message')),
  reported_id    UUID NOT NULL,
  reason         TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'hate_speech', 'nudity', 'violence', 'misinformation', 'scam', 'other')),
  description    TEXT,
  status         TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'resolved', 'dismissed')),
  resolved_by    UUID REFERENCES profiles(id),
  resolved_at    TIMESTAMPTZ,
  admin_notes    TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Admin Actions Log ────────────────────────────────────────────────────────
CREATE TABLE admin_actions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id     UUID REFERENCES profiles(id),
  action_type  TEXT NOT NULL,  -- 'verify_user', 'reject_user', 'ban_user', 'remove_content', 'dismiss_report'
  target_type  TEXT NOT NULL,
  target_id    UUID NOT NULL,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_profiles_university      ON profiles(university_id);
CREATE INDEX idx_profiles_verification    ON profiles(verification_status);
CREATE INDEX idx_connections_requester    ON connections(requester_id);
CREATE INDEX idx_connections_addressee    ON connections(addressee_id);
CREATE INDEX idx_connections_status       ON connections(status);
CREATE INDEX idx_posts_user               ON posts(user_id);
CREATE INDEX idx_posts_created            ON posts(created_at DESC);
CREATE INDEX idx_messages_conversation    ON messages(conversation_id, created_at ASC);
CREATE INDEX idx_notifications_user       ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_reports_status           ON reports(status, created_at DESC);
CREATE INDEX idx_marketplace_university   ON marketplace_listings(university_id);
CREATE INDEX idx_marketplace_status       ON marketplace_listings(status);
CREATE INDEX idx_community_university     ON communities(university_id);

-- Full-text search on profiles
CREATE INDEX idx_profiles_name_trgm ON profiles USING gin(full_name gin_trgm_ops);
CREATE INDEX idx_profiles_major_trgm ON profiles USING gin(major gin_trgm_ops);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated     BEFORE UPDATE ON profiles             FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_posts_updated        BEFORE UPDATE ON posts                FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_dating_updated       BEFORE UPDATE ON dating_profiles       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_listings_updated     BEFORE UPDATE ON marketplace_listings  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_communities_updated  BEFORE UPDATE ON communities           FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_community_posts_upd  BEFORE UPDATE ON community_posts       FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, dob, enrollment_year, graduation_year)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'dob')::DATE, NOW()::DATE),
    COALESCE((NEW.raw_user_meta_data->>'enrollment_year')::INTEGER, EXTRACT(YEAR FROM NOW())::INTEGER),
    COALESCE((NEW.raw_user_meta_data->>'graduation_year')::INTEGER, EXTRACT(YEAR FROM NOW())::INTEGER + 4)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Sync likes_count on post_likes
CREATE OR REPLACE FUNCTION sync_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_post_likes_sync
  AFTER INSERT OR DELETE ON post_likes
  FOR EACH ROW EXECUTE FUNCTION sync_post_likes_count();

-- Sync comments_count
CREATE OR REPLACE FUNCTION sync_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_post_comments_sync
  AFTER INSERT OR DELETE ON post_comments
  FOR EACH ROW EXECUTE FUNCTION sync_post_comments_count();

-- Auto-create dating match when both users swipe 'like' / 'super_like'
CREATE OR REPLACE FUNCTION check_dating_match()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.direction IN ('like', 'super_like') THEN
    IF EXISTS (
      SELECT 1 FROM dating_swipes
      WHERE swiper_id = NEW.swiped_id
        AND swiped_id = NEW.swiper_id
        AND direction IN ('like', 'super_like')
    ) THEN
      INSERT INTO dating_matches (user1_id, user2_id)
      VALUES (LEAST(NEW.swiper_id, NEW.swiped_id), GREATEST(NEW.swiper_id, NEW.swiped_id))
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_dating_match
  AFTER INSERT ON dating_swipes
  FOR EACH ROW EXECUTE FUNCTION check_dating_match();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections           ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE dating_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE dating_swipes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE dating_matches        ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_listings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages              ENABLE ROW LEVEL SECURITY;
ALTER TABLE communities           ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports               ENABLE ROW LEVEL SECURITY;

-- Profiles: anyone at same university can view verified profiles
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (
    verification_status = 'verified'
    OR auth.uid() = id
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = TRUE)
  );

CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Posts: only connections/same-university can see
CREATE POLICY "posts_select" ON posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles viewer
      JOIN profiles author ON author.id = posts.user_id
      WHERE viewer.id = auth.uid()
        AND viewer.university_id = author.university_id
    )
  );

CREATE POLICY "posts_insert_own" ON posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "posts_update_own" ON posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "posts_delete_own" ON posts FOR DELETE
  USING (auth.uid() = user_id);

-- Messages: only conversation participants
CREATE POLICY "messages_select" ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "messages_insert" ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

-- Notifications: own only
CREATE POLICY "notifications_own" ON notifications FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================
-- SEED: Top 150 US Universities
-- ============================================================
INSERT INTO universities (name, domain) VALUES
  ('Harvard University', 'harvard.edu'),
  ('Stanford University', 'stanford.edu'),
  ('Massachusetts Institute of Technology', 'mit.edu'),
  ('California Institute of Technology', 'caltech.edu'),
  ('University of Chicago', 'uchicago.edu'),
  ('Princeton University', 'princeton.edu'),
  ('Yale University', 'yale.edu'),
  ('Columbia University', 'columbia.edu'),
  ('University of Pennsylvania', 'upenn.edu'),
  ('Cornell University', 'cornell.edu'),
  ('Duke University', 'duke.edu'),
  ('Northwestern University', 'northwestern.edu'),
  ('Johns Hopkins University', 'jhu.edu'),
  ('Dartmouth College', 'dartmouth.edu'),
  ('Brown University', 'brown.edu'),
  ('Vanderbilt University', 'vanderbilt.edu'),
  ('Rice University', 'rice.edu'),
  ('Washington University in St. Louis', 'wustl.edu'),
  ('University of Notre Dame', 'nd.edu'),
  ('Georgetown University', 'georgetown.edu'),
  ('Emory University', 'emory.edu'),
  ('Carnegie Mellon University', 'cmu.edu'),
  ('University of California, Berkeley', 'berkeley.edu'),
  ('University of California, Los Angeles', 'ucla.edu'),
  ('University of Michigan', 'umich.edu'),
  ('University of Virginia', 'virginia.edu'),
  ('University of North Carolina at Chapel Hill', 'unc.edu'),
  ('University of Southern California', 'usc.edu'),
  ('Wake Forest University', 'wfu.edu'),
  ('Tufts University', 'tufts.edu'),
  ('New York University', 'nyu.edu'),
  ('Boston College', 'bc.edu'),
  ('Boston University', 'bu.edu'),
  ('University of Rochester', 'rochester.edu'),
  ('Brandeis University', 'brandeis.edu'),
  ('Tulane University', 'tulane.edu'),
  ('Case Western Reserve University', 'case.edu'),
  ('Lehigh University', 'lehigh.edu'),
  ('Northeastern University', 'northeastern.edu'),
  ('University of Miami', 'miami.edu'),
  ('University of California, San Diego', 'ucsd.edu'),
  ('University of California, Davis', 'ucdavis.edu'),
  ('University of California, Santa Barbara', 'ucsb.edu'),
  ('University of California, Irvine', 'uci.edu'),
  ('University of Illinois Urbana-Champaign', 'illinois.edu'),
  ('University of Wisconsin-Madison', 'wisc.edu'),
  ('University of Minnesota', 'umn.edu'),
  ('Ohio State University', 'osu.edu'),
  ('Penn State University', 'psu.edu'),
  ('Purdue University', 'purdue.edu'),
  ('University of Washington', 'uw.edu'),
  ('University of Texas at Austin', 'utexas.edu'),
  ('Texas A&M University', 'tamu.edu'),
  ('Georgia Institute of Technology', 'gatech.edu'),
  ('University of Georgia', 'uga.edu'),
  ('University of Florida', 'ufl.edu'),
  ('Florida State University', 'fsu.edu'),
  ('University of South Florida', 'usf.edu'),
  ('University of Colorado Boulder', 'colorado.edu'),
  ('University of Arizona', 'arizona.edu'),
  ('Arizona State University', 'asu.edu'),
  ('University of Maryland', 'umd.edu'),
  ('University of Pittsburgh', 'pitt.edu'),
  ('Temple University', 'temple.edu'),
  ('Rutgers University', 'rutgers.edu'),
  ('Michigan State University', 'msu.edu'),
  ('Indiana University Bloomington', 'indiana.edu'),
  ('University of Iowa', 'uiowa.edu'),
  ('Iowa State University', 'iastate.edu'),
  ('University of Kansas', 'ku.edu'),
  ('University of Missouri', 'missouri.edu'),
  ('University of Nebraska-Lincoln', 'unl.edu'),
  ('University of Oklahoma', 'ou.edu'),
  ('Oklahoma State University', 'okstate.edu'),
  ('University of Arkansas', 'uark.edu'),
  ('Louisiana State University', 'lsu.edu'),
  ('University of Tennessee', 'utk.edu'),
  ('University of Kentucky', 'uky.edu'),
  ('University of Alabama', 'ua.edu'),
  ('Auburn University', 'auburn.edu'),
  ('University of Mississippi', 'olemiss.edu'),
  ('Mississippi State University', 'msstate.edu'),
  ('Clemson University', 'clemson.edu'),
  ('University of South Carolina', 'sc.edu'),
  ('Virginia Tech', 'vt.edu'),
  ('George Mason University', 'gmu.edu'),
  ('American University', 'american.edu'),
  ('George Washington University', 'gwu.edu'),
  ('Howard University', 'howard.edu'),
  ('Drexel University', 'drexel.edu'),
  ('Syracuse University', 'syr.edu'),
  ('Fordham University', 'fordham.edu'),
  ('Rensselaer Polytechnic Institute', 'rpi.edu'),
  ('Worcester Polytechnic Institute', 'wpi.edu'),
  ('Stevens Institute of Technology', 'stevens.edu'),
  ('Illinois Institute of Technology', 'iit.edu'),
  ('Marquette University', 'marquette.edu'),
  ('DePaul University', 'depaul.edu'),
  ('Loyola University Chicago', 'luc.edu'),
  ('Saint Louis University', 'slu.edu'),
  ('University of Denver', 'du.edu'),
  ('University of Utah', 'utah.edu'),
  ('Brigham Young University', 'byu.edu'),
  ('University of Nevada, Las Vegas', 'unlv.edu'),
  ('University of New Mexico', 'unm.edu'),
  ('University of Hawaii at Manoa', 'hawaii.edu'),
  ('University of Oregon', 'uoregon.edu'),
  ('Oregon State University', 'oregonstate.edu'),
  ('Portland State University', 'pdx.edu'),
  ('University of Montana', 'umt.edu'),
  ('University of Idaho', 'uidaho.edu'),
  ('Boise State University', 'boisestate.edu'),
  ('University of Wyoming', 'uwyo.edu'),
  ('South Dakota State University', 'sdstate.edu'),
  ('North Dakota State University', 'ndsu.edu'),
  ('University of North Dakota', 'und.edu'),
  ('University of South Dakota', 'usd.edu'),
  ('Montana State University', 'montana.edu'),
  ('University of Vermont', 'uvm.edu'),
  ('University of Maine', 'umaine.edu'),
  ('University of New Hampshire', 'unh.edu'),
  ('University of Connecticut', 'uconn.edu'),
  ('University of Rhode Island', 'uri.edu'),
  ('University of Delaware', 'udel.edu'),
  ('West Virginia University', 'wvu.edu'),
  ('University of Cincinnati', 'uc.edu'),
  ('Miami University', 'miamioh.edu'),
  ('Ohio University', 'ohio.edu'),
  ('Kent State University', 'kent.edu'),
  ('Bowling Green State University', 'bgsu.edu'),
  ('University of Akron', 'uakron.edu'),
  ('Duquesne University', 'duq.edu'),
  ('Villanova University', 'villanova.edu'),
  ('La Salle University', 'lasalle.edu'),
  ('University of Scranton', 'scranton.edu'),
  ('Bucknell University', 'bucknell.edu'),
  ('Lafayette College', 'lafayette.edu'),
  ('Gettysburg College', 'gettysburg.edu'),
  ('Dickinson College', 'dickinson.edu'),
  ('Susquehanna University', 'susqu.edu'),
  ('Spelman College', 'spelman.edu'),
  ('Morehouse College', 'morehouse.edu'),
  ('Hampton University', 'hamptonu.edu'),
  ('Xavier University of Louisiana', 'xula.edu'),
  ('Fisk University', 'fisk.edu');
