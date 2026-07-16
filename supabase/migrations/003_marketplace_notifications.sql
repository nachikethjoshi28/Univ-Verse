-- ============================================================
-- 003: MarketSpot notification trigger
--      + null-safe posts_select policy fix
-- ============================================================

-- ─── 1. Null-safe posts_select policy ─────────────────────────────────────────
-- Original policy fails when university_id is NULL (NULL = NULL → NULL → false)
DROP POLICY IF EXISTS "posts_select" ON posts;
CREATE POLICY "posts_select" ON posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles viewer
      JOIN profiles author ON author.id = posts.user_id
      WHERE viewer.id = auth.uid()
        AND viewer.university_id IS NOT NULL
        AND viewer.university_id = author.university_id
    )
    OR auth.uid() = user_id
  );

-- ─── 2. Marketplace notification trigger ──────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_new_marketplace_listing()
RETURNS TRIGGER AS $$
DECLARE
  v_seller_name TEXT;
  v_type_label  TEXT;
BEGIN
  SELECT full_name INTO v_seller_name
  FROM public.profiles WHERE id = NEW.seller_id;

  v_type_label := CASE NEW.listing_type
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
    COALESCE(v_seller_name, 'Someone') || ' ' || v_type_label,
    jsonb_build_object(
      'listing_id',   NEW.id,
      'listing_type', NEW.listing_type,
      'seller_id',    NEW.seller_id,
      'price',        NEW.price
    )
  FROM public.profiles p
  WHERE p.university_id = NEW.university_id
    AND p.id != NEW.seller_id
    AND p.verification_status = 'verified';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_marketplace_notify
  AFTER INSERT ON marketplace_listings
  FOR EACH ROW EXECUTE FUNCTION notify_new_marketplace_listing();
