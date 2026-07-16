import { Router } from 'express'
import { supabase } from '../../lib/supabase.js'
import { requireAuth } from '../../middleware/auth.js'
import { sendVerificationApprovedEmail, sendVerificationRejectedEmail } from '../../lib/email.js'

const router = Router()

// Send verification result email (called internally after admin action)
router.post('/verification-result', requireAuth, async (req, res) => {
  const { user_id, status, reason } = req.body

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user_id)
    .single()

  if (!profile) return res.status(404).json({ error: 'User not found' })

  try {
    if (status === 'verified') {
      await sendVerificationApprovedEmail({ to: profile.email, name: profile.full_name.split(' ')[0] })
    } else {
      await sendVerificationRejectedEmail({ to: profile.email, name: profile.full_name.split(' ')[0], reason })
    }
    res.json({ sent: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
