import { useState, useEffect, useCallback } from 'react'
import { Newspaper, Edit3, Check, X, RefreshCw, ExternalLink } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { cn } from '../../lib/utils'

export const NEWS_INTERESTS = [
  { label: 'Technology',    section: 'technology',   emoji: '💻' },
  { label: 'World News',    section: 'world',         emoji: '🌍' },
  { label: 'Science',       section: 'science',       emoji: '🔬' },
  { label: 'Sports',        section: 'sport',         emoji: '⚽' },
  { label: 'Business',      section: 'business',      emoji: '📈' },
  { label: 'Entertainment', section: 'culture',       emoji: '🎭' },
  { label: 'Health',        section: 'lifeandstyle',  emoji: '💊' },
  { label: 'Politics',      section: 'politics',      emoji: '🏛️' },
  { label: 'Environment',   section: 'environment',   emoji: '🌿' },
  { label: 'Education',     section: 'education',     emoji: '📚' },
  { label: 'Travel',        section: 'travel',        emoji: '✈️' },
  { label: 'Music',         section: 'music',         emoji: '🎵' },
  { label: 'Film & TV',     section: 'film',          emoji: '🎬' },
  { label: 'Food',          section: 'food',          emoji: '🍕' },
  { label: 'Gaming',        section: 'games',         emoji: '🎮' },
]

const DEFAULTS = ['Technology', 'World News', 'Science']

const GUARDIAN_KEY  = import.meta.env.VITE_GUARDIAN_API_KEY  || 'test'
const NYT_KEY       = import.meta.env.VITE_NYT_API_KEY       || ''
const GNEWS_KEY     = import.meta.env.VITE_GNEWS_API_KEY     || ''

const RSS2JSON = 'https://api.rss2json.com/v1/api.json'

// ── Interest → API-specific mappings ──────────────────────────────────────────

const NYT_DESKS: Record<string, string> = {
  'Technology':    'Technology',
  'World News':    'Foreign',
  'Science':       'Science',
  'Sports':        'Sports',
  'Business':      'Business',
  'Entertainment': 'Arts & Leisure',
  'Health':        'Science',
  'Politics':      'Washington',
  'Environment':   'Science',
  'Education':     'Education',
  'Travel':        'Travel',
  'Food':          'Food',
  'Film & TV':     'Arts & Leisure',
  'Music':         'Arts & Leisure',
  'Gaming':        'Technology',
}

const GNEWS_TOPICS: Record<string, string> = {
  'Technology':    'technology',
  'World News':    'world',
  'Science':       'science',
  'Sports':        'sports',
  'Business':      'business',
  'Entertainment': 'entertainment',
  'Health':        'health',
  'Politics':      'nation',
  'Environment':   'science',
  'Education':     'nation',
  'Travel':        'world',
  'Food':          'entertainment',
  'Film & TV':     'entertainment',
  'Music':         'entertainment',
  'Gaming':        'technology',
}

const GOOGLE_NEWS_TOPICS: Record<string, string> = {
  'Technology':    'TECHNOLOGY',
  'World News':    'WORLD',
  'Science':       'SCIENCE',
  'Sports':        'SPORTS',
  'Business':      'BUSINESS',
  'Entertainment': 'ENTERTAINMENT',
  'Health':        'HEALTH',
  'Politics':      'NATION',
  'Environment':   'SCIENCE',
  'Education':     'NATION',
  'Travel':        'TRAVEL',
  'Food':          'HEALTH',
  'Film & TV':     'ENTERTAINMENT',
  'Music':         'ENTERTAINMENT',
  'Gaming':        'TECHNOLOGY',
}

// Reddit subreddits — no API key, CORS allowed, always fresh
const REDDIT_SUBS: Record<string, string[]> = {
  'Technology':    ['technology', 'tech'],
  'World News':    ['worldnews', 'news'],
  'Science':       ['science', 'EverythingScience'],
  'Sports':        ['sports'],
  'Business':      ['business', 'Economics'],
  'Entertainment': ['entertainment', 'popculturechat'],
  'Health':        ['Health', 'medicine'],
  'Politics':      ['politics', 'PoliticalDiscussion'],
  'Environment':   ['environment', 'climate'],
  'Education':     ['education', 'Teachers'],
  'Travel':        ['travel', 'solotravel'],
  'Food':          ['food', 'Cooking'],
  'Film & TV':     ['movies', 'television'],
  'Music':         ['Music', 'LetsTalkMusic'],
  'Gaming':        ['gaming', 'Games'],
}

interface RssFeed { url: string; source: string; categories: string[] }
const RSS_POOL: RssFeed[] = [
  // BBC
  { url: 'https://feeds.bbci.co.uk/news/technology/rss.xml',              source: 'BBC',        categories: ['Technology'] },
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml',                   source: 'BBC',        categories: ['World News'] },
  { url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml', source: 'BBC',        categories: ['Science', 'Environment'] },
  { url: 'https://feeds.bbci.co.uk/news/health/rss.xml',                  source: 'BBC',        categories: ['Health'] },
  { url: 'https://feeds.bbci.co.uk/news/business/rss.xml',                source: 'BBC',        categories: ['Business'] },
  { url: 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml',  source: 'BBC',        categories: ['Entertainment', 'Film & TV', 'Music'] },
  { url: 'https://feeds.bbci.co.uk/news/politics/rss.xml',                source: 'BBC',        categories: ['Politics'] },
  { url: 'https://feeds.bbci.co.uk/news/education/rss.xml',               source: 'BBC',        categories: ['Education'] },
  // Times of India / The Hindu
  { url: 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms',     source: 'Times of India', categories: ['World News', 'Politics', 'Business'] },
  { url: 'https://www.thehindu.com/sci-tech/technology/feeder/default.rss',source: 'The Hindu', categories: ['Technology'] },
]

interface Article {
  id: string
  webTitle: string
  webUrl: string
  webPublicationDate: string
  sectionName: string
  source: string
  fields?: { thumbnail?: string; trailText?: string }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function timeLabel(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3_600_000)
  if (h >= 48) return `${Math.floor(h / 24)}d ago`
  if (h >= 1)  return `${h}h ago`
  return `${Math.floor(diff / 60_000)}m ago`
}

function storageKey(uid: string) { return `uv:news-interests:${uid}` }

const DATING_TO_NEWS: Record<string, string> = {
  Gaming: 'Gaming', Music: 'Music', Technology: 'Technology', Science: 'Science',
  Sports: 'Sports', Travel: 'Travel', Photography: 'Entertainment', Art: 'Entertainment',
  Movies: 'Film & TV', Reading: 'Education', Cooking: 'Food', Environment: 'Environment',
  Politics: 'Politics', Business: 'Business', Fitness: 'Health', Health: 'Health',
}

const CUTOFF_MS = 48 * 3_600_000

// ── Guardian ──────────────────────────────────────────────────────────────────
async function fetchGuardian(interests: string[]): Promise<Article[]> {
  if (!GUARDIAN_KEY) return []
  const picked = shuffle(interests).slice(0, 4)
  const fromDate = new Date(Date.now() - CUTOFF_MS).toISOString().slice(0, 10)
  const all: Article[] = []
  await Promise.all(picked.map(async label => {
    const cat = NEWS_INTERESTS.find(i => i.label === label)
    if (!cat) return
    try {
      const r = await fetch(
        `https://content.guardianapis.com/search?section=${cat.section}&api-key=${GUARDIAN_KEY}` +
        `&show-fields=thumbnail,trailText&page-size=10&order-by=newest&from-date=${fromDate}`,
        { cache: 'no-store' }
      )
      if (!r.ok) return
      const json = await r.json()
      if (json.response?.results) {
        all.push(...(json.response.results as any[]).map((r: any) => ({ ...r, source: 'The Guardian' })))
      }
    } catch {}
  }))
  return all
}

// ── New York Times ────────────────────────────────────────────────────────────
async function fetchNYT(interests: string[]): Promise<Article[]> {
  if (!NYT_KEY) return []
  const fromDate = new Date(Date.now() - CUTOFF_MS).toISOString().slice(0, 10).replace(/-/g, '')
  const picked = shuffle(interests).slice(0, 3)
  const all: Article[] = []
  await Promise.all(picked.map(async label => {
    const desk = NYT_DESKS[label]
    if (!desk) return
    try {
      const r = await fetch(
        `https://api.nytimes.com/svc/search/v2/articlesearch.json` +
        `?fq=news_desk:("${encodeURIComponent(desk)}")&sort=newest&begin_date=${fromDate}&api-key=${NYT_KEY}`,
        { cache: 'no-store' }
      )
      if (!r.ok) return
      const json = await r.json()
      for (const doc of (json.response?.docs ?? []) as any[]) {
        const img = doc.multimedia?.find((m: any) => m.subtype === 'mediumThreeByTwo210' || m.subtype === 'thumbnail')
        all.push({
          id: doc._id || doc.web_url,
          webTitle: doc.headline?.main ?? '',
          webUrl: doc.web_url,
          webPublicationDate: doc.pub_date ?? new Date().toISOString(),
          sectionName: doc.section_name || label,
          source: 'New York Times',
          fields: {
            thumbnail: img ? `https://www.nytimes.com/${img.url}` : undefined,
            trailText: doc.abstract || doc.snippet,
          },
        })
      }
    } catch {}
  }))
  return all
}

// ── GNews ─────────────────────────────────────────────────────────────────────
async function fetchGNews(interests: string[]): Promise<Article[]> {
  if (!GNEWS_KEY) return []
  const fromDate = new Date(Date.now() - CUTOFF_MS).toISOString()
  const picked = shuffle(interests).slice(0, 2)
  const all: Article[] = []
  await Promise.all(picked.map(async label => {
    const topic = GNEWS_TOPICS[label]
    if (!topic) return
    try {
      const r = await fetch(
        `https://gnews.io/api/v4/top-headlines?topic=${topic}&lang=en&max=10&from=${fromDate}&token=${GNEWS_KEY}`,
        { cache: 'no-store' }
      )
      if (!r.ok) return
      const json = await r.json()
      for (const a of (json.articles ?? []) as any[]) {
        all.push({
          id: a.url,
          webTitle: a.title,
          webUrl: a.url,
          webPublicationDate: a.publishedAt ?? new Date().toISOString(),
          sectionName: label,
          source: a.source?.name ?? 'GNews',
          fields: { thumbnail: a.image || undefined, trailText: a.description },
        })
      }
    } catch {}
  }))
  return all
}

// ── Google News RSS (via rss2json proxy) ──────────────────────────────────────
async function fetchGoogleNews(interests: string[], cutoffMs = CUTOFF_MS): Promise<Article[]> {
  const picked = shuffle(interests).slice(0, 4)
  const cutoff = Date.now() - cutoffMs
  const all: Article[] = []
  await Promise.all(picked.map(async label => {
    const topic = GOOGLE_NEWS_TOPICS[label]
    if (!topic) return
    const feedUrl = `https://news.google.com/rss/headlines/section/topic/${topic}?hl=en-US&gl=US&ceid=US:en`
    try {
      const r = await fetch(`${RSS2JSON}?rss_url=${encodeURIComponent(feedUrl)}&count=15`, { cache: 'no-store' })
      if (!r.ok) return
      const json = await r.json()
      if (json.status !== 'ok' || !json.items?.length) return
      for (const item of json.items as Record<string, any>[]) {
        if (!item.link || !item.title) continue
        const rawDate = item.pubDate?.replace(' ', 'T') ?? ''
        const pubTime = rawDate ? new Date(rawDate).getTime() : 0
        if (pubTime && pubTime < cutoff) continue
        all.push({
          id: item.link,
          webTitle: item.title,
          webUrl: item.link,
          webPublicationDate: pubTime ? new Date(pubTime).toISOString() : new Date().toISOString(),
          sectionName: label,
          source: 'Google News',
          fields: {
            thumbnail: item.thumbnail || item.enclosure?.link || undefined,
            trailText: item.description ? item.description.replace(/<[^>]*>/g, '').trim().slice(0, 200) : undefined,
          },
        })
      }
    } catch {}
  }))
  return all
}

// ── BBC / other RSS ───────────────────────────────────────────────────────────
async function fetchRSS(interests: string[], cutoffMs = CUTOFF_MS): Promise<Article[]> {
  const relevant = RSS_POOL.filter(f => f.categories.some(c => interests.includes(c)))
  const pool = relevant.length ? relevant : RSS_POOL
  const chosen = shuffle(pool).slice(0, 4)
  const cutoff = Date.now() - cutoffMs
  const all: Article[] = []
  await Promise.all(chosen.map(async feed => {
    try {
      const r = await fetch(`${RSS2JSON}?rss_url=${encodeURIComponent(feed.url)}&count=15`, { cache: 'no-store' })
      if (!r.ok) return
      const json = await r.json()
      if (json.status !== 'ok' || !json.items?.length) return
      for (const item of json.items as Record<string, any>[]) {
        if (!item.link || !item.title) continue
        const rawDate = item.pubDate?.replace(' ', 'T') ?? ''
        const pubTime = rawDate ? new Date(rawDate).getTime() : 0
        if (pubTime && pubTime < cutoff) continue
        all.push({
          id: item.link,
          webTitle: item.title,
          webUrl: item.link,
          webPublicationDate: pubTime ? new Date(pubTime).toISOString() : new Date().toISOString(),
          sectionName: feed.source,
          source: feed.source,
          fields: {
            thumbnail: item.thumbnail || item.enclosure?.link || undefined,
            trailText: item.description ? item.description.replace(/<[^>]*>/g, '').trim().slice(0, 200) : undefined,
          },
        })
      }
    } catch {}
  }))
  return all
}

// ── Reddit (no key, CORS-safe, always fresh) ──────────────────────────────────
async function fetchReddit(interests: string[], cutoffMs = CUTOFF_MS): Promise<Article[]> {
  const picked = shuffle(interests).slice(0, 3)
  const cutoff = Date.now() - cutoffMs
  const all: Article[] = []

  await Promise.all(picked.map(async label => {
    const subs = REDDIT_SUBS[label]
    if (!subs?.length) return
    const sub = subs[Math.floor(Math.random() * subs.length)]
    try {
      const r = await fetch(
        `https://www.reddit.com/r/${sub}/hot.json?limit=15&raw_json=1`,
        { headers: { Accept: 'application/json' }, cache: 'no-store' }
      )
      if (!r.ok) return
      const json = await r.json()
      const children: any[] = json.data?.children ?? []
      for (const { data: post } of children) {
        if (post.over_18 || post.stickied) continue
        const pubTime = post.created_utc * 1000
        if (pubTime < cutoff) continue
        const thumb = post.thumbnail?.startsWith('http') ? post.thumbnail
          : post.preview?.images?.[0]?.source?.url?.replace(/&amp;/g, '&') ?? undefined
        all.push({
          id: `reddit-${post.id}`,
          webTitle: post.title,
          webUrl: post.url.startsWith('http') ? post.url : `https://reddit.com${post.permalink}`,
          webPublicationDate: new Date(pubTime).toISOString(),
          sectionName: label,
          source: `r/${sub}`,
          fields: { thumbnail: thumb, trailText: post.selftext?.slice(0, 200) || undefined },
        })
      }
    } catch {}
  }))
  return all
}

// ── Component ─────────────────────────────────────────────────────────────────

export function NewsPanel() {
  const { user } = useAuth()
  const [interests, setInterests] = useState<string[]>([])
  const [draft, setDraft]         = useState<string[]>([])
  const [editing, setEditing]     = useState(false)
  const [articles, setArticles]   = useState<Article[]>([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(false)
  const [spinning, setSpinning]   = useState(false)

  useEffect(() => {
    if (!user) return
    const key = storageKey(user.id)
    const stored = localStorage.getItem(key)
    if (stored) {
      try { setInterests(JSON.parse(stored)); return } catch {}
    }
    supabase
      .from('dating_profiles').select('interests')
      .eq('user_id', user.id).maybeSingle()
      .then(({ data }) => {
        const mapped: string[] = []
        if (data?.interests?.length) {
          for (const raw of data.interests) {
            const hit = DATING_TO_NEWS[raw]
            if (hit && !mapped.includes(hit)) mapped.push(hit)
          }
        }
        const initial = mapped.length >= 2 ? mapped.slice(0, 5) : DEFAULTS
        localStorage.setItem(key, JSON.stringify(initial))
        setInterests(initial)
      })
  }, [user?.id])

  const fetchNews = useCallback(async (selected: string[], animate = false) => {
    if (!selected.length) return
    setLoading(true)
    setError(false)
    if (animate) setSpinning(true)

    // All sources in parallel — Reddit always works (no key, CORS safe)
    const [guardian, nyt, gnews, googleNews, rss, reddit] = await Promise.all([
      fetchGuardian(selected),
      fetchNYT(selected),
      fetchGNews(selected),
      fetchGoogleNews(selected),
      fetchRSS(selected),
      fetchReddit(selected),
    ])

    if (animate) setSpinning(false)

    const dedupe = (arr: Article[]) => {
      const seen = new Set<string>()
      return arr.filter(a => {
        if (seen.has(a.webUrl)) return false
        seen.add(a.webUrl)
        return true
      })
    }

    let combined = dedupe([...guardian, ...nyt, ...gnews, ...googleNews, ...rss, ...reddit])
      .sort((a, b) => +new Date(b.webPublicationDate) - +new Date(a.webPublicationDate))

    // Fallback 1: widen to 7 days
    if (!combined.length) {
      const [gnFallback, rssFallback, redditFallback] = await Promise.all([
        fetchGoogleNews(selected, 7 * 24 * 3_600_000),
        fetchRSS(selected, 7 * 24 * 3_600_000),
        fetchReddit(selected, 7 * 24 * 3_600_000),
      ])
      combined = dedupe([...gnFallback, ...rssFallback, ...redditFallback])
        .sort((a, b) => +new Date(b.webPublicationDate) - +new Date(a.webPublicationDate))
    }

    // Fallback 2: Reddit with no time limit (always has content)
    if (!combined.length) {
      const emergency = await fetchReddit(selected, 30 * 24 * 3_600_000)
      combined = dedupe(emergency)
        .sort((a, b) => +new Date(b.webPublicationDate) - +new Date(a.webPublicationDate))
    }

    if (!combined.length) { setError(true); setLoading(false); return }
    setArticles(combined.slice(0, 25))
    setLoading(false)
  }, [])

  useEffect(() => {
    if (interests.length) fetchNews(interests)
  }, [interests])

  function startEdit()  { setDraft([...interests]); setEditing(true) }
  function cancelEdit() { setEditing(false) }
  function toggleDraft(label: string) {
    setDraft(prev => prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label])
  }
  function saveEdit() {
    if (!user) return
    localStorage.setItem(storageKey(user.id), JSON.stringify(draft))
    setInterests(draft)
    setEditing(false)
  }

  return (
    <div className="flex flex-col h-full gap-3">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <Card padding="sm" className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Newspaper className="w-[15px] h-[15px] text-accent flex-shrink-0" />
            <span className="text-sm font-semibold text-text-primary">News for You</span>
          </div>
          <div className="flex items-center gap-0.5">
            {!editing && (
              <button
                onClick={() => fetchNews(interests, true)}
                title="Refresh"
                className="p-1.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', spinning && 'animate-spin')} />
              </button>
            )}
            {editing ? (
              <>
                <button onClick={cancelEdit} className="p-1.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all">
                  <X className="w-3.5 h-3.5" />
                </button>
                <Button size="sm" onClick={saveEdit} className="ml-1">
                  <Check className="w-3 h-3" />
                  Save
                </Button>
              </>
            ) : (
              <button onClick={startEdit} title="Edit interests" className="p-1.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all">
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {editing && (
          <div className="mt-3 pt-3 border-t border-surface-border">
            <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">Pick your interests</p>
            <div className="flex flex-wrap gap-1.5">
              {NEWS_INTERESTS.map(({ label, emoji }) => {
                const on = draft.includes(label)
                return (
                  <button
                    key={label}
                    onClick={() => toggleDraft(label)}
                    className={cn(
                      'text-[11px] font-medium px-2.5 py-1 rounded-full border transition-all',
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
            {!draft.length && (
              <p className="text-[11px] text-text-muted mt-2">Select at least one interest.</p>
            )}
          </div>
        )}
      </Card>

      {/* ── Articles ───────────────────────────────────────────────────────── */}
      {!editing && (
        <div className="flex-1 overflow-y-auto scrollbar-hide min-h-0 space-y-2.5 pb-4">
          {loading ? (
            [1, 2, 3, 4, 5].map(i => (
              <Card key={i} padding="sm" className="animate-pulse space-y-2">
                <div className="h-[80px] bg-surface-hover rounded-xl" />
                <div className="h-2.5 bg-surface-hover rounded-full w-1/4" />
                <div className="h-3.5 bg-surface-hover rounded-full w-4/5" />
                <div className="h-3.5 bg-surface-hover rounded-full w-3/5" />
              </Card>
            ))
          ) : error ? (
            <Card padding="sm" className="text-center py-8 space-y-3">
              <p className="text-sm text-text-muted">Couldn't load news.</p>
              <Button size="sm" variant="ghost" onClick={() => fetchNews(interests, true)}>
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </Button>
            </Card>
          ) : !interests.length ? (
            <Card padding="sm" className="text-center py-8">
              <p className="text-sm text-text-muted mb-2">No interests selected.</p>
              <button onClick={startEdit} className="text-sm text-accent hover:underline font-medium">Set your interests →</button>
            </Card>
          ) : !articles.length ? (
            <Card padding="sm" className="text-center py-8">
              <p className="text-sm text-text-muted">No articles found. Try refreshing.</p>
            </Card>
          ) : (
            articles.map(article => (
              <a key={article.id} href={article.webUrl} target="_blank" rel="noopener noreferrer" className="block group">
                <Card padding="sm" hover>
                  {article.fields?.thumbnail && (
                    <img
                      src={article.fields.thumbnail}
                      alt=""
                      className="w-full h-[90px] object-cover rounded-xl mb-2.5"
                      loading="lazy"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  )}
                  <p className="text-[10px] font-bold text-accent uppercase tracking-wider mb-1">
                    {article.sectionName}
                  </p>
                  <p className="text-[13px] font-semibold text-text-primary leading-snug line-clamp-2 group-hover:text-accent transition-colors">
                    {article.webTitle}
                  </p>
                  {article.fields?.trailText && (
                    <p className="text-[11px] text-text-muted mt-1 line-clamp-2 leading-relaxed">
                      {article.fields.trailText}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[10px] text-text-muted">{timeLabel(article.webPublicationDate)}</span>
                      <span className="text-[10px] text-text-muted/50">·</span>
                      <span className="text-[10px] font-medium text-text-muted truncate">{article.source}</span>
                    </div>
                    <ExternalLink className="w-3 h-3 text-text-muted flex-shrink-0 ml-1 opacity-0 group-hover:opacity-60 transition-opacity" />
                  </div>
                </Card>
              </a>
            ))
          )}
        </div>
      )}
    </div>
  )
}
