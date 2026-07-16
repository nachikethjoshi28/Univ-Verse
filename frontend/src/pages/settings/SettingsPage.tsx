import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Camera, Save, LogOut, User, Building2, Trash2, AlertTriangle,
  ShieldCheck, Upload, X, CheckCircle2, Clock, BadgeCheck,
  Crown, Lock, FileText, ScrollText, KeyRound, UserX, Sun, Moon, Newspaper,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { NEWS_INTERESTS } from '../../components/home/NewsPanel'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { Select } from '../../components/ui/Select'
import { Avatar } from '../../components/ui/Avatar'
import { Modal } from '../../components/ui/Modal'
import { cn } from '../../lib/utils'
import { ProfilePage } from '../profile/ProfilePage'
import { useTheme } from '../../context/ThemeContext'
import { CropModal } from '../../components/ui/CropModal'
import toast from 'react-hot-toast'

const currentYear = new Date().getFullYear()

const MAJORS = [
  'Computer Science', 'Information Technology', 'Software Engineering',
  'Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering',
  'Chemical Engineering', 'Biomedical Engineering', 'Business Administration',
  'Finance', 'Economics', 'Mathematics', 'Statistics', 'Physics', 'Chemistry',
  'Biology', 'Psychology', 'Sociology', 'Political Science', 'History',
  'English', 'Communications', 'Marketing', 'Accounting', 'Data Science',
  'Artificial Intelligence', 'Other',
]

const DEGREES = [
  'Associate', 'Bachelor of Science (BS)', 'Bachelor of Arts (BA)',
  'Master of Science (MS)', 'Master of Arts (MA)', 'MBA', 'JD', 'MD', 'PhD', 'Other',
]

type Section = 'profile' | 'verify' | 'premium' | 'security' | 'appearance' | 'privacy' | 'terms'

const NAV: { id: Section; icon: typeof User; label: string }[] = [
  { id: 'profile',    icon: User,        label: 'Profile' },
  { id: 'verify',     icon: ShieldCheck, label: 'Get Verified' },
  { id: 'premium',    icon: Crown,       label: 'Subscribe to Premium' },
  { id: 'security',   icon: Lock,        label: 'Security' },
  { id: 'appearance', icon: Sun,         label: 'Appearance' },
  { id: 'privacy',    icon: FileText,    label: 'Privacy Policy' },
  { id: 'terms',      icon: ScrollText,  label: 'Terms & Conditions' },
]

export function SettingsPage() {
  const { user, profile, refreshProfile, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [showNews, setShowNews] = useState(true)
  const [searchParams] = useSearchParams()
  const fileRef = useRef<HTMLInputElement>(null)
  const locationState = (window.history.state?.usr ?? {}) as Record<string, string>

  const [section, setSection] = useState<Section>((locationState.section as Section) ?? 'profile')
  const [editMode, setEditMode] = useState(false)

  // Handle Stripe redirect back
  useEffect(() => {
    if (user?.id) {
      const val = localStorage.getItem(`uv:show-news:${user.id}`)
      setShowNews(val === null || val === 'true')
    }
  }, [user?.id])

  function toggleShowNews() {
    const next = !showNews
    setShowNews(next)
    if (user?.id) localStorage.setItem(`uv:show-news:${user.id}`, String(next))
  }

  useEffect(() => {
    const payment = searchParams.get('payment')
    const plan = searchParams.get('plan')
    if (payment === 'success' && plan) {
      setSection('premium')
      toast.success(`🎉 Welcome to ${plan.charAt(0).toUpperCase() + plan.slice(1)}! Your plan is now active.`)
      refreshProfile()
      // clean up URL
      navigate('/settings', { replace: true })
    } else if (payment === 'cancelled') {
      setSection('premium')
      toast('Checkout cancelled — no charges were made.')
      navigate('/settings', { replace: true })
    }
  }, [])

  // Edit form (no username — locked)
  const [form, setForm] = useState({
    full_name: profile?.full_name ?? '',
    bio: profile?.bio ?? '',
    website: profile?.website ?? '',
    major: profile?.major ?? '',
    degree: profile?.degree ?? '',
    phone: profile?.phone ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)

  // News interests (stored in localStorage)
  const [newsInterests, setNewsInterests] = useState<string[]>([])
  useEffect(() => {
    if (!user) return
    const stored = localStorage.getItem(`uv:news-interests:${user.id}`)
    if (stored) { try { setNewsInterests(JSON.parse(stored)) } catch {} }
  }, [user?.id])
  function toggleNewsInterest(label: string) {
    setNewsInterests(prev => prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label])
  }
  function saveNewsInterests() {
    if (!user) return
    localStorage.setItem(`uv:news-interests:${user.id}`, JSON.stringify(newsInterests))
    toast.success('Interests saved!')
  }

  // Verification
  const isAlumni = (profile?.graduation_year ?? currentYear + 4) <= currentYear
  const [verifyDocType, setVerifyDocType] = useState<'student_id' | 'diploma'>('student_id')
  const [verifyIdFile, setVerifyIdFile] = useState<File | null>(null)
  const [submittingVerify, setSubmittingVerify] = useState(false)

  // Change request evidence file
  const [changeRequestEvidenceFile, setChangeRequestEvidenceFile] = useState<File | null>(null)

  // Security
  const [isPrivate, setIsPrivate] = useState(profile?.is_private ?? false)
  const [togglingPrivate, setTogglingPrivate] = useState(false)
  const [allowTagging, setAllowTagging] = useState(profile?.allow_tagging ?? true)
  const [togglingTagging, setTogglingTagging] = useState(false)

  useEffect(() => {
    if (profile) {
      setIsPrivate(profile.is_private ?? false)
      setAllowTagging(profile.allow_tagging ?? true)
    }
  }, [profile?.id])
  const [showChangeRequestModal, setShowChangeRequestModal] = useState(false)
  const [changeRequestField, setChangeRequestField] = useState<'degree' | 'major' | 'graduation_year' | null>(null)
  const [changeRequestValue, setChangeRequestValue] = useState('')
  const [submittingChangeRequest, setSubmittingChangeRequest] = useState(false)
  const [sendingReset, setSendingReset] = useState(false)
  const [deactivating, setDeactivating] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  const currentPlan = profile?.subscription_plan ?? 'free'

  // Premium / billing
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly')
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null) // plan key being loaded
  const [portalLoading, setPortalLoading] = useState(false)

  async function startCheckout(plan: 'silver' | 'gold') {
    if (!user) return
    const key = `${plan}_${billingPeriod}`
    setCheckoutLoading(key)
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: { plan, period: billingPeriod },
    })
    setCheckoutLoading(null)
    if (error || !data?.url) { toast.error('Could not start checkout. Please try again.'); return }
    window.location.href = data.url
  }

  async function openBillingPortal() {
    setPortalLoading(true)
    const { data, error } = await supabase.functions.invoke('create-portal-session')
    setPortalLoading(false)
    if (error || !data?.url) { toast.error('Could not open billing portal. Please try again.'); return }
    window.location.href = data.url
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return }
    // open crop modal instead of setting directly
    setCropSrc(URL.createObjectURL(file))
    e.target.value = '' // reset so same file can be reselected
  }

  function handleAvatarCropDone(blob: Blob) {
    const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(blob))
    setCropSrc(null)
  }

  async function save() {
    if (!user) return
    if (form.full_name.trim().length < 3) { toast.error('Name must be at least 3 characters'); return }
    if (form.full_name.trim().length > 25) { toast.error('Name must be 25 characters or less'); return }
    setSaving(true)

    let avatar_url = profile?.avatar_url ?? null
    if (avatarFile) {
      setUploading(true)
      const ext = avatarFile.name.split('.').pop()
      const path = `avatars/${user.id}/avatar.${ext}`
      const { error: upErr } = await supabase.storage.from('media').upload(path, avatarFile, { upsert: true })
      if (upErr) { toast.error('Avatar upload failed'); setSaving(false); setUploading(false); return }
      const { data } = supabase.storage.from('media').getPublicUrl(path)
      avatar_url = `${data.publicUrl}?t=${Date.now()}`
      setUploading(false)
    }

    const { error } = await supabase.from('profiles').update({
      full_name: form.full_name.trim(),
      bio:       form.bio.trim() || null,
      website:   form.website.trim() || null,
      major:     form.major || null,
      degree:    form.degree || null,
      phone:     form.phone.trim() || null,
      avatar_url,
    }).eq('id', user.id)

    if (error) {
      toast.error('Failed to save changes')
    } else {
      await refreshProfile()
      toast.success('Profile saved!')
      setAvatarFile(null)
      setAvatarPreview(null)
      setEditMode(false)
    }
    setSaving(false)
  }

  async function submitVerification() {
    if (!user) return
    if (!verifyIdFile) { toast.error('Please upload your document'); return }
    setSubmittingVerify(true)
    const ext = verifyIdFile.name.split('.').pop()
    const path = `verify-docs/${user.id}/doc.${ext}`
    const { error: upErr } = await supabase.storage.from('documents').upload(path, verifyIdFile, { upsert: true })
    if (upErr) { toast.error('Upload failed. Try a smaller file (under 5 MB).'); setSubmittingVerify(false); return }
    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path)
    const { error } = await supabase.from('profiles').update({
      student_id_url:              urlData.publicUrl,
      verification_document_type:  verifyDocType,
      verification_submitted_at:   new Date().toISOString(),
      verification_status:         'pending',
    }).eq('id', user.id)
    if (error) toast.error('Failed to submit. Please try again.')
    else {
      toast.success('Documents submitted! Admin will review within 24–48 hours.')
      setVerifyIdFile(null)
      await refreshProfile()
    }
    setSubmittingVerify(false)
  }

  async function sendPasswordReset() {
    if (!user?.email) return
    setSendingReset(true)
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    if (error) toast.error('Failed to send reset email')
    else toast.success('Password reset email sent — check your inbox!')
    setSendingReset(false)
  }

  async function togglePrivate() {
    if (!user) return
    setTogglingPrivate(true)
    const next = !isPrivate
    const { error } = await supabase.from('profiles').update({ is_private: next }).eq('id', user.id)
    if (error) {
      console.error('[togglePrivate]', error.code, error.message)
      toast.error(error.message ?? 'Failed to update privacy settings')
    } else {
      setIsPrivate(next)
      await refreshProfile()
      toast.success(next ? 'Account is now private' : 'Account is now public')
    }
    setTogglingPrivate(false)
  }

  async function toggleTagging() {
    if (!user) return
    setTogglingTagging(true)
    const next = !allowTagging
    const { error } = await supabase.from('profiles').update({ allow_tagging: next }).eq('id', user.id)
    if (error) {
      console.error('[toggleTagging]', error.code, error.message)
      toast.error(error.message ?? 'Failed to update tagging setting')
    } else {
      setAllowTagging(next)
      await refreshProfile()
      toast.success(next ? 'Tagging enabled' : 'Tagging disabled')
    }
    setTogglingTagging(false)
  }

  async function submitChangeRequest() {
    if (!user || !changeRequestField || !changeRequestValue.trim()) return
    // Graduation year change requires evidence
    if (changeRequestField === 'graduation_year' && !changeRequestEvidenceFile) {
      toast.error('Please upload evidence (diploma or transcript) for graduation year changes')
      return
    }
    setSubmittingChangeRequest(true)

    let evidence_url: string | null = null
    if (changeRequestEvidenceFile) {
      const ext = changeRequestEvidenceFile.name.split('.').pop()
      const path = `change-evidence/${user.id}/${changeRequestField}.${ext}`
      const { error: upErr } = await supabase.storage.from('documents').upload(path, changeRequestEvidenceFile, { upsert: true })
      if (upErr) {
        toast.error('Evidence upload failed. Try a smaller file (under 5 MB).')
        setSubmittingChangeRequest(false)
        return
      }
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path)
      evidence_url = urlData.publicUrl
    }

    const currentValue = changeRequestField === 'graduation_year'
      ? String(profile?.graduation_year ?? '')
      : (profile?.[changeRequestField] ?? '')
    const { error } = await supabase.from('field_change_requests').insert({
      user_id: user.id,
      field_name: changeRequestField,
      current_value: currentValue,
      requested_value: changeRequestValue.trim(),
      evidence_url,
    })
    if (error) toast.error('Failed to submit request')
    else {
      toast.success('Change request submitted! An admin will review it.')
      setShowChangeRequestModal(false)
      setChangeRequestValue('')
      setChangeRequestField(null)
      setChangeRequestEvidenceFile(null)
    }
    setSubmittingChangeRequest(false)
  }

  async function deactivateAccount() {
    if (!user) return
    setDeactivating(true)
    const { error } = await supabase.from('profiles').update({ is_deactivated: true }).eq('id', user.id)
    if (error) { toast.error('Failed to deactivate account'); setDeactivating(false); return }
    await supabase.auth.signOut()
    toast.success('Account deactivated. Log in again to reactivate.')
    navigate('/auth/login')
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== 'DELETE') return
    setDeleting(true)
    const { error } = await supabase.rpc('delete_my_account')
    if (error) { toast.error('Failed to delete account. Please try again.'); setDeleting(false); return }
    await supabase.auth.signOut()
    toast.success('Account deleted.')
    navigate('/auth/login')
  }

  async function handleSignOut() {
    await signOut()
    navigate('/auth/login')
  }

  const displayAvatar = avatarPreview ?? profile?.avatar_url ?? null

  return (
    <>
    {/* Change Request Modal */}
    {showChangeRequestModal && changeRequestField && (
      <Modal open={showChangeRequestModal} onClose={() => { setShowChangeRequestModal(false); setChangeRequestEvidenceFile(null) }} title="Request Field Change" size="sm">
        <div className="space-y-4">
          <div className="p-3 bg-accent/5 border border-accent/20 rounded-xl text-sm text-text-secondary">
            Field changes must be approved by an admin. {changeRequestField === 'graduation_year' ? 'A graduation year change requires supporting evidence (diploma or transcript).' : 'Provide your new value below.'}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-text-secondary capitalize">
              New {changeRequestField.replace(/_/g, ' ')}
            </label>
            <input
              value={changeRequestValue}
              onChange={e => setChangeRequestValue(e.target.value)}
              placeholder={`Enter new ${changeRequestField.replace(/_/g, ' ')}…`}
              className="w-full bg-surface-hover border border-surface-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
          {/* Evidence upload — required for graduation_year, optional for others */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-secondary">
              Evidence {changeRequestField === 'graduation_year' ? '(required)' : '(optional)'}
            </label>
            <div
              className="border-2 border-dashed border-surface-border hover:border-accent/40 rounded-xl p-4 text-center cursor-pointer transition-colors"
              onClick={() => document.getElementById('change-evidence-upload')?.click()}
            >
              <input
                id="change-evidence-upload"
                type="file"
                accept="image/*,.pdf"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f && f.size > 5 * 1024 * 1024) { toast.error('File must be under 5 MB'); return }
                  if (f) setChangeRequestEvidenceFile(f)
                }}
              />
              {changeRequestEvidenceFile ? (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-sm text-text-primary truncate max-w-[200px]">{changeRequestEvidenceFile.name}</span>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setChangeRequestEvidenceFile(null) }}>
                    <X className="w-4 h-4 text-text-muted hover:text-red-400" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <Upload className="w-5 h-5 text-text-muted" />
                  <p className="text-xs text-text-muted">Upload supporting document · JPG, PNG, PDF · max 5 MB</p>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={() => { setShowChangeRequestModal(false); setChangeRequestEvidenceFile(null) }}>Cancel</Button>
            <Button fullWidth loading={submittingChangeRequest} onClick={submitChangeRequest} disabled={!changeRequestValue.trim()}>
              Submit Request
            </Button>
          </div>
        </div>
      </Modal>
    )}
    {cropSrc && (
      <CropModal
        src={cropSrc}
        aspect={1}
        title="Crop Profile Photo"
        onDone={handleAvatarCropDone}
        onCancel={() => setCropSrc(null)}
      />
    )}
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-text-muted text-sm mt-0.5">Manage your account and preferences</p>
      </div>

      <div className="flex gap-6 items-start">

        {/* ── Left nav ── */}
        <aside className="w-52 flex-shrink-0 sticky top-6">
          <Card className="p-2">
            <nav className="space-y-0.5">
              {NAV.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => { setSection(id); setEditMode(false) }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left',
                    section === id
                      ? 'bg-accent text-white'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                </button>
              ))}
              <div className="border-t border-surface-border mt-1 pt-1">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-500/10 transition-all text-left"
                >
                  <LogOut className="w-4 h-4 flex-shrink-0" />
                  Sign Out
                </button>
              </div>
            </nav>
          </Card>
        </aside>

        {/* ── Right content ── */}
        <main className="flex-1 min-w-0 space-y-4">

          {/* ─── PROFILE ──────────────────────────────────────────── */}
          {section === 'profile' && !editMode && (
            <ProfilePage onEditProfile={() => setEditMode(true)} />
          )}

          {section === 'profile' && editMode && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-text-primary">Edit Profile</h2>
                <Button variant="ghost" size="sm" onClick={() => setEditMode(false)}>Cancel</Button>
              </div>

              {/* Avatar */}
              <Card>
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4">Profile Photo</h3>
                <div className="flex items-center gap-6">
                  <div className="relative group flex-shrink-0">
                    {displayAvatar ? (
                      <img src={displayAvatar} alt="avatar" className="w-20 h-20 rounded-full object-cover ring-2 ring-surface-border" />
                    ) : (
                      <Avatar name={profile?.full_name ?? ''} size="xl" />
                    )}
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <Camera className="w-5 h-5 text-white" />
                    </button>
                  </div>
                  <div>
                    <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
                    <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                      {uploading ? 'Uploading…' : 'Change Photo'}
                    </Button>
                    <p className="text-text-muted text-xs mt-1">JPG, PNG or WebP · max 5 MB</p>
                  </div>
                </div>
              </Card>

              {/* Personal info */}
              <Card>
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4">Personal Info</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Input
                        label="Full Name"
                        value={form.full_name}
                        onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value.slice(0, 25) }))}
                        placeholder="Jane Smith"
                        maxLength={25}
                      />
                      <p className={cn('text-xs text-right', form.full_name.length < 3 ? 'text-red-400' : 'text-text-muted')}>
                        {form.full_name.length}/25 {form.full_name.length < 3 ? '(min 3)' : ''}
                      </p>
                    </div>
                    {/* Username is permanently locked */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-text-secondary">Username</label>
                      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-hover border border-surface-border">
                        <span className="text-sm text-text-muted flex-1">@{profile?.username ?? '—'}</span>
                        <Lock className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                      </div>
                      <p className="text-xs text-text-muted">Username cannot be changed after signup</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Textarea
                      label="Bio"
                      value={form.bio}
                      onChange={(e) => setForm(f => ({ ...f, bio: e.target.value.slice(0, 100) }))}
                      placeholder="Tell people a little about yourself…"
                      rows={2}
                      maxLength={100}
                    />
                    <p className="text-xs text-text-muted text-right">{form.bio.length}/100</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Website"
                      value={form.website}
                      onChange={(e) => setForm(f => ({ ...f, website: e.target.value }))}
                      placeholder="https://yoursite.com"
                    />
                    <Input
                      label="Phone (optional)"
                      value={form.phone}
                      onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                </div>
              </Card>

              {/* Academic info */}
              <Card>
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4">Academic Info</h3>
                <div className="space-y-4">
                  {profile?.university_name && (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-accent/5 border border-accent/20">
                      <Building2 className="w-4 h-4 text-accent flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-text-primary">{profile.university_name}</p>
                        {profile.enrollment_year && profile.graduation_year && (
                          <p className="text-xs text-text-muted">{profile.enrollment_year} – {profile.graduation_year}</p>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Major — locked once set */}
                    {profile?.major ? (
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-text-secondary">Major</label>
                        <div className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-surface-border bg-surface-hover">
                          <span className="text-sm text-text-primary">{profile.major}</span>
                          <button
                            onClick={() => { setChangeRequestField('major'); setChangeRequestValue(''); setShowChangeRequestModal(true) }}
                            className="text-xs text-accent hover:underline flex-shrink-0"
                          >
                            Request change
                          </button>
                        </div>
                      </div>
                    ) : (
                      <Select
                        label="Major"
                        value={form.major}
                        onChange={(e) => setForm(f => ({ ...f, major: e.target.value }))}
                      >
                        <option value="">Select major</option>
                        {MAJORS.map(m => <option key={m} value={m}>{m}</option>)}
                      </Select>
                    )}
                    {/* Degree — locked once set */}
                    {profile?.degree ? (
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-text-secondary">Degree</label>
                        <div className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-surface-border bg-surface-hover">
                          <span className="text-sm text-text-primary">{profile.degree}</span>
                          <button
                            onClick={() => { setChangeRequestField('degree'); setChangeRequestValue(''); setShowChangeRequestModal(true) }}
                            className="text-xs text-accent hover:underline flex-shrink-0"
                          >
                            Request change
                          </button>
                        </div>
                      </div>
                    ) : (
                    <Select
                      label="Degree"
                      value={form.degree}
                      onChange={(e) => setForm(f => ({ ...f, degree: e.target.value }))}
                    >
                      <option value="">Select degree</option>
                      {DEGREES.map(d => <option key={d} value={d}>{d}</option>)}
                    </Select>
                    )}
                  </div>
                  {/* Graduation year — locked once set */}
                  {profile?.graduation_year ? (
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-text-secondary">Graduation Year</label>
                      <div className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-surface-border bg-surface-hover">
                        <span className="text-sm text-text-primary">{profile.graduation_year}</span>
                        <button
                          onClick={() => { setChangeRequestField('graduation_year'); setChangeRequestValue(''); setShowChangeRequestModal(true) }}
                          className="text-xs text-accent hover:underline flex-shrink-0"
                        >
                          Request change
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </Card>

              {/* News interests */}
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">News Interests</h3>
                  <Button size="sm" variant="outline" onClick={saveNewsInterests}>
                    <Save className="w-3.5 h-3.5" />
                    Save interests
                  </Button>
                </div>
                <p className="text-xs text-text-muted mb-3">These shape the personalised news feed on your home page.</p>
                <div className="flex flex-wrap gap-2">
                  {NEWS_INTERESTS.map(({ label, emoji }) => {
                    const on = newsInterests.includes(label)
                    return (
                      <button
                        key={label}
                        onClick={() => toggleNewsInterest(label)}
                        className={cn(
                          'text-xs font-medium px-3 py-1.5 rounded-full border transition-all',
                          on
                            ? 'bg-accent text-white border-accent shadow-sm'
                            : 'border-surface-border text-text-secondary hover:border-accent/40 hover:text-text-primary'
                        )}
                      >
                        {emoji} {label}
                      </button>
                    )
                  })}
                </div>
              </Card>

              <Button onClick={save} loading={saving} className="w-full">
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
            </div>
          )}

          {/* ─── GET VERIFIED ─────────────────────────────────────── */}
          {section === 'verify' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-text-primary">Account Verification</h2>

              {profile?.verification_status === 'verified' ? (
                <Card>
                  <div className="flex items-center gap-4 p-4 bg-orange-500/10 border border-orange-500/30 rounded-2xl">
                    <CheckCircle2 className="w-7 h-7 text-orange-500 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-orange-500 flex items-center gap-2">
                        <BadgeCheck className="w-4 h-4" /> Identity Verified
                      </p>
                      <p className="text-sm text-text-muted mt-0.5">Your orange ✓ badge is displayed on your profile and all your posts.</p>
                    </div>
                  </div>
                </Card>
              ) : profile?.verification_status === 'pending' ? (
                <Card>
                  <div className="flex items-center gap-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl">
                    <Clock className="w-7 h-7 text-yellow-500 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-yellow-500">Documents Under Review</p>
                      <p className="text-sm text-text-muted mt-0.5">
                        We received your verification documents and are reviewing them. Admin will approve your account within <strong>24–48 hours</strong>. Your security is our top priority.
                      </p>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card>
                  <div className="space-y-5">
                    {profile?.verification_status === 'rejected' && (
                      <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                        <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-semibold text-red-500 mb-1">Previous documents not accepted</p>
                          <p className="text-text-secondary">Please submit new valid documents below.</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-3 p-4 bg-orange-500/5 border border-orange-500/20 rounded-2xl">
                      <ShieldCheck className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-text-secondary">
                        <p className="font-semibold text-orange-500 mb-1">Why verify?</p>
                        <p>Verification gives you full access to Connect, Chats, Dates, and MarketSpot. Upload your ID below — our admin team reviews it within 24–48 hours. Your documents are stored securely and never shown publicly.</p>
                      </div>
                    </div>

                    {/* Document type selector — alumni can choose between student ID and diploma */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">Document Type</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setVerifyDocType('student_id')}
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left',
                            verifyDocType === 'student_id' ? 'border-accent bg-accent/10' : 'border-surface-border hover:border-accent/40'
                          )}
                        >
                          <FileText className="w-5 h-5 text-text-secondary flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-text-primary">Student ID</p>
                            <p className="text-xs text-text-muted">University-issued card</p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setVerifyDocType('diploma')}
                          disabled={!isAlumni}
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left',
                            !isAlumni ? 'opacity-40 cursor-not-allowed border-surface-border' :
                            verifyDocType === 'diploma' ? 'border-accent bg-accent/10' : 'border-surface-border hover:border-accent/40'
                          )}
                        >
                          <ShieldCheck className="w-5 h-5 text-text-secondary flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-text-primary">Diploma / Transcript</p>
                            <p className="text-xs text-text-muted">{isAlumni ? 'Shows graduation year' : 'Alumni only'}</p>
                          </div>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-text-secondary">
                        Upload {verifyDocType === 'diploma' ? 'Diploma or Transcript' : 'Student ID Document'}
                      </label>
                      <div
                        className="border-2 border-dashed border-surface-border hover:border-orange-500/40 rounded-2xl p-6 text-center cursor-pointer transition-colors"
                        onClick={() => document.getElementById('verify-id-upload')?.click()}
                      >
                        <input
                          id="verify-id-upload"
                          type="file"
                          accept="image/*,.pdf"
                          hidden
                          onChange={(e) => {
                            const f = e.target.files?.[0]
                            if (f && f.size > 5 * 1024 * 1024) { toast.error('File must be under 5 MB'); return }
                            if (f) setVerifyIdFile(f)
                          }}
                        />
                        {verifyIdFile ? (
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-sm text-text-primary font-medium truncate max-w-xs">{verifyIdFile.name}</span>
                            <button type="button" onClick={(e) => { e.stopPropagation(); setVerifyIdFile(null) }}
                              className="text-text-muted hover:text-red-400">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <Upload className="w-7 h-7 text-text-muted" />
                            <p className="text-sm text-text-secondary">Click to upload</p>
                            <p className="text-xs text-text-muted">JPG, PNG or PDF · max 5 MB</p>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-text-muted">Stored securely — only our admin team can see it. Never shown publicly.</p>
                    </div>

                    <Button
                      onClick={submitVerification}
                      loading={submittingVerify}
                      disabled={!verifyIdFile}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Submit for Approval
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* ─── PREMIUM ──────────────────────────────────────────── */}
          {section === 'premium' && (
            <div className="space-y-5">
              {/* Header row */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-text-primary">Subscribe to Premium</h2>
                <span className={cn(
                  'text-xs font-bold px-3 py-1 rounded-full border',
                  currentPlan === 'gold'   ? 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30' :
                  currentPlan === 'silver' ? 'bg-gray-400/15 text-gray-400 border-gray-400/30' :
                                             'bg-surface-hover text-text-muted border-surface-border'
                )}>
                  {currentPlan === 'gold' ? '✦ Gold Plan' : currentPlan === 'silver' ? '✦ Silver Plan' : 'Free Plan'}
                </span>
              </div>

              {/* Active subscription info */}
              {currentPlan !== 'free' && (
                <Card className={cn(
                  'border',
                  currentPlan === 'gold' ? 'border-yellow-500/40 bg-yellow-500/5' : 'border-gray-400/40 bg-gray-400/5'
                )}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                        currentPlan === 'gold' ? 'bg-yellow-500/15' : 'bg-gray-400/15'
                      )}>
                        {currentPlan === 'gold' ? <Crown className="w-5 h-5 text-yellow-500" /> : <span className="text-gray-400 font-bold text-lg">✦</span>}
                      </div>
                      <div>
                        <p className="font-semibold text-text-primary capitalize">{currentPlan} Plan — Active</p>
                        {profile?.subscription_period_end && (
                          <p className="text-xs text-text-muted mt-0.5">
                            Renews {new Date(profile.subscription_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      loading={portalLoading}
                      onClick={openBillingPortal}
                      className="flex-shrink-0"
                    >
                      Manage Billing
                    </Button>
                  </div>
                </Card>
              )}

              {/* Billing period toggle */}
              <div className="flex items-center justify-center gap-1 p-1 bg-surface-hover rounded-2xl w-fit mx-auto">
                {(['monthly', 'yearly'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setBillingPeriod(p)}
                    className={cn(
                      'px-5 py-2 rounded-xl text-sm font-medium transition-all',
                      billingPeriod === p ? 'bg-surface text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'
                    )}
                  >
                    {p === 'monthly' ? 'Monthly' : 'Yearly'}
                    {p === 'yearly' && <span className="ml-1.5 text-[10px] font-bold text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded-full">Save ~17%</span>}
                  </button>
                ))}
              </div>

              {/* Plan cards */}
              <div className="grid grid-cols-3 gap-4">

                {/* Free */}
                <Card className={cn('relative flex flex-col', currentPlan === 'free' && 'border-accent/40')}>
                  {currentPlan === 'free' && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-accent text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap">Current Plan</span>
                    </div>
                  )}
                  <div className="text-center mb-5">
                    <div className="w-12 h-12 rounded-2xl bg-surface-hover flex items-center justify-center mx-auto mb-3">
                      <User className="w-6 h-6 text-text-muted" />
                    </div>
                    <h3 className="font-bold text-text-primary text-base">Free</h3>
                    <p className="text-3xl font-bold text-text-primary mt-1.5">$0</p>
                    <p className="text-xs text-text-muted">forever</p>
                  </div>
                  <ul className="space-y-2 text-[13px] text-text-secondary mb-5 flex-1">
                    {['5 likes/week on Dates', 'Basic profile', 'Connect with others', 'Home feed'].map(f => (
                      <li key={f} className="flex items-start gap-2"><span className="text-accent mt-0.5">✓</span>{f}</li>
                    ))}
                    {['MarketSpot access', 'Communities access'].map(f => (
                      <li key={f} className="flex items-start gap-2 opacity-40 line-through"><span className="mt-0.5">✗</span>{f}</li>
                    ))}
                  </ul>
                  <Button variant="outline" className="w-full" disabled>
                    {currentPlan === 'free' ? 'Current Plan' : 'Downgrade'}
                  </Button>
                </Card>

                {/* Silver */}
                <Card className={cn('relative flex flex-col', currentPlan === 'silver' ? 'border-gray-400/60' : 'border-gray-400/20')}>
                  {currentPlan === 'silver' && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-gray-400 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap">Current Plan</span>
                    </div>
                  )}
                  <div className="text-center mb-5">
                    <div className="w-12 h-12 rounded-2xl bg-gray-400/10 border border-gray-400/20 flex items-center justify-center mx-auto mb-3">
                      <span className="text-gray-400 font-bold text-xl">✦</span>
                    </div>
                    <h3 className="font-bold text-gray-400 text-base">Silver</h3>
                    <p className="text-3xl font-bold text-text-primary mt-1.5">
                      {billingPeriod === 'monthly' ? '$19.99' : '$199.99'}
                    </p>
                    <p className="text-xs text-text-muted">per {billingPeriod === 'monthly' ? 'month' : 'year'}</p>
                    {billingPeriod === 'yearly' && <p className="text-[11px] text-green-500 font-medium mt-0.5">≈ $16.67/mo</p>}
                  </div>
                  <ul className="space-y-2 text-[13px] text-text-secondary mb-5 flex-1">
                    {['50 likes/week on Dates', 'Silver ✦ badge', 'Basic profile', 'Connect with others'].map(f => (
                      <li key={f} className="flex items-start gap-2"><span className="text-gray-400 mt-0.5">✓</span>{f}</li>
                    ))}
                    {['MarketSpot access', 'Communities access'].map(f => (
                      <li key={f} className="flex items-start gap-2 opacity-40 line-through"><span className="mt-0.5">✗</span>{f}</li>
                    ))}
                  </ul>
                  <Button
                    disabled={currentPlan === 'silver' || currentPlan === 'gold'}
                    loading={checkoutLoading === `silver_${billingPeriod}`}
                    onClick={() => startCheckout('silver')}
                    className="w-full bg-gray-400 hover:bg-gray-500 text-white disabled:opacity-60"
                  >
                    {currentPlan === 'silver' ? 'Current Plan' : currentPlan === 'gold' ? 'Downgrade via Portal' : 'Upgrade to Silver'}
                  </Button>
                </Card>

                {/* Gold */}
                <Card className={cn('relative flex flex-col', currentPlan === 'gold' ? 'border-yellow-500/60' : 'border-yellow-500/30')}>
                  {currentPlan !== 'gold' && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap">Most Popular</span>
                    </div>
                  )}
                  {currentPlan === 'gold' && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-yellow-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap">Current Plan</span>
                    </div>
                  )}
                  <div className="text-center mb-5">
                    <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mx-auto mb-3">
                      <Crown className="w-6 h-6 text-yellow-500" />
                    </div>
                    <h3 className="font-bold text-yellow-500 text-base">Gold</h3>
                    <p className="text-3xl font-bold text-text-primary mt-1.5">
                      {billingPeriod === 'monthly' ? '$24.99' : '$249.99'}
                    </p>
                    <p className="text-xs text-text-muted">per {billingPeriod === 'monthly' ? 'month' : 'year'}</p>
                    {billingPeriod === 'yearly' && <p className="text-[11px] text-green-500 font-medium mt-0.5">≈ $20.83/mo</p>}
                  </div>
                  <ul className="space-y-2 text-[13px] text-text-secondary mb-5 flex-1">
                    {[
                      'Unlimited likes/week on Dates',
                      'Gold ✦ badge',
                      'Full Dates features',
                      'MarketSpot access',
                      'Communities access',
                      'All features unlocked',
                    ].map(f => (
                      <li key={f} className="flex items-start gap-2"><span className="text-yellow-500 mt-0.5">✓</span>{f}</li>
                    ))}
                  </ul>
                  <Button
                    disabled={currentPlan === 'gold'}
                    loading={checkoutLoading === `gold_${billingPeriod}`}
                    onClick={() => startCheckout('gold')}
                    className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white disabled:opacity-60"
                  >
                    {currentPlan === 'gold' ? 'Current Plan' : '⭐ Upgrade to Gold'}
                  </Button>
                </Card>
              </div>

              {/* Badge guide */}
              <Card>
                <h3 className="font-semibold text-text-primary mb-4">Badge Guide</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                      <BadgeCheck className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-orange-500">Orange ✓ Verified</p>
                      <p className="text-xs text-text-muted mt-0.5">Awarded after our team confirms your identity via student ID. Independent from subscription plan.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-400/10 border border-gray-400/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-gray-400 font-bold text-lg">✦</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-400">Silver ✦</p>
                      <p className="text-xs text-text-muted mt-0.5">Shown on your profile when you have an active Silver subscription.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center flex-shrink-0">
                      <Crown className="w-5 h-5 text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-yellow-500">Gold ✦</p>
                      <p className="text-xs text-text-muted mt-0.5">Shown on your profile when you have an active Gold subscription.</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* ─── SECURITY ─────────────────────────────────────────── */}
          {section === 'security' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-text-primary">Security</h2>

              {/* Personal preferences */}
              <Card>
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Personal</h3>
                <div className="space-y-4">
                  {/* Allow tagging */}
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-text-primary text-sm">Allow Tagging</p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {allowTagging
                          ? 'Friends can tag you in posts.'
                          : 'Nobody can tag you in posts.'}
                      </p>
                    </div>
                    <button
                      onClick={toggleTagging}
                      disabled={togglingTagging}
                      className={cn(
                        'w-11 h-6 rounded-full transition-colors relative flex-shrink-0',
                        allowTagging ? 'bg-accent' : 'bg-surface-border'
                      )}
                    >
                      <div className={cn(
                        'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform shadow-sm',
                        allowTagging ? 'translate-x-6' : 'translate-x-1'
                      )} />
                    </button>
                  </div>
                </div>
              </Card>

              {/* Change password */}
              <Card>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <KeyRound className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <p className="font-semibold text-text-primary">Change Password</p>
                      <p className="text-sm text-text-muted mt-0.5">
                        We'll send a password reset link to <span className="text-text-primary">{user?.email}</span>
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" loading={sendingReset} onClick={sendPasswordReset} className="flex-shrink-0">
                    Send Reset Email
                  </Button>
                </div>
              </Card>

              {/* Private account */}
              <Card>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-surface-hover flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Lock className="w-4 h-4 text-text-secondary" />
                    </div>
                    <div>
                      <p className="font-semibold text-text-primary">Private Account</p>
                      <p className="text-sm text-text-muted mt-0.5">
                        {isPrivate
                          ? 'Your profile is private. Only your connections can see your posts and profile details.'
                          : `Your profile is visible to other ${profile?.university_name ?? 'university'} students only. Students from other universities cannot see your content.`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={togglePrivate}
                    disabled={togglingPrivate}
                    className={cn(
                      'w-11 h-6 rounded-full transition-colors relative flex-shrink-0',
                      isPrivate ? 'bg-accent' : 'bg-surface-border'
                    )}
                  >
                    <div className={cn(
                      'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform shadow-sm',
                      isPrivate ? 'translate-x-6' : 'translate-x-1'
                    )} />
                  </button>
                </div>
              </Card>

              {/* Deactivate */}
              <Card className="border-yellow-500/20">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-yellow-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <UserX className="w-4 h-4 text-yellow-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-text-primary">Deactivate Account</p>
                      <p className="text-sm text-text-muted mt-0.5">
                        Temporarily hide your profile and content. You can reactivate by logging back in anytime.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    loading={deactivating}
                    onClick={deactivateAccount}
                    className="border-yellow-500/40 text-yellow-500 hover:bg-yellow-500/10 flex-shrink-0"
                  >
                    Deactivate
                  </Button>
                </div>
              </Card>

              {/* Delete account */}
              <Card className="border-red-500/20">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-red-500">Delete Account</p>
                      <p className="text-sm text-text-muted mt-0.5">
                        Permanently delete your account and all data. This is irreversible.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setDeleteConfirmText(''); setShowDeleteModal(true) }}
                    className="border-red-500/40 text-red-500 hover:bg-red-500/10 flex-shrink-0"
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* ─── APPEARANCE ───────────────────────────────────────── */}
          {section === 'appearance' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-text-primary">Appearance</h2>
              <Card>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      {theme === 'light'
                        ? <Sun className="w-4 h-4 text-accent" />
                        : <Moon className="w-4 h-4 text-accent" />}
                    </div>
                    <div>
                      <p className="font-semibold text-text-primary">Theme</p>
                      <p className="text-sm text-text-muted mt-0.5">
                        {theme === 'light' ? 'Light mode is currently active' : 'Dark mode is currently active'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-text-muted">{theme === 'light' ? 'Light' : 'Dark'}</span>
                    <button
                      onClick={toggleTheme}
                      className={cn(
                        'w-11 h-6 rounded-full transition-colors relative',
                        theme === 'dark' ? 'bg-accent' : 'bg-surface-border'
                      )}
                    >
                      <div className={cn(
                        'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform shadow-sm',
                        theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                      )} />
                    </button>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Newspaper className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <p className="font-semibold text-text-primary">News Feed</p>
                      <p className="text-sm text-text-muted mt-0.5">
                        {showNews ? 'News panel is visible on the home screen' : 'News panel is hidden from home screen'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-text-muted">{showNews ? 'Visible' : 'Hidden'}</span>
                    <button
                      onClick={toggleShowNews}
                      className={cn(
                        'w-11 h-6 rounded-full transition-colors relative',
                        showNews ? 'bg-accent' : 'bg-surface-border'
                      )}
                    >
                      <div className={cn(
                        'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform shadow-sm',
                        showNews ? 'translate-x-6' : 'translate-x-1'
                      )} />
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* ─── PRIVACY POLICY ───────────────────────────────────── */}
          {section === 'privacy' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-text-primary">Privacy Policy</h2>
              <Card>
                <div className="space-y-5 max-h-[65vh] overflow-y-auto scrollbar-hide pr-1 text-sm text-text-secondary">
                  <p className="text-xs text-text-muted">Last updated: January 1, 2025</p>

                  {[
                    {
                      title: '1. Information We Collect',
                      body: 'We collect information you provide when creating an account and using Uni-verse, including: account credentials (name, email, university affiliation), profile details (bio, photo, academic info), content you post (text, images, listings), messages exchanged with other users, and usage data (pages visited, features used, device information).',
                    },
                    {
                      title: '2. How We Use Your Information',
                      body: 'We use your information to: operate and improve the platform, personalize your experience, verify your student identity when requested, send service-related notifications, detect and prevent fraud or abuse, and comply with legal obligations.',
                    },
                    {
                      title: '3. Information Sharing',
                      body: 'We do not sell your personal information. We may share data with other users (as part of normal platform operation, e.g. your public profile), universities (solely to verify enrollment), service providers who help operate the platform, and when required by law or to protect safety.',
                    },
                    {
                      title: '4. Cookies and Tracking',
                      body: 'We use session cookies to keep you logged in, analytics cookies to understand platform usage, and preference cookies to remember your settings. You may disable non-essential cookies in your browser settings, though this may affect functionality.',
                    },
                    {
                      title: '5. Data Retention',
                      body: 'We retain your data for as long as your account is active. When you delete your account, personal data is removed within 30 days, except where we are legally required to retain it longer.',
                    },
                    {
                      title: '6. Your Rights',
                      body: 'You have the right to access, correct, or delete your personal data through your account settings at any time. You may also contact us to exercise additional rights under applicable data protection laws (GDPR, CCPA, etc.).',
                    },
                    {
                      title: '7. Security',
                      body: 'We use industry-standard measures to protect your data including encryption in transit (TLS) and at rest. However, no method of internet transmission is 100% secure, and we cannot guarantee absolute security.',
                    },
                    {
                      title: '8. Contact Us',
                      body: 'Questions about this Privacy Policy? Contact us at privacy@uni-verse.app.',
                    },
                  ].map(({ title, body }) => (
                    <section key={title} className="space-y-1.5">
                      <h3 className="font-semibold text-text-primary">{title}</h3>
                      <p className="leading-relaxed">{body}</p>
                    </section>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* ─── TERMS AND CONDITIONS ─────────────────────────────── */}
          {section === 'terms' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-text-primary">Terms and Conditions</h2>
              <Card>
                <div className="space-y-5 max-h-[65vh] overflow-y-auto scrollbar-hide pr-1 text-sm text-text-secondary">
                  <p className="text-xs text-text-muted">Last updated: January 1, 2025</p>
                  <p>By using Uni-verse, you agree to these Terms. Please read them carefully before using the platform.</p>

                  {[
                    {
                      title: '1. Eligibility',
                      body: 'You must be at least 18 years old and a currently enrolled student (or verified alumni) at a supported university. By creating an account you confirm these requirements.',
                    },
                    {
                      title: '2. Account Responsibility',
                      body: 'You are responsible for all activity under your account and must keep your credentials secure. You may not share your account with others. Notify us immediately of any unauthorized access.',
                    },
                    {
                      title: '3. Acceptable Use',
                      body: 'You agree not to: post unlawful, harassing, or obscene content; impersonate others; send spam; engage in activity that harms the platform or other users; attempt unauthorized access to any part of the service; post false or misleading marketplace listings.',
                    },
                    {
                      title: '4. Content Ownership',
                      body: 'You retain ownership of content you post. By posting, you grant Uni-verse a worldwide, non-exclusive, royalty-free license to display and distribute your content in connection with the platform. You may delete your content at any time.',
                    },
                    {
                      title: '5. Cookies',
                      body: 'By using Uni-verse you consent to our use of cookies. We use: essential cookies (required for authentication and core functionality), analytics cookies (to understand how the platform is used), and preference cookies (to remember your settings such as theme).',
                    },
                    {
                      title: '6. Marketplace',
                      body: 'Uni-verse provides a marketplace for students to buy, sell, and rent items. We are not a party to any transaction and do not guarantee the quality, safety, or legality of listings. Users transact at their own risk.',
                    },
                    {
                      title: '7. Dates Feature',
                      body: 'The Dates feature helps students meet others at their university. We do not conduct background checks. Exercise appropriate caution when meeting anyone in person. Report inappropriate behaviour through the app.',
                    },
                    {
                      title: '8. Subscriptions',
                      body: 'Silver and Gold plans are billed monthly or annually. You may cancel at any time; your plan remains active until the end of the current billing period. Refunds are not provided for partial periods.',
                    },
                    {
                      title: '9. Limitation of Liability',
                      body: 'Uni-verse is provided "as is" without warranties. We are not liable for indirect, incidental, or consequential damages. Our total liability shall not exceed the amount you paid us in the past 12 months.',
                    },
                    {
                      title: '10. Changes to Terms',
                      body: 'We may update these Terms at any time. We will notify you of material changes via email or in-app notification. Continued use after changes constitutes acceptance.',
                    },
                    {
                      title: '11. Governing Law',
                      body: 'These Terms are governed by the laws of the United States. Disputes will be resolved through binding arbitration in accordance with applicable law.',
                    },
                    {
                      title: '12. Contact',
                      body: 'Questions? Reach us at legal@uni-verse.app.',
                    },
                  ].map(({ title, body }) => (
                    <section key={title} className="space-y-1.5">
                      <h3 className="font-semibold text-text-primary">{title}</h3>
                      <p className="leading-relaxed">{body}</p>
                    </section>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* ─── Delete account confirmation modal ──────────────────── */}
      <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Account">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-text-secondary">
              <p className="font-semibold text-red-500 mb-1">This is permanent and irreversible.</p>
              <p>All your posts, connections, marketplace listings, messages, and dating profile will be deleted. You will not be able to recover your account.</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-text-secondary mb-2">
              Type <span className="font-mono font-bold text-red-500">DELETE</span> to confirm
            </p>
            <Input
              placeholder="DELETE"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={() => setShowDeleteModal(false)}>Cancel</Button>
            <Button
              fullWidth
              loading={deleting}
              disabled={deleteConfirmText !== 'DELETE'}
              onClick={handleDeleteAccount}
              className="bg-red-500 hover:bg-red-600 text-white disabled:opacity-40"
            >
              <Trash2 className="w-4 h-4" />
              Delete Forever
            </Button>
          </div>
        </div>
      </Modal>
    </div>
    </>
  )
}
