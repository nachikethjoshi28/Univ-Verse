import { useLocation, Link } from 'react-router-dom'
import { Mail, Globe, ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import toast from 'react-hot-toast'
import { useState } from 'react'

export function VerifyEmailPage() {
  const location = useLocation()
  const email = (location.state as { email?: string })?.email
  const [resending, setResending] = useState(false)

  async function resendEmail() {
    if (!email) return
    setResending(true)
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    if (error) toast.error(error.message)
    else toast.success('Verification email resent!')
    setResending(false)
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-3xl bg-accent-subtle border border-accent/20 flex items-center justify-center">
            <Mail className="w-8 h-8 text-accent" />
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mb-2">
          <Globe className="w-5 h-5 text-accent" />
          <span className="text-lg font-bold text-accent">Uni-verse</span>
        </div>

        <h1 className="text-2xl font-bold text-text-primary mb-3">Check your email</h1>
        <p className="text-text-secondary mb-2">
          We sent a verification link to
        </p>
        {email && (
          <p className="font-medium text-text-primary mb-6 bg-surface border border-surface-border rounded-2xl px-4 py-2 inline-block">
            {email}
          </p>
        )}
        <p className="text-text-muted text-sm mb-8">
          Click the link in the email to verify your account. Check your spam folder if you don't see it.
        </p>

        <div className="space-y-3">
          <Button variant="outline" fullWidth loading={resending} onClick={resendEmail}>
            Resend verification email
          </Button>
          <Link to="/auth/login">
            <Button variant="ghost" fullWidth>
              <ArrowLeft className="w-4 h-4" />
              Back to sign in
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
