import { cn, getInitials, getAvatarUrl } from '../../lib/utils'

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface AvatarProps {
  src?: string | null
  name: string
  size?: Size
  className?: string
  online?: boolean
}

const sizeMap: Record<Size, string> = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-lg',
}

export function Avatar({ src, name, size = 'md', className, online }: AvatarProps) {
  const avatarUrl = getAvatarUrl(src, name)
  return (
    <div className={cn('relative flex-shrink-0', className)}>
      <img
        src={avatarUrl}
        alt={name}
        className={cn('rounded-full object-cover bg-surface-hover', sizeMap[size])}
        onError={(e) => {
          const t = e.currentTarget
          t.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(getInitials(name))}&background=4F7BF7&color=fff`
        }}
      />
      {online !== undefined && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-bg-primary',
            online ? 'bg-green-400' : 'bg-text-muted',
            size === 'xs' || size === 'sm' ? 'w-2 h-2' : 'w-3 h-3'
          )}
        />
      )}
    </div>
  )
}
