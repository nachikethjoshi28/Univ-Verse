-- ============================================================
--  UNI-VERSE — Development Seed Data
--  Run AFTER schema.sql in Supabase SQL Editor
--  Creates 5 demo users + posts, listings, communities, etc.
--  All demo accounts use password: DemoPass123!
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  u1 UUID := '11111111-1111-1111-1111-111111111111';
  u2 UUID := '22222222-2222-2222-2222-222222222222';
  u3 UUID := '33333333-3333-3333-3333-333333333333';
  u4 UUID := '44444444-4444-4444-4444-444444444444';
  u5 UUID := '55555555-5555-5555-5555-555555555555';
  usf_id UUID;
  comm1 UUID := uuid_generate_v4();
  comm2 UUID := uuid_generate_v4();
  comm3 UUID := uuid_generate_v4();
BEGIN
  SELECT id INTO usf_id FROM public.universities WHERE domain = 'usf.edu';

  -- ── Insert demo auth users ────────────────────────────────────────────────
  INSERT INTO auth.users (
    id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_user_meta_data, raw_app_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    is_super_admin
  ) VALUES
  (u1, 'authenticated', 'authenticated', 'alex.johnson@usf.edu',
    crypt('DemoPass123!', gen_salt('bf')), NOW(),
    '{"full_name":"Alex Johnson","dob":"2001-04-12","enrollment_year":"2021","graduation_year":"2025","university_name":"University of South Florida","is_alumni":"false"}',
    '{"provider":"email","providers":["email"]}', NOW(), NOW(), '', '', FALSE),

  (u2, 'authenticated', 'authenticated', 'priya.patel@usf.edu',
    crypt('DemoPass123!', gen_salt('bf')), NOW(),
    '{"full_name":"Priya Patel","dob":"2002-09-23","enrollment_year":"2022","graduation_year":"2026","university_name":"University of South Florida","is_alumni":"false"}',
    '{"provider":"email","providers":["email"]}', NOW(), NOW(), '', '', FALSE),

  (u3, 'authenticated', 'authenticated', 'marcus.williams@usf.edu',
    crypt('DemoPass123!', gen_salt('bf')), NOW(),
    '{"full_name":"Marcus Williams","dob":"2000-11-08","enrollment_year":"2020","graduation_year":"2024","university_name":"University of South Florida","is_alumni":"false"}',
    '{"provider":"email","providers":["email"]}', NOW(), NOW(), '', '', FALSE),

  (u4, 'authenticated', 'authenticated', 'sofia.garcia@usf.edu',
    crypt('DemoPass123!', gen_salt('bf')), NOW(),
    '{"full_name":"Sofia Garcia","dob":"2001-07-30","enrollment_year":"2021","graduation_year":"2025","university_name":"University of South Florida","is_alumni":"false"}',
    '{"provider":"email","providers":["email"]}', NOW(), NOW(), '', '', FALSE),

  (u5, 'authenticated', 'authenticated', 'james.lee@usf.edu',
    crypt('DemoPass123!', gen_salt('bf')), NOW(),
    '{"full_name":"James Lee","dob":"2003-02-14","enrollment_year":"2023","graduation_year":"2027","university_name":"University of South Florida","is_alumni":"false"}',
    '{"provider":"email","providers":["email"]}', NOW(), NOW(), '', '', FALSE)
  ON CONFLICT (id) DO NOTHING;

  -- ── Enrich profiles (trigger already created them with basic info) ─────────
  UPDATE public.profiles SET
    username = 'alex_johnson',
    major = 'Computer Science',
    degree = 'Bachelor of Science (BS)',
    bio = 'CS junior @ USF. Into AI, open-source, and late-night hackathons. Bulls Up! 🤘',
    university_id = usf_id,
    university_name = 'University of South Florida',
    avatar_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=alexjohnson&backgroundColor=4F7BF7&clothingColor=3c4f5c',
    enrollment_year = 2021,
    graduation_year = 2025,
    verification_status = 'verified'
  WHERE id = u1;

  UPDATE public.profiles SET
    username = 'priya_patel',
    major = 'Business Administration',
    degree = 'Bachelor of Arts (BA)',
    bio = 'Aspiring entrepreneur & finance nerd 💼. USF Muma College of Business. Love chai and good vibes.',
    university_id = usf_id,
    university_name = 'University of South Florida',
    avatar_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=priyapatel&backgroundColor=FF6B9D',
    enrollment_year = 2022,
    graduation_year = 2026,
    verification_status = 'verified'
  WHERE id = u2;

  UPDATE public.profiles SET
    username = 'marcus_w',
    major = 'Electrical Engineering',
    degree = 'Bachelor of Science (BS)',
    bio = 'EE junior building cool stuff in the lab. Gym, basketball, and good music keep me sane. 🏀',
    university_id = usf_id,
    university_name = 'University of South Florida',
    avatar_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=marcuswilliams&backgroundColor=10B981',
    enrollment_year = 2020,
    graduation_year = 2024,
    verification_status = 'verified'
  WHERE id = u3;

  UPDATE public.profiles SET
    username = 'sofia_g',
    major = 'Psychology',
    degree = 'Bachelor of Arts (BA)',
    bio = 'Psychology student & mental health advocate 🌻. USF peer counselor. Art, travel, and coffee lover.',
    university_id = usf_id,
    university_name = 'University of South Florida',
    avatar_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=sofiagarcia&backgroundColor=8B5CF6',
    enrollment_year = 2021,
    graduation_year = 2025,
    verification_status = 'verified'
  WHERE id = u4;

  UPDATE public.profiles SET
    username = 'james_lee',
    major = 'Mathematics',
    degree = 'Bachelor of Science (BS)',
    bio = 'Math & stats sophomore. If it involves numbers, I am in. Also really into chess and K-pop.',
    university_id = usf_id,
    university_name = 'University of South Florida',
    avatar_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=jameslee&backgroundColor=F59E0B',
    enrollment_year = 2023,
    graduation_year = 2027,
    verification_status = 'verified'
  WHERE id = u5;

  -- ── Posts ─────────────────────────────────────────────────────────────────
  INSERT INTO public.posts (user_id, content, likes_count, comments_count, created_at) VALUES
  (u1, E'Just aced my COP 4020 midterm! \U0001F389 For anyone in Prof. Rodriguez''s section — the material on concurrency is 100% on the final. Study those thread-safe patterns!\n\n#USFBulls #ComputerScience', 24, 5, NOW() - INTERVAL '3 hours'),
  (u2, E'Anyone else think the MSC needs more quiet study spaces? The library gets way too crowded during finals week. We should petition for extended hours too. \U0001F4DA\n\nWho''s with me?', 41, 12, NOW() - INTERVAL '8 hours'),
  (u3, E'USF Intramural Basketball sign-ups close Friday! Our team is one player short — we need a point guard. DM me if you can ball. All skill levels welcome \U0001F3C0\U0001F525', 18, 7, NOW() - INTERVAL '1 day'),
  (u4, E'Reminder: the Counseling Center offers FREE sessions for all enrolled students. Mental health is health. No shame in asking for support \U0001F33B\n\nSchedule at usf.edu/counseling', 67, 3, NOW() - INTERVAL '2 days'),
  (u5, E'Found a perfect shortcut between ENB and the library — takes 4 minutes instead of 10. Happy to share the route for anyone who needs it! Pro-tip: cut through the science quad \U0001F5FA️', 33, 9, NOW() - INTERVAL '3 days'),
  (u1, E'Hosting a casual CS project showcase in the engineering building atrium next Tuesday at 4 PM. All majors welcome to present or just come watch!\n\nLight refreshments provided \U0001F382', 19, 4, NOW() - INTERVAL '4 days')
  ON CONFLICT DO NOTHING;

  -- ── Connections ───────────────────────────────────────────────────────────
  INSERT INTO public.connections (requester_id, addressee_id, status) VALUES
  (u1, u2, 'accepted'),
  (u1, u3, 'accepted'),
  (u2, u4, 'accepted'),
  (u3, u5, 'pending'),
  (u4, u1, 'pending')
  ON CONFLICT DO NOTHING;

  -- ── Marketplace Listings ──────────────────────────────────────────────────
  INSERT INTO public.marketplace_listings (
    seller_id, university_id, listing_type, title, description,
    price, category, condition, status, created_at
  ) VALUES
  (u1, usf_id, 'sell', 'Operating Systems Textbook — Silberschatz 10th Ed',
    'Used for COP 4600. Great condition, minimal highlighting. Selling because I passed! 😄',
    35.00, 'Textbooks', 'good', 'active', NOW() - INTERVAL '2 hours'),

  (u2, usf_id, 'sell', 'TI-84 Plus CE Calculator — Like New',
    'Used for one semester only. Comes with charger cable and protective case. Perfect for any STEM course.',
    55.00, 'Electronics', 'like_new', 'active', NOW() - INTERVAL '5 hours'),

  (u3, usf_id, 'rent', 'Trek Marlin 6 Mountain Bike',
    'Barely used. Perfect for getting around campus. Available for rent by week or month.',
    40.00, 'Other', 'good', 'active', NOW() - INTERVAL '1 day'),

  (u4, usf_id, 'buy_request', 'Wanted: Intro to Psychology Textbook (Myers 13th Ed)',
    'Need for PSY 2012 this semester. Looking to pay $25-30. Message me if you have a copy!',
    25.00, 'Textbooks', NULL, 'active', NOW() - INTERVAL '1 day'),

  (u5, usf_id, 'sell', 'IKEA Micke Desk — White',
    'Moving out of dorms. Desk is in excellent condition, no scratches. Must pick up from USF area.',
    60.00, 'Furniture', 'like_new', 'active', NOW() - INTERVAL '2 days'),

  (u1, usf_id, 'sell', 'Sony WH-1000XM4 Headphones',
    'Selling my noise-cancelling headphones — upgrading. Comes with original box and cable. Barely used.',
    180.00, 'Electronics', 'like_new', 'active', NOW() - INTERVAL '3 days')
  ON CONFLICT DO NOTHING;

  -- ── Communities ───────────────────────────────────────────────────────────
  INSERT INTO public.communities (
    id, creator_id, university_id, name, description,
    is_private, member_count, post_count, created_at
  ) VALUES
  (comm1, u1, usf_id, 'USF Bulls CS Club',
    'The official hub for Computer Science students at USF. Share projects, find collaborators, prep for interviews, and stay updated on tech events on campus.',
    FALSE, 142, 38, NOW() - INTERVAL '60 days'),

  (comm2, u4, usf_id, 'USF Mental Health & Wellness',
    'A safe, supportive community for USF students to share resources, discuss wellness, and check in on each other. You are not alone. 🌻',
    FALSE, 89, 24, NOW() - INTERVAL '45 days'),

  (comm3, u2, usf_id, 'Tampa Bay Foodies @ USF',
    'From on-campus dining hacks to hidden gems around Tampa Bay — share reviews, plan foodie outings, and discover the best spots near campus.',
    FALSE, 67, 19, NOW() - INTERVAL '30 days')
  ON CONFLICT (id) DO NOTHING;

  -- Add creators as members
  INSERT INTO public.community_members (community_id, user_id, role, status) VALUES
  (comm1, u1, 'admin', 'active'),
  (comm1, u2, 'member', 'active'),
  (comm1, u3, 'member', 'active'),
  (comm1, u5, 'member', 'active'),
  (comm2, u4, 'admin', 'active'),
  (comm2, u2, 'member', 'active'),
  (comm2, u1, 'member', 'active'),
  (comm3, u2, 'admin', 'active'),
  (comm3, u4, 'member', 'active'),
  (comm3, u3, 'member', 'active')
  ON CONFLICT DO NOTHING;

  -- ── Dating Profiles ───────────────────────────────────────────────────────
  INSERT INTO public.dating_profiles (
    user_id, bio, sex, ethnicity, height_cm,
    looking_for, age_range_min, age_range_max, interests, is_active
  ) VALUES
  (u1, 'CS nerd who loves building things, going to concerts, and trying every food truck in Tampa. Looking for someone who can match my energy and laugh at my terrible coding jokes. 😄',
    'male', 'White / Caucasian', 180,
    ARRAY['female', 'non_binary'],
    19, 26,
    ARRAY['Gaming', 'Live Music & Concerts', 'Coffee Culture', 'Hiking / Trekking', 'Indie Films', 'Programming / Coding'],
    TRUE),

  (u2, 'Future CEO energy with a soft spot for Bollywood movies, strong chai, and spontaneous road trips. Probably planning my next startup between classes.',
    'female', 'South Asian', 162,
    ARRAY['male'],
    20, 27,
    ARRAY['Bollywood / Indian Cinema', 'Entrepreneurship', 'Travel', 'Dance Fitness', 'Coffee Culture', 'Cooking', 'K-Pop'],
    TRUE),

  (u4, 'Art journaling, thrift shopping, and making people smile. Psychology student who genuinely listens. Looking for someone authentic and kind.',
    'female', 'Hispanic / Latino', 165,
    ARRAY['male', 'female', 'non_binary'],
    19, 27,
    ARRAY['Painting', 'Yoga', 'Meditation / Mindfulness', 'Indie Films', 'Live Music & Concerts', 'Thrift Shopping', 'Volunteering / Community Service'],
    TRUE)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Seed data inserted successfully. Demo accounts: alex.johnson@usf.edu, priya.patel@usf.edu, marcus.williams@usf.edu, sofia.garcia@usf.edu, james.lee@usf.edu — password: DemoPass123!';
END $$;

-- ── Sample notifications (insert after main block so we can use sub-selects) ──
INSERT INTO public.notifications (user_id, type, title, body, is_read, created_at)
SELECT p.id,
  n.type, n.title, n.body, n.is_read, NOW() - n.age
FROM public.profiles p
CROSS JOIN (VALUES
  ('marketplace_listing', 'New on MarketSpot: Sony WH-1000XM4 Headphones', 'Alex Johnson listed something for sale', FALSE, INTERVAL '2 hours'),
  ('marketplace_listing', 'New on MarketSpot: IKEA Micke Desk — White', 'James Lee listed something for sale', FALSE, INTERVAL '1 day'),
  ('connection_request', 'New connection request', 'Sofia Garcia wants to connect with you', FALSE, INTERVAL '3 hours'),
  ('verification', 'Your account has been verified!', 'Welcome to Uni-verse — you now have full access.', TRUE, INTERVAL '5 days'),
  ('community', 'Welcome to USF Bulls CS Club', 'You have joined a community. Say hi!', TRUE, INTERVAL '55 days')
) AS n(type, title, body, is_read, age)
WHERE p.email = 'nachikethjoshi28@gmail.com'
   OR p.verification_status = 'verified'
LIMIT 5
ON CONFLICT DO NOTHING;
