import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Clock, ShieldX } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Button } from './ui/Button'

interface Props {
  children: React.ReactNode
}

interface FreshCheck {
  account_type: string | null
  is_admin: boolean
  verification_status: string | null
}

export function VerificationGate({ children }: Props) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [check, setCheck] = useState<FreshCheck | null>(null)

  // Always query the DB directly — never rely on the cached profile in context.
  // This prevents stale data from bypassing the gate.
  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('account_type, is_admin, verification_status, student_id_url')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error('[VerificationGate] DB query failed:', error.message)
          return
        }
        console.log('[VerificationGate]', {
          account_type: data?.account_type,
          is_admin: data?.is_admin,
          verification_status: data?.verification_status,
          student_id_url: data?.student_id_url ?? '(none)',
        })
        setCheck({
          account_type: data?.account_type ?? null,
          is_admin: data?.is_admin ?? false,
          verification_status: data?.verification_status ?? null,
        })
      })
  }, [user?.id])

  // Still loading the fresh check
  if (!user || !check) return null

  // Page accounts and admins always pass through
  if (check.account_type === 'page' || check.is_admin) return <>{children}</>

  const status = check.verification_status ?? 'unverified'

  if (status === 'verified') return <>{children}</>

  if (status === 'pending') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-3xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mb-5">
          <Clock className="w-8 h-8 text-yellow-500" />
        </div>
        <h2 className="text-xl font-bold text-text-primary mb-2">Documents Under Review</h2>
        <p className="text-text-secondary text-sm leading-relaxed mb-2">
          We received your verification documents and are currently reviewing them.
        </p>
        <p className="text-text-secondary text-sm leading-relaxed mb-6">
          An admin will approve your account within <strong className="text-text-primary">24–48 hours</strong>. This process exists to keep Uni-verse safe for everyone — your security is our top priority.
        </p>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl px-4 py-3 text-sm text-yellow-600 dark:text-yellow-400">
          Hang tight! You'll receive a notification once your account is approved.
        </div>
      </div>
    )
  }

  if (status === 'rejected') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-5">
          <ShieldX className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-text-primary mb-2">Verification Not Accepted</h2>
        <p className="text-text-secondary text-sm leading-relaxed mb-6">
          Your verification documents were not accepted by the admin. Please submit new valid documents from Settings.
        </p>
        <Button onClick={() => navigate('/settings', { state: { section: 'verify' } })}>
          <ShieldCheck className="w-4 h-4" />
          Resubmit Documents
        </Button>
      </div>
    )
  }

  // unverified — hasn't submitted anything yet
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center max-w-md mx-auto">
      <div className="w-16 h-16 rounded-3xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-5">
        <ShieldCheck className="w-8 h-8 text-accent" />
      </div>
      <h2 className="text-xl font-bold text-text-primary mb-2">Account Verification Required</h2>
      <p className="text-text-secondary text-sm leading-relaxed mb-6">
        To access this feature, your account must be verified and approved by an admin. Upload your student ID (or diploma if you're alumni) to get started.
      </p>
      <div className="w-full space-y-3">
        <Button fullWidth onClick={() => navigate('/settings', { state: { section: 'verify' } })}>
          <ShieldCheck className="w-4 h-4" />
          Verify My Account
        </Button>
        <p className="text-xs text-text-muted">
          While waiting for approval, you can still browse content posted by page accounts on your home feed.
        </p>
      </div>
    </div>
  )
}
