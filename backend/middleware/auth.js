import { supabase } from '../lib/supabase.js'

export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Missing authorization token' })

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: 'Invalid or expired token' })

  req.user = user
  next()
}

export async function requireAdmin(req, res, next) {
  await requireAuth(req, res, async () => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', req.user.id)
      .single()

    if (!profile?.is_admin) return res.status(403).json({ error: 'Admin access required' })
    next()
  })
}
