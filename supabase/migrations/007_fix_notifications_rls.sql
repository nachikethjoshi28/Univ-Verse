-- Allow any authenticated user to insert notifications for other users
-- (required for like, repost, connection, and comment notifications)
DROP POLICY IF EXISTS "Users can insert their own notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON notifications;

CREATE POLICY "Authenticated users can insert notifications" ON notifications
  FOR INSERT TO authenticated WITH CHECK (true);
