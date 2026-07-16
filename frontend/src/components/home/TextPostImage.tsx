interface TextPostImageProps {
  text: string
  className?: string
}

export function TextPostImage({ text, className = '' }: TextPostImageProps) {
  // Scale font down for longer text
  const len = text.length
  const fontSize = len > 200 ? '12px' : len > 120 ? '14px' : len > 60 ? '18px' : len > 30 ? '22px' : '28px'
  const lineHeight = len > 120 ? 1.55 : 1.5

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden mb-3 ${className}`}
      style={{ aspectRatio: '4/3', background: '#ffffff' }}
    >
      {/* Uni-verse watermark — very light, diagonal */}
      <div
        aria-hidden
        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
      >
        <span
          style={{
            fontSize: '72px',
            fontWeight: 900,
            color: 'rgba(0,0,0,0.04)',
            transform: 'rotate(-22deg)',
            letterSpacing: '-3px',
            whiteSpace: 'nowrap',
            userSelect: 'none',
          }}
        >
          Uni-verse
        </span>
      </div>

      {/* Text */}
      <div className="absolute inset-0 flex items-center justify-center p-8">
        <p
          className="text-center font-medium"
          style={{
            fontSize,
            lineHeight,
            color: '#1a1a2e',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            maxHeight: '100%',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 10,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {text}
        </p>
      </div>

      {/* Subtle bottom brand bar */}
      <div
        className="absolute bottom-0 inset-x-0 flex items-center justify-end px-4 py-1.5"
        style={{ background: 'rgba(0,0,0,0.04)' }}
      >
        <span style={{ fontSize: '10px', color: 'rgba(0,0,0,0.2)', fontWeight: 600, letterSpacing: '0.5px' }}>
          UNI-VERSE
        </span>
      </div>
    </div>
  )
}
