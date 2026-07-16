import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Globe, Eye, EyeOff, Mail, User, Calendar, Building, ChevronLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { UNIVERSITIES } from '../../data/universities'
import toast from 'react-hot-toast'

const currentYear = new Date().getFullYear()

// ── Personal account schema (strict university email validation) ──
const personalSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email').refine(
    (v) => !v.endsWith('@gmail.com') && !v.endsWith('@yahoo.com') && !v.endsWith('@hotmail.com') && !v.endsWith('@outlook.com'),
    'Please use your university email address'
  ),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  dob: z.string().min(1, 'Date of birth is required'),
  university_name: z.string().min(1, 'Select your university'),
  enrollment_year: z.coerce.number().min(1990).max(currentYear),
  graduation_year: z.coerce.number().min(currentYear - 10).max(currentYear + 10),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

// ── Page account schema (any email allowed, no academic fields) ──
const pageSchema = z.object({
  full_name: z.string().min(2, 'Page name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type PersonalData = z.infer<typeof personalSchema>
type PageData = z.infer<typeof pageSchema>

// ── Personal Form ─────────────────────────────────────────────────────────────
function PersonalSignupForm({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate()
  const [showPw, setShowPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<PersonalData>({
    resolver: zodResolver(personalSchema) as any,
    defaultValues: {
      enrollment_year: currentYear,
      graduation_year: currentYear + 4,
    },
  })

  async function onSubmit(data: PersonalData) {
    const uni = UNIVERSITIES.find((u) => u.name === data.university_name)
    if (uni && !data.email.endsWith(uni.domain)) {
      toast.error(`Please use your ${uni.name} email address (@${uni.domain})`)
      return
    }

    // Alumni is auto-determined: graduation year in the past means alumnus
    const is_alumni = data.graduation_year <= currentYear

    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          account_type: 'user',
          full_name: data.full_name,
          dob: data.dob,
          enrollment_year: data.enrollment_year,
          graduation_year: data.graduation_year,
          is_alumni,
          university_name: data.university_name,
        },
      },
    })

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Check your email to verify your account!')
    navigate('/auth/verify-email', { state: { email: data.email } })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Input
        label="Full Name"
        placeholder="Jane Smith"
        leftIcon={<User className="w-4 h-4" />}
        error={errors.full_name?.message}
        {...register('full_name')}
      />

      <Input
        label="University Email"
        type="email"
        placeholder="you@university.edu"
        leftIcon={<Mail className="w-4 h-4" />}
        error={errors.email?.message}
        hint="Must match your selected university's domain (e.g. @usf.edu)"
        {...register('email')}
      />

      <Input
        label="Date of Birth"
        type="date"
        leftIcon={<Calendar className="w-4 h-4" />}
        error={errors.dob?.message}
        max={new Date(Date.now() - 14 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
        {...register('dob')}
      />

      <Select
        label="University"
        placeholder="Select your university"
        error={errors.university_name?.message}
        {...register('university_name')}
      >
        {UNIVERSITIES.map((u) => (
          <option key={u.domain} value={u.name}>{u.name}</option>
        ))}
      </Select>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Enrollment Year"
          type="number"
          min={1990}
          max={currentYear}
          error={errors.enrollment_year?.message}
          {...register('enrollment_year')}
        />
        <Input
          label="Graduation Year"
          type="number"
          min={currentYear - 10}
          max={currentYear + 10}
          error={errors.graduation_year?.message}
          {...register('graduation_year')}
        />
      </div>

      <div className="text-xs text-text-muted bg-surface-hover rounded-xl px-3 py-2">
        If your graduation year is in the past, your account will be treated as alumni — you can upload a diploma during verification.
      </div>

      <Input
        label="Password"
        type={showPw ? 'text' : 'password'}
        placeholder="At least 8 characters"
        rightIcon={
          <button type="button" onClick={() => setShowPw(!showPw)}>
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        }
        error={errors.password?.message}
        {...register('password')}
      />

      <Input
        label="Confirm Password"
        type={showConfirmPw ? 'text' : 'password'}
        placeholder="Repeat your password"
        rightIcon={
          <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)}>
            {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        }
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />

      <div className="flex gap-3 pt-1">
        <Button type="button" variant="outline" onClick={onBack}>
          <ChevronLeft className="w-4 h-4" /> Back
        </Button>
        <Button type="submit" fullWidth loading={isSubmitting} size="lg">
          Create Account
        </Button>
      </div>
    </form>
  )
}

// ── Page Account Form ─────────────────────────────────────────────────────────
function PageSignupForm({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate()
  const [showPw, setShowPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<PageData>({
    resolver: zodResolver(pageSchema) as any,
  })

  async function onSubmit(data: PageData) {
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          account_type: 'page',
          full_name: data.full_name,
        },
      },
    })

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Check your email to verify your account!')
    navigate('/auth/verify-email', { state: { email: data.email } })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="rounded-2xl bg-accent/10 border border-accent/20 p-3 text-sm text-text-secondary">
        Page accounts accept any email address — university email not required.
      </div>

      <Input
        label="Page Name"
        placeholder="USF Memes, Campus Eats…"
        leftIcon={<User className="w-4 h-4" />}
        error={errors.full_name?.message}
        {...register('full_name')}
      />

      <Input
        label="Email"
        type="email"
        placeholder="contact@yourpage.com"
        leftIcon={<Mail className="w-4 h-4" />}
        error={errors.email?.message}
        {...register('email')}
      />

      <Input
        label="Password"
        type={showPw ? 'text' : 'password'}
        placeholder="At least 8 characters"
        rightIcon={
          <button type="button" onClick={() => setShowPw(!showPw)}>
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        }
        error={errors.password?.message}
        {...register('password')}
      />

      <Input
        label="Confirm Password"
        type={showConfirmPw ? 'text' : 'password'}
        placeholder="Repeat your password"
        rightIcon={
          <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)}>
            {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        }
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />

      <div className="flex gap-3 pt-1">
        <Button type="button" variant="outline" onClick={onBack}>
          <ChevronLeft className="w-4 h-4" /> Back
        </Button>
        <Button type="submit" fullWidth loading={isSubmitting} size="lg">
          Create Page Account
        </Button>
      </div>
    </form>
  )
}

// ── Main SignupPage ───────────────────────────────────────────────────────────
export function SignupPage() {
  const [accountType, setAccountType] = useState<'personal' | 'page' | null>(null)

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center mb-4 shadow-glow">
            <Globe className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Create your account</h1>
          <p className="text-text-muted mt-1">
            {accountType === null
              ? 'Choose how you want to join Uni-verse'
              : accountType === 'personal'
              ? 'Join with your university email'
              : 'Create a page for your brand or community'}
          </p>
        </div>

        {/* ── Account type selection ── */}
        {accountType === null && (
          <>
            <div className="rounded-2xl bg-accent/10 border border-accent/20 p-4 mb-4">
              <p className="text-sm font-semibold text-text-primary mb-2">Personal accounts available at:</p>
              <ul className="text-sm text-text-secondary space-y-1">
                <li>· University of South Florida — <span className="text-text-muted">@usf.edu</span></li>
                <li>· University of North Texas — <span className="text-text-muted">@unt.edu</span></li>
                <li>· University of Texas at Dallas — <span className="text-text-muted">@utdallas.edu</span></li>
                <li>· Rutgers University — <span className="text-text-muted">@rutgers.edu</span></li>
                <li>· BVRIT Hyderabad College of Engineering — <span className="text-text-muted">@bvrit.ac.in</span></li>
              </ul>
            </div>

            <div className="bg-surface border border-surface-border rounded-3xl p-8 shadow-glass">
              <p className="text-sm text-text-muted text-center mb-5">
                What type of account do you want to create?
              </p>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  onClick={() => setAccountType('personal')}
                  className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-surface-border hover:border-accent/60 hover:bg-accent/5 transition-all text-left"
                >
                  <div className="w-12 h-12 rounded-full bg-surface-border flex items-center justify-center">
                    <User className="w-6 h-6 text-text-secondary" />
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary text-sm">Personal Account</p>
                    <p className="text-xs text-text-muted mt-1 leading-relaxed">
                      For students — requires university email. Connect with classmates at your school.
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setAccountType('page')}
                  className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-surface-border hover:border-accent/60 hover:bg-accent/5 transition-all text-left"
                >
                  <div className="w-12 h-12 rounded-full bg-surface-border flex items-center justify-center">
                    <Building className="w-6 h-6 text-text-secondary" />
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary text-sm">Page Account</p>
                    <p className="text-xs text-text-muted mt-1 leading-relaxed">
                      For meme pages, clubs, restaurants &amp; brands. Any email works.
                    </p>
                  </div>
                </button>
              </div>

              <p className="text-center text-sm text-text-muted">
                Already have an account?{' '}
                <Link to="/auth/login" className="text-accent font-medium hover:underline">Sign in</Link>
              </p>
            </div>
          </>
        )}

        {/* ── Personal form ── */}
        {accountType === 'personal' && (
          <div className="bg-surface border border-surface-border rounded-3xl p-8 shadow-glass">
            <PersonalSignupForm onBack={() => setAccountType(null)} />
            <p className="text-center text-xs text-text-muted mt-6">
              By creating an account, you agree to our{' '}
              <Link to="/terms" className="text-accent hover:underline">Terms of Service</Link> and{' '}
              <Link to="/privacy" className="text-accent hover:underline">Privacy Policy</Link>.
            </p>
            <p className="text-center text-sm text-text-muted mt-4">
              Already have an account?{' '}
              <Link to="/auth/login" className="text-accent font-medium hover:underline">Sign in</Link>
            </p>
          </div>
        )}

        {/* ── Page form ── */}
        {accountType === 'page' && (
          <div className="bg-surface border border-surface-border rounded-3xl p-8 shadow-glass">
            <PageSignupForm onBack={() => setAccountType(null)} />
            <p className="text-center text-xs text-text-muted mt-6">
              By creating an account, you agree to our{' '}
              <Link to="/terms" className="text-accent hover:underline">Terms of Service</Link> and{' '}
              <Link to="/privacy" className="text-accent hover:underline">Privacy Policy</Link>.
            </p>
            <p className="text-center text-sm text-text-muted mt-4">
              Already have an account?{' '}
              <Link to="/auth/login" className="text-accent font-medium hover:underline">Sign in</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
