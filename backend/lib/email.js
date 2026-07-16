import { Resend } from 'resend'
import 'dotenv/config'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = 'Uni-verse <noreply@uni-verse.app>'

export async function sendVerificationApprovedEmail({ to, name }) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: 'Your Uni-verse account is verified!',
    html: `
      <div style="font-family: 'Plus Jakarta Sans', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 24px; background: #F8F9FA;">
        <div style="background: #0A192F; border-radius: 16px; padding: 32px; text-align: center; margin-bottom: 24px;">
          <h1 style="color: #4F7BF7; margin: 0; font-size: 28px;">Uni-verse</h1>
        </div>
        <div style="background: white; border-radius: 16px; padding: 32px;">
          <h2 style="color: #0A192F; margin-top: 0;">Welcome, ${name}! 🎉</h2>
          <p style="color: #495057;">Your student ID has been verified and your account is now active.</p>
          <p style="color: #495057;">You can now:</p>
          <ul style="color: #495057;">
            <li>Connect with fellow students</li>
            <li>Post in your university feed</li>
            <li>Join communities and clubs</li>
            <li>Browse the campus marketplace</li>
          </ul>
          <a href="${process.env.FRONTEND_URL}/home" style="display: inline-block; background: #4F7BF7; color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: 600; margin-top: 16px;">
            Go to Uni-verse
          </a>
        </div>
        <p style="color: #868E96; text-align: center; font-size: 12px; margin-top: 24px;">
          © ${new Date().getFullYear()} Uni-verse. All rights reserved.
        </p>
      </div>
    `,
  })
}

export async function sendVerificationRejectedEmail({ to, name, reason }) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: 'Action required: Uni-verse verification',
    html: `
      <div style="font-family: 'Plus Jakarta Sans', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 24px; background: #F8F9FA;">
        <div style="background: #0A192F; border-radius: 16px; padding: 32px; text-align: center; margin-bottom: 24px;">
          <h1 style="color: #4F7BF7; margin: 0; font-size: 28px;">Uni-verse</h1>
        </div>
        <div style="background: white; border-radius: 16px; padding: 32px;">
          <h2 style="color: #0A192F; margin-top: 0;">Hi ${name},</h2>
          <p style="color: #495057;">Unfortunately, we were unable to verify your account at this time.</p>
          <div style="background: #FFF3CD; border-radius: 12px; padding: 16px; margin: 16px 0;">
            <strong style="color: #856404;">Reason:</strong>
            <p style="color: #856404; margin: 4px 0 0;">${reason || 'Your student ID could not be verified. Please re-upload a clearer image.'}</p>
          </div>
          <p style="color: #495057;">Please log in and upload an updated student ID to re-apply.</p>
          <a href="${process.env.FRONTEND_URL}/auth/complete-profile" style="display: inline-block; background: #4F7BF7; color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: 600; margin-top: 16px;">
            Re-apply
          </a>
        </div>
      </div>
    `,
  })
}

export async function sendNewMessageEmail({ to, name, senderName, preview }) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: `New message from ${senderName} — Uni-verse`,
    html: `
      <div style="font-family: 'Plus Jakarta Sans', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 24px; background: #F8F9FA;">
        <div style="background: #0A192F; border-radius: 16px; padding: 32px; text-align: center; margin-bottom: 24px;">
          <h1 style="color: #4F7BF7; margin: 0; font-size: 28px;">Uni-verse</h1>
        </div>
        <div style="background: white; border-radius: 16px; padding: 32px;">
          <h2 style="color: #0A192F; margin-top: 0;">Hi ${name},</h2>
          <p style="color: #495057;"><strong>${senderName}</strong> sent you a message:</p>
          <div style="background: #F1F3F5; border-radius: 12px; padding: 16px; margin: 16px 0; font-style: italic; color: #495057;">
            "${preview}"
          </div>
          <a href="${process.env.FRONTEND_URL}/chats" style="display: inline-block; background: #8B5CF6; color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: 600; margin-top: 8px;">
            Reply on Uni-verse
          </a>
        </div>
      </div>
    `,
  })
}
