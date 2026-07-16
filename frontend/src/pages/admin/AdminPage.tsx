import { useState, useEffect } from 'react'
import { Shield, Check, X, Eye, Flag, Users, AlertTriangle, FileText, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import type { Profile, Report } from '../../types'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Avatar } from '../../components/ui/Avatar'
import { Modal } from '../../components/ui/Modal'
import { Textarea } from '../../components/ui/Textarea'
import { cn, formatDate } from '../../lib/utils'
import toast from 'react-hot-toast'
import { Navigate } from 'react-router-dom'

type AdminTab = 'verification' | 'reports' | 'overview' | 'change_requests'

interface ChangeRequest {
  id: string
  user_id: string
  field_name: string
  current_value: string | null
  requested_value: string
  status: string
  admin_note: string | null
  created_at: string
  user?: { full_name: string; username: string | null; email: string }
}

export function AdminPage() {
  const { user, profile } = useAuth()
  const [tab, setTab] = useState<AdminTab>('overview')
  const [pendingUsers, setPendingUsers] = useState<Profile[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([])
  const [stats, setStats] = useState({ total_users: 0, pending_verifications: 0, open_reports: 0 })
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [processing, setProcessing] = useState(false)

  if (!profile?.is_admin) return <Navigate to="/home" replace />

  async function fetchData() {
    const [usersRes, reportsRes, crRes] = await Promise.all([
      supabase.from('profiles').select('*, university:universities(*)').eq('verification_status', 'pending').order('created_at', { ascending: true }),
      supabase.from('reports').select('*, reporter:profiles!reports_reporter_id_fkey(id, full_name, avatar_url)').eq('status', 'pending').order('created_at', { ascending: false }),
      supabase.from('field_change_requests').select('*, user:profiles!field_change_requests_user_id_fkey(full_name, username, email)').eq('status', 'pending').order('created_at', { ascending: false }),
    ])

    const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true })

    setPendingUsers((usersRes.data as Profile[]) ?? [])
    setReports((reportsRes.data as Report[]) ?? [])
    setChangeRequests((crRes.data as ChangeRequest[]) ?? [])
    setStats({
      total_users: totalUsers ?? 0,
      pending_verifications: usersRes.data?.length ?? 0,
      open_reports: reportsRes.data?.length ?? 0,
    })
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  async function verifyUser(userId: string, status: 'verified' | 'rejected', note = '') {
    setProcessing(true)
    const { error } = await supabase
      .from('profiles')
      .update({ verification_status: status })
      .eq('id', userId)

    if (!error) {
      await supabase.from('admin_actions').insert({
        admin_id: user?.id,
        action_type: status === 'verified' ? 'verify_user' : 'reject_user',
        target_type: 'user',
        target_id: userId,
        notes: note || null,
      })

      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'verification',
        title: status === 'verified' ? 'Account Verified!' : 'Verification Rejected',
        body: status === 'verified'
          ? 'Your student ID has been verified. Welcome to Uni-verse!'
          : `Your verification was not approved. Reason: ${note || 'Please contact support.'}`,
      })

      toast.success(status === 'verified' ? 'User verified!' : 'User rejected')
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId))
      setSelectedUser(null)
      setRejectNote('')
    } else {
      toast.error('Action failed')
    }
    setProcessing(false)
  }

  async function resolveReport(reportId: string, status: 'resolved' | 'dismissed') {
    await supabase
      .from('reports')
      .update({ status, resolved_by: user?.id, resolved_at: new Date().toISOString() })
      .eq('id', reportId)

    await supabase.from('admin_actions').insert({
      admin_id: user?.id,
      action_type: 'dismiss_report',
      target_type: 'report',
      target_id: reportId,
    })

    toast.success(status === 'resolved' ? 'Report resolved' : 'Report dismissed')
    setReports((prev) => prev.filter((r) => r.id !== reportId))
  }

  async function resolveChangeRequest(id: string, approve: boolean, targetUserId: string, fieldName: string, requestedValue: string) {
    setProcessing(true)
    if (approve) {
      const update: Record<string, any> = {}
      update[fieldName] = fieldName === 'graduation_year' ? Number(requestedValue) : requestedValue
      await supabase.from('profiles').update(update).eq('id', targetUserId)
    }
    await supabase.from('field_change_requests')
      .update({ status: approve ? 'approved' : 'rejected', updated_at: new Date().toISOString() })
      .eq('id', id)
    await supabase.from('notifications').insert({
      user_id: targetUserId,
      type: 'change_request',
      title: approve ? 'Change Request Approved' : 'Change Request Rejected',
      body: approve
        ? `Your request to change ${fieldName.replace('_', ' ')} has been approved.`
        : `Your request to change ${fieldName.replace('_', ' ')} was not approved.`,
    })
    toast.success(approve ? 'Change approved!' : 'Change rejected')
    setChangeRequests(prev => prev.filter(r => r.id !== id))
    setProcessing(false)
  }

  const TABS: { key: AdminTab; label: string; icon: typeof Shield }[] = [
    { key: 'overview', label: 'Overview', icon: Shield },
    { key: 'verification', label: `Verification (${stats.pending_verifications})`, icon: Users },
    { key: 'reports', label: `Reports (${stats.open_reports})`, icon: Flag },
    { key: 'change_requests', label: `Change Requests (${changeRequests.length})`, icon: FileText },
  ]

  return (
    <div className="space-y-6 animate-fade-in" data-section="admin">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
          <Shield className="w-5 h-5 text-yellow-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Admin Panel</h1>
          <p className="text-text-muted text-sm">Manage users, verifications, and reports</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-hover p-1 rounded-2xl w-fit">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
              tab === key ? 'bg-surface text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="text-center py-6">
            <Users className="w-8 h-8 text-accent mx-auto mb-2" />
            <p className="text-2xl font-bold text-text-primary">{stats.total_users}</p>
            <p className="text-text-muted text-sm">Total Users</p>
          </Card>
          <Card className="text-center py-6">
            <FileText className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-text-primary">{stats.pending_verifications}</p>
            <p className="text-text-muted text-sm">Pending Verification</p>
          </Card>
          <Card className="text-center py-6">
            <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-text-primary">{stats.open_reports}</p>
            <p className="text-text-muted text-sm">Open Reports</p>
          </Card>
        </div>
      )}

      {tab === 'verification' && (
        <div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Card key={i} className="animate-pulse h-20" />)}
            </div>
          ) : pendingUsers.length === 0 ? (
            <Card className="text-center py-16">
              <Check className="w-10 h-10 text-green-400 mx-auto mb-3" />
              <p className="text-text-secondary font-medium">All caught up!</p>
              <p className="text-text-muted text-sm">No pending verifications.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingUsers.map((pUser) => (
                <Card key={pUser.id} className="flex items-center gap-4">
                  <Avatar src={pUser.avatar_url} name={pUser.full_name} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-text-primary">{pUser.full_name}</p>
                      {pUser.is_alumni && <Badge variant="warning">Alumni</Badge>}
                    </div>
                    <p className="text-xs text-text-muted">{pUser.email}</p>
                    <p className="text-xs text-text-muted">
                      {(pUser as any).university?.name} · {pUser.major} · {pUser.degree}
                    </p>
                    <p className="text-xs text-text-muted">ID: {pUser.student_id_number}</p>
                    <p className="text-xs text-text-muted">Applied {formatDate(pUser.created_at)}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {pUser.student_id_url && (
                      <a href={pUser.student_id_url} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline">
                          <Eye className="w-3.5 h-3.5" />
                          View ID
                        </Button>
                      </a>
                    )}
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setSelectedUser(pUser)}
                    >
                      <X className="w-3.5 h-3.5" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => verifyUser(pUser.id, 'verified')}
                      loading={processing}
                    >
                      <Check className="w-3.5 h-3.5" />
                      Verify
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'reports' && (
        <div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Card key={i} className="animate-pulse h-24" />)}
            </div>
          ) : reports.length === 0 ? (
            <Card className="text-center py-16">
              <Flag className="w-10 h-10 text-green-400 mx-auto mb-3" />
              <p className="text-text-secondary font-medium">No open reports</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <Card key={report.id} className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar src={report.reporter?.avatar_url} name={report.reporter?.full_name ?? 'U'} size="sm" />
                      <div>
                        <p className="font-medium text-text-primary text-sm">{report.reporter?.full_name}</p>
                        <p className="text-xs text-text-muted">reported a {report.reported_type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="danger">{report.reason.replace('_', ' ')}</Badge>
                      <Badge variant="warning">Pending</Badge>
                    </div>
                  </div>
                  {report.description && (
                    <p className="text-sm text-text-secondary bg-surface-hover rounded-xl p-3">
                      {report.description}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => resolveReport(report.id, 'dismissed')}
                    >
                      Dismiss
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => resolveReport(report.id, 'resolved')}
                    >
                      <Check className="w-3.5 h-3.5" />
                      Resolve
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Change requests tab */}
      {tab === 'change_requests' && (
        <div>
          {changeRequests.length === 0 ? (
            <Card className="text-center py-12">
              <RefreshCw className="w-8 h-8 text-text-muted mx-auto mb-3" />
              <p className="text-text-secondary font-medium">No pending change requests</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {changeRequests.map(cr => (
                <Card key={cr.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-text-primary text-sm">{cr.user?.full_name ?? cr.user_id}</p>
                        {cr.user?.username && <span className="text-xs text-text-muted">@{cr.user.username}</span>}
                      </div>
                      <p className="text-xs text-text-muted mb-2">{cr.user?.email}</p>
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <span className="text-text-muted capitalize font-medium">{cr.field_name.replace('_', ' ')}</span>
                        <span className="text-text-muted">→</span>
                        <span className="text-accent font-semibold">{cr.requested_value}</span>
                        {cr.current_value && (
                          <span className="text-text-muted">(currently: {cr.current_value})</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button size="sm" onClick={() => resolveChangeRequest(cr.id, true, cr.user_id, cr.field_name, cr.requested_value)} loading={processing}>
                        <Check className="w-3.5 h-3.5" /> Approve
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => resolveChangeRequest(cr.id, false, cr.user_id, cr.field_name, cr.requested_value)} loading={processing}>
                        <X className="w-3.5 h-3.5" /> Reject
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reject user modal */}
      <Modal
        open={!!selectedUser}
        onClose={() => { setSelectedUser(null); setRejectNote('') }}
        title="Reject Verification"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-text-secondary text-sm">
            Rejecting <span className="font-medium text-text-primary">{selectedUser?.full_name}</span>. Provide a reason so they know what to fix.
          </p>
          <Textarea
            label="Reason (sent to user)"
            placeholder="e.g. Student ID is not legible. Please re-upload a clearer photo."
            rows={3}
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
          />
          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={() => setSelectedUser(null)}>Cancel</Button>
            <Button
              variant="danger"
              fullWidth
              loading={processing}
              onClick={() => selectedUser && verifyUser(selectedUser.id, 'rejected', rejectNote)}
            >
              Reject
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
