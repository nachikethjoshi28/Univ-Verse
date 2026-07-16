import type { ReactElement, ReactNode } from 'react'

interface Props {
  section: string
  color: string
}

// ─── Tiny icon components (paths centered at 0,0) ────────────────────────────

const GradCap = ({ c }: { c: string }) => (
  <>
    <polygon points="0,-6 11,-1 0,4.5 -11,-1" fill="none" stroke={c} />
    <line x1="11" y1="-1" x2="11" y2="6" stroke={c} />
    <path d="M-6,1.5L-6,7Q0,10 6,7L6,1.5" fill="none" stroke={c} />
  </>
)
const BookOpen = ({ c }: { c: string }) => (
  <>
    <path d="M0,-8L0,8M0,-8C-3,-10-9,-9-11,-7L-11,8C-9,6-3,7 0,8M0,-8C3,-10 9,-9 11,-7L11,8C9,6 3,7 0,8" fill="none" stroke={c} />
    <line x1="-8" y1="-3" x2="-2" y2="-3" stroke={c} />
    <line x1="-8" y1="0" x2="-2" y2="0" stroke={c} />
    <line x1="2" y1="-3" x2="8" y2="-3" stroke={c} />
    <line x1="2" y1="0" x2="8" y2="0" stroke={c} />
  </>
)
const Globe = ({ c }: { c: string }) => (
  <>
    <circle cx="0" cy="0" r="10" fill="none" stroke={c} />
    <ellipse cx="0" cy="0" rx="10" ry="4" fill="none" stroke={c} />
    <line x1="-10" y1="0" x2="10" y2="0" stroke={c} />
    <path d="M0,-10C-5,-5-5,5 0,10C5,5 5,-5 0,-10" fill="none" stroke={c} />
  </>
)
const Rocket = ({ c }: { c: string }) => (
  <>
    <path d="M0,-11Q5,-6 5,2L0,7L-5,2Q-5,-6 0,-11Z" fill="none" stroke={c} />
    <path d="M-5,2L-8,5L-4,5" fill="none" stroke={c} />
    <path d="M5,2L8,5L4,5" fill="none" stroke={c} />
  </>
)
const Star = ({ c }: { c: string }) => (
  <polygon points="0,-9 2.1,-2.9 8.6,-2.9 3.5,1.1 5.3,7.6 0,4.1 -5.3,7.6 -3.5,1.1 -8.6,-2.9 -2.1,-2.9" fill="none" stroke={c} />
)
const Sparkle = ({ c }: { c: string }) => (
  <>
    <line x1="0" y1="-9" x2="0" y2="9" stroke={c} />
    <line x1="-9" y1="0" x2="9" y2="0" stroke={c} />
    <line x1="-6.5" y1="-6.5" x2="6.5" y2="6.5" stroke={c} />
    <line x1="6.5" y1="-6.5" x2="-6.5" y2="6.5" stroke={c} />
  </>
)
const Bulb = ({ c }: { c: string }) => (
  <>
    <path d="M-5.5,-2A6.5,8 0 0 1 5.5,-2L4.5,5L-4.5,5Z" fill="none" stroke={c} />
    <line x1="-3" y1="5" x2="3" y2="5" stroke={c} />
    <line x1="-2.5" y1="7" x2="2.5" y2="7" stroke={c} />
    <line x1="0" y1="-10" x2="0" y2="-8" stroke={c} />
  </>
)
const Heart = ({ c }: { c: string }) => (
  <path d="M0,8C-10,3-11,-7-4.5,-9.5Q-1.5,-11 0,-6.5Q1.5,-11 4.5,-9.5C11,-7 10,3 0,8Z" fill="none" stroke={c} />
)
const Flower = ({ c }: { c: string }) => (
  <>
    <ellipse cx="0" cy="-6" rx="2" ry="3.5" fill="none" stroke={c} />
    <ellipse cx="0" cy="6" rx="2" ry="3.5" fill="none" stroke={c} />
    <ellipse cx="-6" cy="0" rx="3.5" ry="2" fill="none" stroke={c} />
    <ellipse cx="6" cy="0" rx="3.5" ry="2" fill="none" stroke={c} />
    <circle cx="0" cy="0" r="2.5" fill="none" stroke={c} />
  </>
)
const Ring = ({ c }: { c: string }) => (
  <>
    <ellipse cx="0" cy="2.5" rx="8" ry="4.5" fill="none" stroke={c} />
    <path d="M-4,-2L-3,-5L0,-7L3,-5L4,-2" fill="none" stroke={c} />
    <polygon points="0,-10 2.5,-5 -2.5,-5" fill="none" stroke={c} />
  </>
)
const Envelope = ({ c }: { c: string }) => (
  <>
    <rect x="-10" y="-6" width="20" height="13" rx="1.5" fill="none" stroke={c} />
    <path d="M-10,-6L0,3L10,-6" fill="none" stroke={c} />
  </>
)
const Butterfly = ({ c }: { c: string }) => (
  <>
    <path d="M0,0C-1.5,-3.5-8,-8-9,-4C-10,0-4,3.5 0,0Z" fill="none" stroke={c} />
    <path d="M0,0C1.5,-3.5 8,-8 9,-4C10,0 4,3.5 0,0Z" fill="none" stroke={c} />
    <path d="M0,0C-1.5,3.5-7,7-6,4C-5,1-1.5,0.5 0,0Z" fill="none" stroke={c} />
    <path d="M0,0C1.5,3.5 7,7 6,4C5,1 1.5,0.5 0,0Z" fill="none" stroke={c} />
  </>
)
const Bubble = ({ c }: { c: string }) => (
  <>
    <rect x="-10" y="-8" width="20" height="14" rx="3" fill="none" stroke={c} />
    <path d="M-4,6L-6.5,10.5L0.5,6" fill="none" stroke={c} />
    <line x1="-6" y1="-2.5" x2="6" y2="-2.5" stroke={c} />
    <line x1="-6" y1="1" x2="2" y2="1" stroke={c} />
  </>
)
const Plane = ({ c }: { c: string }) => (
  <>
    <path d="M-10,-1L11,-9L6,10Z" fill="none" stroke={c} />
    <line x1="0.5" y1="3" x2="11" y2="-9" stroke={c} />
  </>
)
const Network = ({ c }: { c: string }) => (
  <>
    <circle cx="0" cy="-7" r="2.5" fill="none" stroke={c} />
    <circle cx="-7.5" cy="5" r="2.5" fill="none" stroke={c} />
    <circle cx="7.5" cy="5" r="2.5" fill="none" stroke={c} />
    <line x1="0" y1="-4.5" x2="-6" y2="3" stroke={c} />
    <line x1="0" y1="-4.5" x2="6" y2="3" stroke={c} />
    <line x1="-5.5" y1="5" x2="5.5" y2="5" stroke={c} />
  </>
)
const Person = ({ c }: { c: string }) => (
  <>
    <circle cx="0" cy="0" r="10" fill="none" stroke={c} />
    <circle cx="0" cy="-3.5" r="3.5" fill="none" stroke={c} />
    <path d="M-8.5,8Q-6.5,3.5 0,3.5Q6.5,3.5 8.5,8" fill="none" stroke={c} />
  </>
)
const ShoppingBag = ({ c }: { c: string }) => (
  <>
    <rect x="-8" y="-4" width="16" height="14" rx="2" fill="none" stroke={c} />
    <path d="M-5,-4L-5,-7.5Q0,-11 5,-7.5L5,-4" fill="none" stroke={c} />
  </>
)
const PriceTag = ({ c }: { c: string }) => (
  <>
    <path d="M-1.5,-10L7,-10L10,-7L10,2L2,10L-3,10L-10,2L-10,-7Z" fill="none" stroke={c} />
    <circle cx="4.5" cy="-6" r="2" fill="none" stroke={c} />
  </>
)
const Coin = ({ c }: { c: string }) => (
  <>
    <circle cx="0" cy="0" r="9.5" fill="none" stroke={c} />
    <circle cx="0" cy="0" r="6" fill="none" stroke={c} />
  </>
)
const Bell = ({ c }: { c: string }) => (
  <>
    <path d="M0,-10A6,6 0 0 1 6,-4C6,4 9.5,5.5 9.5,6.5L-9.5,6.5C-9.5,5.5-6,4-6,-4A6,6 0 0 1 0,-10Z" fill="none" stroke={c} />
    <path d="M-3,6.5Q0,10.5 3,6.5" fill="none" stroke={c} />
  </>
)
const Lightning = ({ c }: { c: string }) => (
  <path d="M2.5,-11L-4.5,1L2.5,1L-2.5,11L9,-2L2,-2Z" fill="none" stroke={c} />
)
const Shield = ({ c }: { c: string }) => (
  <>
    <path d="M0,-10L10,-6L10,0.5Q10,8 0,10.5Q-10,8-10,0.5L-10,-6Z" fill="none" stroke={c} />
    <path d="M-4,0.5L-1.5,4L5,-4" fill="none" stroke={c} />
  </>
)
const BarChart = ({ c }: { c: string }) => (
  <>
    <line x1="-10" y1="10" x2="10" y2="10" stroke={c} />
    <line x1="-10" y1="-10" x2="-10" y2="10" stroke={c} />
    <rect x="-8" y="2" width="4" height="8" fill="none" stroke={c} />
    <rect x="-2.5" y="-3" width="4" height="13" fill="none" stroke={c} />
    <rect x="3.5" y="-8" width="4" height="18" fill="none" stroke={c} />
  </>
)
const Gear = ({ c }: { c: string }) => (
  <>
    <circle cx="0" cy="0" r="4" fill="none" stroke={c} />
    <circle cx="0" cy="0" r="7.5" fill="none" stroke={c} />
    <line x1="0" y1="-10" x2="0" y2="-7.5" stroke={c} />
    <line x1="0" y1="7.5" x2="0" y2="10" stroke={c} />
    <line x1="-10" y1="0" x2="-7.5" y2="0" stroke={c} />
    <line x1="7.5" y1="0" x2="10" y2="0" stroke={c} />
    <line x1="-7" y1="-7" x2="-5" y2="-5" stroke={c} />
    <line x1="5" y1="-5" x2="7" y2="-7" stroke={c} />
    <line x1="-5" y1="5" x2="-7" y2="7" stroke={c} />
    <line x1="7" y1="7" x2="5" y2="5" stroke={c} />
  </>
)
const Trophy = ({ c }: { c: string }) => (
  <>
    <path d="M-7,-9.5L7,-9.5L7,0Q7,7.5 0,7.5Q-7,7.5-7,0Z" fill="none" stroke={c} />
    <path d="M-7,-5L-10.5,-5Q-10.5,3-5,3" fill="none" stroke={c} />
    <path d="M7,-5L10.5,-5Q10.5,3 5,3" fill="none" stroke={c} />
    <rect x="-4.5" y="7.5" width="9" height="3" fill="none" stroke={c} />
  </>
)
const House = ({ c }: { c: string }) => (
  <>
    <polygon points="0,-10 11,0 -11,0" fill="none" stroke={c} />
    <rect x="-9" y="0" width="18" height="11" fill="none" stroke={c} />
    <rect x="-3.5" y="4" width="7" height="7" fill="none" stroke={c} />
  </>
)
const Tree = ({ c }: { c: string }) => (
  <>
    <polygon points="0,-10 9,3 -9,3" fill="none" stroke={c} />
    <polygon points="0,-5 11,8.5 -11,8.5" fill="none" stroke={c} />
    <rect x="-3" y="8.5" width="6" height="5" fill="none" stroke={c} />
  </>
)
const Leaf = ({ c }: { c: string }) => (
  <>
    <path d="M0,10C-11,4.5-11,-10 0,-10C11,-10 11,4.5 0,10Z" fill="none" stroke={c} />
    <line x1="0" y1="-10" x2="0" y2="10" stroke={c} />
  </>
)
const Key = ({ c }: { c: string }) => (
  <>
    <circle cx="-5.5" cy="0" r="5" fill="none" stroke={c} />
    <line x1="-0.5" y1="0" x2="10" y2="0" stroke={c} />
    <line x1="8.5" y1="0" x2="8.5" y2="3.5" stroke={c} />
    <line x1="6" y1="0" x2="6" y2="3.5" stroke={c} />
  </>
)
const Lock = ({ c }: { c: string }) => (
  <>
    <rect x="-7" y="-1" width="14" height="11" rx="2.5" fill="none" stroke={c} />
    <path d="M-4.5,-1L-4.5,-5.5A4.5,5 0 0 1 4.5,-5.5L4.5,-1" fill="none" stroke={c} />
  </>
)
const IdCard = ({ c }: { c: string }) => (
  <>
    <rect x="-10" y="-7" width="20" height="14" rx="2.5" fill="none" stroke={c} />
    <circle cx="-5.5" cy="0" r="3" fill="none" stroke={c} />
    <line x1="0.5" y1="-2.5" x2="8" y2="-2.5" stroke={c} />
    <line x1="0.5" y1="1" x2="6.5" y2="1" stroke={c} />
  </>
)
const Exclaim = ({ c }: { c: string }) => (
  <>
    <circle cx="0" cy="0" r="10" fill="none" stroke={c} />
    <line x1="0" y1="-5.5" x2="0" y2="2" stroke={c} />
    <circle cx="0" cy="5.5" r="1.5" fill={c} stroke="none" />
  </>
)
const Planet = ({ c }: { c: string }) => (
  <>
    <circle cx="0" cy="0" r="5.5" fill="none" stroke={c} />
    <ellipse cx="0" cy="0" rx="10" ry="3.5" transform="rotate(-25)" fill="none" stroke={c} />
  </>
)

// ─── Item layout: [x, y, scale, rotation, ComponentType] ─────────────────────
type IconComp = (p: { c: string }) => ReactElement
type Item = [number, number, number, number, IconComp]

const G = ({ x, y, s, r, children }: { x:number; y:number; s:number; r:number; children: ReactNode }) => (
  <g transform={`translate(${x},${y}) rotate(${r}) scale(${s})`}>{children}</g>
)

// ─── Section layouts ──────────────────────────────────────────────────────────
const HOME: Item[] = [
  [80,55,2,-12,GradCap],[230,120,1.8,8,BookOpen],[400,45,2.2,0,Globe],
  [570,140,1.5,18,Star],[730,55,1.9,-8,GradCap],[900,80,2.1,20,Rocket],
  [1060,50,1.7,-5,BookOpen],[1160,145,1.4,12,Sparkle],
  [120,265,2.4,0,Globe],[310,285,1.8,-7,Bulb],[490,215,1.5,15,Sparkle],
  [650,310,2.2,0,Planet],[810,245,1.7,-10,GradCap],[970,210,2,5,Star],
  [1110,275,1.6,-15,Rocket],
  [70,455,1.5,10,Star],[250,425,2.1,-20,Globe],[430,470,2.3,0,Sparkle],
  [590,415,1.6,8,Bulb],[760,450,1.8,-5,BookOpen],[940,400,2,15,GradCap],
  [1090,455,1.4,0,Star],[1185,435,1.9,-10,Planet],
  [140,640,2.2,-15,Rocket],[340,655,1.5,5,Sparkle],[520,610,2,0,Globe],
  [700,645,1.8,-8,Star],[880,630,1.5,12,Bulb],[1050,615,2.1,0,GradCap],
  [85,810,1.7,8,BookOpen],[275,820,2,-5,Star],[460,795,1.9,15,Globe],
  [640,820,1.6,0,Planet],[820,785,2,-10,GradCap],[1000,815,1.5,5,Sparkle],
]

const CONNECT: Item[] = [
  [85,55,2.1,-8,Person],[255,110,1.7,12,Bubble],[430,50,1.9,0,Network],
  [600,130,1.5,-15,Star],[765,55,2,10,Bubble],[925,80,1.6,-5,Person],
  [1080,50,1.8,18,Heart],[1175,140,1.4,0,Sparkle],
  [130,260,2.2,5,Person],[305,285,1.8,-10,Plane],[480,230,2,0,Bubble],
  [650,310,1.5,15,Network],[815,250,1.9,-8,Person],[975,220,1.6,5,Star],
  [1125,275,2.1,0,Bubble],
  [75,455,1.7,-12,Bubble],[250,435,2.2,8,Network],[430,465,1.6,0,Person],
  [600,425,2,-5,Plane],[770,460,1.5,20,Bubble],[945,420,1.8,0,Heart],
  [1105,465,2,-15,Person],[1185,440,1.4,10,Star],
  [120,640,1.9,5,Network],[310,655,1.6,-8,Person],[500,615,2.1,0,Bubble],
  [670,645,1.7,15,Plane],[850,630,1.5,-10,Network],[1025,615,2,0,Sparkle],
  [80,810,2.1,-15,Person],[270,820,1.5,5,Bubble],[450,795,1.9,0,Network],
  [630,810,1.7,-8,Star],[810,785,1.6,12,Plane],[990,815,2,0,Bubble],
]

const DATES: Item[] = [
  [85,55,2.2,-15,Heart],[235,100,1.8,10,Flower],[405,45,2,0,Butterfly],
  [575,130,1.5,-8,Star],[740,60,2.1,18,Ring],[900,80,1.7,-5,Envelope],
  [1065,55,2.2,8,Heart],[1175,145,1.4,0,Sparkle],
  [130,255,1.9,5,Flower],[300,285,2.2,-12,Ring],[480,225,1.6,0,Sparkle],
  [650,305,2.1,15,Heart],[815,250,1.8,-10,Butterfly],[980,220,1.5,8,Flower],
  [1130,270,2,0,Star],
  [75,455,2.1,-8,Envelope],[250,430,1.7,12,Heart],[425,470,2.3,0,Ring],
  [595,420,1.5,-15,Flower],[770,460,2,5,Butterfly],[945,420,1.8,0,Sparkle],
  [1110,465,1.6,18,Heart],[1185,445,2,-8,Ring],
  [125,640,1.8,10,Butterfly],[310,655,2.1,-5,Flower],[495,615,1.5,0,Heart],
  [665,645,1.9,-12,Envelope],[850,630,2,8,Ring],[1030,615,1.6,0,Star],
  [80,810,2.2,-10,Heart],[270,820,1.6,5,Flower],[455,795,2,0,Butterfly],
  [635,810,1.7,15,Ring],[820,785,1.5,-8,Heart],[1000,815,2.1,0,Sparkle],
]

const MARKET: Item[] = [
  [85,55,2.1,-10,ShoppingBag],[245,110,1.7,8,PriceTag],[410,50,2.2,0,Coin],
  [575,135,1.5,-15,Star],[740,60,1.9,12,ShoppingBag],[900,80,2,-5,PriceTag],
  [1065,55,1.6,18,Coin],[1175,145,1.8,0,Sparkle],
  [130,260,2.1,5,ShoppingBag],[305,285,1.8,-8,Coin],[480,230,1.5,0,PriceTag],
  [650,310,2.2,15,ShoppingBag],[815,250,1.7,-10,Coin],[980,220,2,8,PriceTag],
  [1130,275,1.5,0,Star],
  [75,455,1.9,-12,Coin],[250,435,2.1,10,ShoppingBag],[425,470,1.6,0,PriceTag],
  [595,425,2.3,-5,Coin],[770,460,1.5,20,ShoppingBag],[945,420,1.8,0,Plane],
  [1110,465,2,-15,PriceTag],[1185,445,1.4,8,Sparkle],
  [125,640,2,8,PriceTag],[310,655,1.7,-5,Coin],[500,615,2.2,0,ShoppingBag],
  [665,645,1.5,-12,PriceTag],[850,630,2,10,Coin],[1030,615,1.8,0,Star],
  [80,810,1.9,-10,ShoppingBag],[270,820,2.1,5,Coin],[455,795,1.6,0,PriceTag],
  [635,810,2,15,ShoppingBag],[820,785,1.7,-8,Star],[1000,815,1.5,0,Sparkle],
]

const CHATS: Item[] = [
  [85,55,2.1,-10,Bubble],[245,110,1.7,8,Bell],[410,50,2,0,Plane],
  [575,135,1.5,-15,Star],[740,60,1.9,12,Bubble],[900,80,1.6,-5,Bell],
  [1065,55,2.2,18,Bubble],[1175,145,1.4,0,Sparkle],
  [130,260,2,5,Plane],[305,285,1.8,-8,Bubble],[480,230,2.2,0,Bell],
  [650,310,1.5,15,Bubble],[815,250,1.9,-10,Plane],[980,220,1.7,8,Sparkle],
  [1130,275,2.1,0,Bubble],
  [75,455,1.6,-12,Bubble],[250,435,2.2,10,Bell],[425,470,1.8,0,Bubble],
  [595,425,2,-5,Plane],[770,460,1.5,20,Bell],[945,420,2,0,Bubble],
  [1110,465,1.7,-15,Star],[1185,445,2,8,Lightning],
  [125,640,1.9,8,Bell],[310,655,2.1,-5,Bubble],[500,615,1.5,0,Plane],
  [665,645,1.8,-12,Bubble],[850,630,2,10,Bell],[1030,615,1.6,0,Sparkle],
  [80,810,2.1,-10,Bubble],[270,820,1.6,5,Bell],[455,795,2,0,Plane],
  [635,810,1.8,15,Bubble],[820,785,2,-8,Star],[1000,815,1.5,0,Lightning],
]

const COMMUNITY: Item[] = [
  [85,55,2.1,-10,Globe],[245,110,1.8,8,House],[410,50,2,0,Tree],
  [575,135,1.5,-15,Person],[740,60,1.9,12,Leaf],[900,80,1.7,-5,Globe],
  [1065,55,2.2,18,House],[1175,145,1.4,0,Star],
  [130,260,1.8,5,Tree],[305,285,2.1,-8,Person],[480,230,1.5,0,House],
  [650,310,2.2,15,Leaf],[815,250,1.9,-10,Globe],[980,220,1.6,8,Tree],
  [1130,275,2,0,Sparkle],
  [75,455,2,-12,Person],[250,435,1.7,10,House],[425,470,2.3,0,Tree],
  [595,425,1.5,-5,Globe],[770,460,2,20,Leaf],[945,420,1.8,0,Person],
  [1110,465,1.6,-15,Globe],[1185,445,2,8,Sparkle],
  [125,640,1.9,8,Tree],[310,655,1.7,-5,Globe],[500,615,2.2,0,House],
  [665,645,1.5,-12,Leaf],[850,630,2,10,Person],[1030,615,1.8,0,Globe],
  [80,810,1.8,-10,Globe],[270,820,2.1,5,Tree],[455,795,1.6,0,House],
  [635,810,2,15,Person],[820,785,1.7,-8,Leaf],[1000,815,2,0,Sparkle],
]

const ADMIN: Item[] = [
  [85,55,2,-10,Shield],[245,110,1.8,8,BarChart],[410,50,2.2,0,Gear],
  [575,135,1.5,-15,Trophy],[740,60,1.9,12,Shield],[900,80,1.7,-5,BarChart],
  [1065,55,2,18,Gear],[1175,145,1.4,0,Star],
  [130,260,2.1,5,Gear],[305,285,1.8,-8,Shield],[480,230,2.2,0,BarChart],
  [650,310,1.5,15,Trophy],[815,250,1.9,-10,Gear],[980,220,1.6,8,Sparkle],
  [1130,275,2,0,Shield],
  [75,455,1.6,-12,BarChart],[250,435,2.1,10,Gear],[425,470,1.8,0,Shield],
  [595,425,2.3,-5,BarChart],[770,460,1.5,20,Trophy],[945,420,2,0,Gear],
  [1110,465,1.7,-15,Star],[1185,445,2,8,Sparkle],
  [125,640,2,8,Shield],[310,655,1.7,-5,Gear],[500,615,2.2,0,BarChart],
  [665,645,1.5,-12,Trophy],[850,630,2,10,Shield],[1030,615,1.8,0,Gear],
  [80,810,1.9,-10,Shield],[270,820,2.1,5,BarChart],[455,795,1.6,0,Gear],
  [635,810,2,15,Trophy],[820,785,1.7,-8,Star],[1000,815,2,0,Sparkle],
]

const PROFILE: Item[] = [
  [85,55,2.1,-10,Person],[245,110,1.8,8,Star],[410,50,2,0,Trophy],
  [575,135,1.5,-15,IdCard],[740,60,1.9,12,Person],[900,80,1.7,-5,Star],
  [1065,55,2.2,18,Trophy],[1175,145,1.4,0,Sparkle],
  [130,260,1.8,5,Trophy],[305,285,2.1,-8,Person],[480,230,1.5,0,IdCard],
  [650,310,2.2,15,Star],[815,250,1.9,-10,Trophy],[980,220,1.6,8,Person],
  [1130,275,2,0,Sparkle],
  [75,455,2.1,-12,IdCard],[250,435,1.7,10,Person],[425,470,2.3,0,Star],
  [595,425,1.5,-5,Trophy],[770,460,2,20,Person],[945,420,1.8,0,IdCard],
  [1110,465,1.6,-15,Star],[1185,445,2,8,Sparkle],
  [125,640,2,8,Trophy],[310,655,1.7,-5,IdCard],[500,615,2.2,0,Person],
  [665,645,1.5,-12,Star],[850,630,2,10,Trophy],[1030,615,1.8,0,Sparkle],
  [80,810,1.9,-10,Person],[270,820,2.1,5,Trophy],[455,795,1.6,0,IdCard],
  [635,810,2,15,Star],[820,785,1.7,-8,Person],[1000,815,2,0,Sparkle],
]

const SETTINGS: Item[] = [
  [85,55,2,-10,Gear],[245,110,1.8,8,Key],[410,50,2.2,0,Lock],
  [575,135,1.5,-15,Star],[740,60,1.9,12,Gear],[900,80,1.7,-5,Key],
  [1065,55,2,18,Lock],[1175,145,1.4,0,Sparkle],
  [130,260,2.1,5,Key],[305,285,1.8,-8,Gear],[480,230,2.2,0,Lock],
  [650,310,1.5,15,Key],[815,250,1.9,-10,Gear],[980,220,1.6,8,Sparkle],
  [1130,275,2,0,Lock],
  [75,455,1.6,-12,Lock],[250,435,2.1,10,Gear],[425,470,1.8,0,Key],
  [595,425,2.3,-5,Lock],[770,460,1.5,20,Gear],[945,420,2,0,Key],
  [1110,465,1.7,-15,Star],[1185,445,2,8,Sparkle],
  [125,640,2,8,Gear],[310,655,1.7,-5,Key],[500,615,2.2,0,Lock],
  [665,645,1.5,-12,Gear],[850,630,2,10,Key],[1030,615,1.8,0,Sparkle],
  [80,810,1.9,-10,Gear],[270,820,2.1,5,Key],[455,795,1.6,0,Lock],
  [635,810,2,15,Gear],[820,785,1.7,-8,Star],[1000,815,2,0,Sparkle],
]

const NOTIFICATIONS: Item[] = [
  [85,55,2.1,-10,Bell],[245,110,1.8,8,Lightning],[410,50,2,0,Exclaim],
  [575,135,1.5,-15,Star],[740,60,1.9,12,Bell],[900,80,1.7,-5,Bubble],
  [1065,55,2.2,18,Lightning],[1175,145,1.4,0,Sparkle],
  [130,260,1.8,5,Exclaim],[305,285,2.1,-8,Bell],[480,230,1.5,0,Lightning],
  [650,310,2.2,15,Bubble],[815,250,1.9,-10,Bell],[980,220,1.6,8,Star],
  [1130,275,2,0,Exclaim],
  [75,455,2,-12,Lightning],[250,435,1.7,10,Bell],[425,470,2.3,0,Bubble],
  [595,425,1.5,-5,Exclaim],[770,460,2,20,Lightning],[945,420,1.8,0,Bell],
  [1110,465,1.6,-15,Star],[1185,445,2,8,Sparkle],
  [125,640,1.9,8,Bell],[310,655,1.7,-5,Lightning],[500,615,2.2,0,Exclaim],
  [665,645,1.5,-12,Bubble],[850,630,2,10,Bell],[1030,615,1.8,0,Star],
  [80,810,1.9,-10,Exclaim],[270,820,2.1,5,Bell],[455,795,1.6,0,Lightning],
  [635,810,2,15,Bubble],[820,785,1.7,-8,Star],[1000,815,2,0,Sparkle],
]

const SECTIONS: Record<string, Item[]> = {
  home: HOME, connect: CONNECT, dates: DATES, market: MARKET,
  chats: CHATS, community: COMMUNITY, admin: ADMIN, profile: PROFILE,
  settings: SETTINGS, notifications: NOTIFICATIONS,
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SectionBackground({ section, color }: Props) {
  const items = SECTIONS[section] ?? SECTIONS.home

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1200 900"
      preserveAspectRatio="xMidYMid slice"
      width="100%"
      height="100%"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block', opacity: 0.055 }}
    >
      {items.map(([x, y, s, r, Icon], i) => (
        <G key={i} x={x} y={y} s={s} r={r}>
          <Icon c={color} />
        </G>
      ))}
    </svg>
  )
}
