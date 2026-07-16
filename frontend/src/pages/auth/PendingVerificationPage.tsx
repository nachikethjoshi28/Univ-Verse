import { Clock, Globe, LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../../components/ui/Button'

export function PendingVerificationPage() {
  const { profile, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-3xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mb-3">
          <Globe className="w-5 h-5 text-accent" />
          <span className="text-lg font-bold text-accent">Uni-verse</span>
        </div>

        <h1 className="text-2xl font-bold text-text-primary mb-3">Verification Pending</h1>
        <p className="text-text-secondary mb-2">
          Hi {profile?.full_name?.split(' ')[0]}, your account is under review.
        </p>
        <p className="text-text-muted text-sm mb-8">
          {profile?.is_alumni
            ? 'Alumni accounts require manual admin approval. We\'ll email you at '
            : 'We\'re verifying your student ID. You\'ll receive an email at '}
          <span className="font-medium text-text-primary">{profile?.email}</span> once approved.
          This typically takes 1–2 business days.
        </p>

        <div className="bg-surface border border-surface-border rounded-3xl p-6 mb-6 text-left space-y-3">
          <h2 className="font-semibold text-text-primary text-sm">What happens next?</h2>
          <ul className="space-y-2 text-sm text-text-secondary">
            <li className="flex items-start gap-2">
              <span className="text-accent font-bold mt-0.5">1.</span>
              Our team reviews your student ID or alumni proof
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent font-bold mt-0.5">2.</span>
              You receive an email with your verification status
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent font-bold mt-0.5">3.</span>
              Once approved, you get full access to Uni-verse
            </li>
          </ul>
        </div>

        <Button variant="ghost" onClick={signOut} className="text-text-muted">
          <LogOut className="w-4 h-4" />
          Sign out
        </Button>
      </div>
    </div>
  )
}
