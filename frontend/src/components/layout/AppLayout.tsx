import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { SectionBackground } from './SectionBackground'

const SECTION_MAP: Record<string, string> = {
  home:          'home',
  connect:       'connect',
  dates:         'dates',
  market:        'market',
  chats:         'chats',
  community:     'community',
  admin:         'admin',
  profile:       'profile',
  notifications: 'notifications',
  settings:      'settings',
}

const SECTION_COLOR: Record<string, string> = {
  home:          '#5B8AF5',
  connect:       '#5B8AF5',
  dates:         '#FF6B9D',
  market:        '#10D9A0',
  chats:         '#9B87FB',
  community:     '#9B87FB',
  admin:         '#F59E0B',
  profile:       '#7C6DFA',
  notifications: '#7C6DFA',
  settings:      '#7C6DFA',
}

export function AppLayout() {
  const location = useLocation()
  const segment = location.pathname.split('/')[1] || 'home'
  const section = SECTION_MAP[segment] ?? 'home'
  const color   = SECTION_COLOR[section] ?? '#7C6DFA'

  return (
    <div className="min-h-screen bg-bg-primary" data-section={section}>
      <Sidebar />

      {/*
        Doodle overlay: fixed, covers the content area, above all page content.
        pointer-events:none lets all clicks through.
        Sidebar is z-30 so we stay below it at z-20.
        SVG opacity is set in SectionBackground (0.10 — tasteful but visible).
      */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: '16rem',
          right: 0,
          bottom: 0,
          zIndex: 20,
          pointerEvents: 'none',
        }}
      >
        <SectionBackground color={color} section={section} />
      </div>

      <main className="ml-64 min-h-screen">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
