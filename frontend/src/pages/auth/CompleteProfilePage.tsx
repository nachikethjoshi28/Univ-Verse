import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Globe, ChevronRight, ChevronLeft, User, Building, ShieldCheck, Upload, X, GraduationCap, IdCard } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { cn } from '../../lib/utils'
import toast from 'react-hot-toast'

const currentYear = new Date().getFullYear()

const PAGE_CATEGORIES = [
  'Meme Page', 'Restaurant / Food', 'Club / Organization', 'News & Media',
  'Business / Brand', 'Entertainment', 'Sports', 'Education', 'Other',
]

const DEGREES = [
  'Associate', 'Bachelor of Science (BS)', 'Bachelor of Arts (BA)',
  'Master of Science (MS)', 'Master of Arts (MA)', 'MBA', 'JD', 'MD', 'PhD', 'Other',
]
const MAJORS = [
  'Computer Science', 'Information Technology', 'Software Engineering',
  'Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering',
  'Chemical Engineering', 'Biomedical Engineering', 'Business Administration',
  'Finance', 'Economics', 'Mathematics', 'Statistics', 'Physics', 'Chemistry',
  'Biology', 'Psychology', 'Sociology', 'Political Science', 'History', 'English',
  'Communications', 'Marketing', 'Accounting', 'Data Science', 'Artificial Intelligence', 'Other',
]

const STEPS = [
  { id: 1, label: 'Account Type', desc: 'Choose your account type' },
  { id: 2, label: 'Your Photo',    desc: 'Choose a profile picture' },
  { id: 3, label: 'About You',     desc: 'Username and bio' },
  { id: 4, label: 'Academic Info', desc: 'Major, degree, branch' },
  { id: 5, label: 'Contact',       desc: 'Phone, address, backup email' },
  { id: 6, label: 'Verify ID',     desc: 'Upload your student ID or diploma' },
]

export function CompleteProfilePage() {
  const navigate = useNavigate()
  const { user, refreshProfile } = useAuth()
  const [saving, setSaving] = useState(false)

  // Step 1 — account type (pre-populated from signup metadata)
  const [accountType, setAccountType] = useState<'user' | 'page'>('user')
  const [pageCategory, setPageCategory] = useState('')

  // Start at step 2 if account_type was already chosen during signup
  const metaAccountType = (user?.user_metadata?.account_type as string | undefined) ?? null
  const [step, setStep] = useState(() => metaAccountType ? 2 : 1)

  // Step 2 — avatar
  const fileRef = useRef<HTMLInputElement>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  // Step 2 — about
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [checkingUsername, setCheckingUsername] = useState(false)

  // Sync account type from signup metadata
  useEffect(() => {
    if (!user) return
    const meta = user.user_metadata?.account_type as string | undefined
    if (meta === 'page') {
      setAccountType('page')
      setStep((s) => (s === 1 ? 2 : s))
    } else if (meta === 'user') {
      setAccountType('user')
      setStep((s) => (s === 1 ? 2 : s))
    }
  }, [user?.id])

  useEffect(() => {
    if (!username || username.length < 3 || !/^[a-z0-9_]{3,30}$/.test(username)) {
      setUsernameAvailable(null)
      return
    }
    const timer = setTimeout(async () => {
      setCheckingUsername(true)
      const { data } = await supabase.from('profiles').select('id').eq('username', username).maybeSingle()
      setUsernameAvailable(data === null)
      setCheckingUsername(false)
    }, 400)
    return () => clearTimeout(timer)
  }, [username])

  // Step 3 — academic
  const [major, setMajor] = useState('')
  const [degree, setDegree] = useState('')
  const [branch, setBranch] = useState('')

  // Step 4 — contact
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [altEmail, setAltEmail] = useState('')

  // Step 6 — ID verification
  const metaGradYear = Number(user?.user_metadata?.graduation_year ?? currentYear + 4)
  const isAlumni = metaGradYear <= new Date().getFullYear()
  const [verifyDocType, setVerifyDocType] = useState<'student_id' | 'diploma'>('student_id')
  const [verifyFile, setVerifyFile] = useState<File | null>(null)
  const [submittingVerify, setSubmittingVerify] = useState(false)


  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  function validateStep(): boolean {
    if (step === 1 && accountType === 'page' && !pageCategory) {
      toast.error('Please select a page category'); return false
    }
    if (step === 3) {
      if (!username.trim()) { toast.error('Username is required'); return false }
      if (!/^[a-z0-9_]{3,30}$/.test(username)) {
        toast.error('Username: 3-30 chars, lowercase letters/numbers/underscores only'); return false
      }
      if (usernameAvailable === false) { toast.error('Username already taken — try something else'); return false }
      if (checkingUsername || (usernameAvailable === null && username.length >= 3)) {
        toast.error('Please wait — checking username availability…'); return false
      }
    }
    if (step === 4 && accountType === 'user') {
      if (!major) { toast.error('Please select your major'); return false }
      if (!degree) { toast.error('Please select your degree'); return false }
    }
    return true
  }

  function nextStep() {
    if (!validateStep()) return
    // Page accounts skip academic step (4) and ID verification step (6)
    if (accountType === 'page' && step === 3) { setStep(5); return }
    if (accountType === 'page' && step === 5) { submit(); return }
    setStep((s) => Math.min(s + 1, STEPS.length))
  }

  function prevStep() {
    if (accountType === 'page' && step === 5) { setStep(3); return }
    setStep((s) => Math.max(s - 1, 1))
  }

  async function submitVerificationDoc() {
    if (!user || !verifyFile) return
    setSubmittingVerify(true)
    const ext = verifyFile.name.split('.').pop()
    const path = `verify-docs/${user.id}/doc.${ext}`
    const { error: upErr } = await supabase.storage.from('documents').upload(path, verifyFile, { upsert: true })
    if (upErr) {
      toast.error('Upload failed — try a smaller file (under 5 MB)')
      setSubmittingVerify(false)
      return
    }
    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path)
    await supabase.from('profiles').update({
      student_id_url: urlData.publicUrl,
      verification_document_type: verifyDocType,
      verification_submitted_at: new Date().toISOString(),
      verification_status: 'pending',
    }).eq('id', user.id)
    setSubmittingVerify(false)
    toast.success('Documents submitted! Admin will review within 24–48 hours.')
    await refreshProfile()
    navigate('/home')
  }

  async function submit() {
    if (!user) return
    setSaving(true)

    let avatarUrl: string | null = null

    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      const { error } = await supabase.storage.from('media').upload(
        `avatars/${user.id}/profile.${ext}`, avatarFile, { upsert: true }
      )
      if (!error) {
        const { data } = supabase.storage.from('media').getPublicUrl(`avatars/${user.id}/profile.${ext}`)
        avatarUrl = data.publicUrl
      }
    }

    const { error } = await supabase.from('profiles').update({
      username:          username.trim() || null,
      bio:               bio.trim() || null,
      major:             accountType === 'user' ? (major || null) : null,
      degree:            accountType === 'user' ? (degree || null) : null,
      branch:            accountType === 'user' ? (branch.trim() || null) : null,
      phone:             phone.trim() || null,
      address:           address.trim() || null,
      alternative_email: altEmail.trim() || null,
      account_type:      accountType,
      page_category:     accountType === 'page' ? (pageCategory || null) : null,
      ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
    }).eq('id', user.id)

    if (error) {
      toast.error(error.message.includes('unique') ? 'Username already taken' : 'Failed to save profile')
      setSaving(false)
      return
    }

    await refreshProfile()
    toast.success('Welcome to Uni-verse!')
    navigate('/home')
    setSaving(false)
  }

  const progressPct = ((step - 1) / (STEPS.length - 1)) * 100

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center mb-4 shadow-glow">
            <Globe className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Complete your profile</h1>
          <p className="text-text-muted mt-1">Step {step} of {STEPS.length} — {STEPS[step - 1]?.desc}</p>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-surface-border rounded-full mb-8 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent to-accent-hover rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Step labels */}
        <div className="flex justify-between mb-8 px-1">
          {STEPS.map(({ id, label }) => (
            <div key={id} className="flex flex-col items-center gap-1">
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                id < step ? 'bg-accent text-white' :
                id === step ? 'bg-accent/20 text-accent border-2 border-accent' :
                'bg-surface-border text-text-muted'
              )}>
                {id < step ? '✓' : id}
              </div>
              <span className={cn(
                'text-[10px] font-medium hidden sm:block',
                id === step ? 'text-accent' : id < step ? 'text-text-secondary' : 'text-text-muted'
              )}>{label}</span>
            </div>
          ))}
        </div>

        <div className="bg-surface border border-surface-border rounded-3xl p-8 shadow-glass space-y-5">

          {/* ── Step 1: Account Type ─────────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              <p className="text-sm text-text-muted text-center">
                Uni-verse is available for <strong className="text-text-primary">USF, BVRIT, UTD, UNT, and Rutgers</strong> students.<br />
                Choose the type of account you want to create.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {/* User account card */}
                <button
                  onClick={() => setAccountType('user')}
                  className={cn(
                    'flex flex-col items-center gap-2 p-5 rounded-2xl border-2 text-left transition-all',
                    accountType === 'user'
                      ? 'border-accent bg-accent/10'
                      : 'border-surface-border hover:border-accent/40 bg-surface-hover'
                  )}
                >
                  <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', accountType === 'user' ? 'bg-accent text-white' : 'bg-surface-border text-text-muted')}>
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary text-sm">Personal Account</p>
                    <p className="text-xs text-text-muted mt-1 leading-relaxed">Connect with classmates, share posts, private or public</p>
                  </div>
                </button>
                {/* Page account card */}
                <button
                  onClick={() => setAccountType('page')}
                  className={cn(
                    'flex flex-col items-center gap-2 p-5 rounded-2xl border-2 text-left transition-all',
                    accountType === 'page'
                      ? 'border-accent bg-accent/10'
                      : 'border-surface-border hover:border-accent/40 bg-surface-hover'
                  )}
                >
                  <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', accountType === 'page' ? 'bg-accent text-white' : 'bg-surface-border text-text-muted')}>
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary text-sm">Page Account</p>
                    <p className="text-xs text-text-muted mt-1 leading-relaxed">Meme page, restaurant, club — visible to everyone</p>
                  </div>
                </button>
              </div>

              {accountType === 'page' && (
                <Select
                  label="Page Category *"
                  value={pageCategory}
                  onChange={(e) => setPageCategory(e.target.value)}
                  placeholder="Select category"
                >
                  {PAGE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              )}

              <Button fullWidth onClick={nextStep}>
                Continue <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* ── Step 2: Profile Picture ───────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                <div
                  className="w-32 h-32 rounded-full border-4 border-surface-border overflow-hidden relative cursor-pointer group"
                  onClick={() => fileRef.current?.click()}
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} className="w-full h-full object-cover" alt="preview" />
                  ) : (
                    <div className="w-full h-full bg-surface-hover flex items-center justify-center">
                      <Camera className="w-10 h-10 text-text-muted" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                </div>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
                <div className="text-center">
                  <Button variant="outline" onClick={() => fileRef.current?.click()}>
                    {avatarPreview ? 'Change Photo' : 'Choose Profile Photo'}
                  </Button>
                  <p className="text-text-muted text-xs mt-2">JPG, PNG, or WebP · max 5 MB</p>
                  <p className="text-text-muted text-xs">You can skip this and add it later in Settings</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" fullWidth onClick={prevStep}>
                  <ChevronLeft className="w-4 h-4" /> Back
                </Button>
                <Button fullWidth onClick={nextStep}>
                  {avatarPreview ? 'Continue' : 'Skip for now'} <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 3: About You ─────────────────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Input
                  label="Username *"
                  placeholder="jane_smith"
                  hint="3–30 chars · lowercase letters, numbers, underscores"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                />
                {username.length >= 3 && (
                  <p className={cn(
                    'text-xs font-medium pl-1',
                    checkingUsername ? 'text-text-muted' :
                    usernameAvailable === true ? 'text-green-500' :
                    usernameAvailable === false ? 'text-red-500' : 'text-text-muted'
                  )}>
                    {checkingUsername ? 'Checking availability…' :
                     usernameAvailable === true ? `✓ @${username} is available` :
                     usernameAvailable === false ? `✗ @${username} is already taken — try something else` : ''}
                  </p>
                )}
              </div>
              <Textarea
                label="Bio (optional)"
                placeholder={accountType === 'page' ? 'Describe your page…' : 'Tell the community a bit about yourself…'}
                rows={4}
                maxLength={300}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
              <div className="flex gap-3 pt-2">
                <Button variant="outline" fullWidth onClick={prevStep}>
                  <ChevronLeft className="w-4 h-4" /> Back
                </Button>
                <Button fullWidth onClick={nextStep}>
                  Continue <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 4: Academic Info (user accounts only) ────────────────────── */}
          {step === 4 && (
            <div className="space-y-4">
              <Select
                label="Degree *"
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
                placeholder="Select your degree"
              >
                {DEGREES.map((d) => <option key={d} value={d}>{d}</option>)}
              </Select>
              <Select
                label="Major *"
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                placeholder="Select your major"
              >
                {MAJORS.map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
              <Input
                label="Branch / Specialization (optional)"
                placeholder="e.g. Machine Learning, Corporate Finance…"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
              />
              <div className="flex gap-3 pt-2">
                <Button variant="outline" fullWidth onClick={prevStep}>
                  <ChevronLeft className="w-4 h-4" /> Back
                </Button>
                <Button fullWidth onClick={nextStep}>
                  Continue <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 5: Contact Info ───────────────────────────────────────────── */}
          {step === 5 && (
            <div className="space-y-4">
              <Input
                label="Phone Number (optional)"
                placeholder="+1 (813) 555-0100"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Input
                label="Current Address (optional)"
                placeholder="123 Main St, Tampa, FL 33602"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
              <div>
                <Input
                  label="Recovery Email (optional)"
                  placeholder="personal@gmail.com"
                  type="email"
                  value={altEmail}
                  onChange={(e) => setAltEmail(e.target.value)}
                />
                <p className="text-xs text-text-muted mt-1.5">
                  Used only for account recovery. You cannot log in with this email.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" fullWidth onClick={prevStep}>
                  <ChevronLeft className="w-4 h-4" /> Back
                </Button>
                <Button fullWidth loading={saving} onClick={accountType === 'page' ? submit : nextStep}>
                  {saving ? 'Setting up…' : accountType === 'page' ? 'Enter Uni-verse' : 'Continue'} {!saving && <ChevronRight className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 6: ID Verification (personal accounts only) ──────────────── */}
          {step === 6 && (
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <ShieldCheck className="w-10 h-10 text-accent mx-auto" />
                <p className="text-sm font-semibold text-text-primary">Verify Your Identity</p>
                <p className="text-xs text-text-muted">
                  Upload your student ID (or diploma if you graduated) so an admin can approve your account.
                  Until approved, you can only view content from page accounts.
                </p>
              </div>

              {/* Document type selector — alumni see both options */}
              {isAlumni && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setVerifyDocType('student_id')}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-sm',
                      verifyDocType === 'student_id' ? 'border-accent bg-accent/10' : 'border-surface-border hover:border-accent/40'
                    )}
                  >
                    <IdCard className="w-6 h-6 text-text-secondary" />
                    <span className="font-medium text-text-primary">Student ID</span>
                    <span className="text-xs text-text-muted text-center">Your university-issued ID card</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVerifyDocType('diploma')}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-sm',
                      verifyDocType === 'diploma' ? 'border-accent bg-accent/10' : 'border-surface-border hover:border-accent/40'
                    )}
                  >
                    <GraduationCap className="w-6 h-6 text-text-secondary" />
                    <span className="font-medium text-text-primary">Diploma / Transcript</span>
                    <span className="text-xs text-text-muted text-center">Shows graduation year</span>
                  </button>
                </div>
              )}

              {/* File upload area */}
              <div
                className="border-2 border-dashed border-surface-border hover:border-accent/40 rounded-2xl p-6 text-center cursor-pointer transition-colors"
                onClick={() => document.getElementById('step6-verify-upload')?.click()}
              >
                <input
                  id="step6-verify-upload"
                  type="file"
                  accept="image/*,.pdf"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f && f.size > 5 * 1024 * 1024) { toast.error('File must be under 5 MB'); return }
                    if (f) setVerifyFile(f)
                  }}
                />
                {verifyFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-sm text-text-primary font-medium truncate max-w-xs">{verifyFile.name}</span>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setVerifyFile(null) }}>
                      <X className="w-4 h-4 text-text-muted hover:text-red-400" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-7 h-7 text-text-muted" />
                    <p className="text-sm text-text-secondary">
                      Click to upload your {verifyDocType === 'diploma' ? 'diploma or transcript' : 'student ID'}
                    </p>
                    <p className="text-xs text-text-muted">JPG, PNG or PDF · max 5 MB</p>
                  </div>
                )}
              </div>
              <p className="text-xs text-text-muted text-center">
                Stored securely — only our admin team can see it. Never shown publicly.
              </p>

              <div className="flex gap-3">
                <Button variant="outline" fullWidth onClick={prevStep}>
                  <ChevronLeft className="w-4 h-4" /> Back
                </Button>
                <Button
                  fullWidth
                  loading={submittingVerify || saving}
                  onClick={verifyFile ? submitVerificationDoc : submit}
                >
                  {verifyFile ? 'Submit & Enter Uni-verse' : 'Skip for now'}
                </Button>
              </div>

              {!verifyFile && (
                <p className="text-xs text-text-muted text-center">
                  You can verify later in Settings, but restricted features won't be available until admin approves.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
