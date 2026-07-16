import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow, format } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function timeAgo(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function formatDate(date: string | Date, fmt = 'MMM d, yyyy'): string {
  return format(new Date(date), fmt)
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function pluralize(count: number, word: string): string {
  return `${count} ${word}${count !== 1 ? 's' : ''}`
}

export function truncate(str: string, length: number): string {
  return str.length > length ? str.slice(0, length) + '…' : str
}

export function getAvatarUrl(url: string | null | undefined, name: string): string {
  if (url) return url
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=4F7BF7&textColor=ffffff`
}

export function formatPrice(amount: number | null | undefined): string {
  if (amount == null) return 'Free'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export function getSectionAccent(section: string): string {
  const map: Record<string, string> = {
    home: '#4F7BF7',
    connect: '#4F7BF7',
    dates: '#FF6B9D',
    market: '#10B981',
    chats: '#8B5CF6',
    community: '#8B5CF6',
    admin: '#F59E0B',
  }
  return map[section] ?? '#4F7BF7'
}
