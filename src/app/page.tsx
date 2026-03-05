'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
// Avatar removed
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/hooks/use-toast'
import {
  CalendarDays, Clock, MapPin, Users, Trophy,
  LogIn, UserPlus, LogOut, CalendarX, CheckCircle, XCircle, AlertCircle, Loader2, Eye,
  Settings, BarChart3, UserCog, Trash2, Edit, Plus, DollarSign, TrendingUp, Shield,
  ChevronDown, RefreshCw, User2, Lock, Ban, Instagram, ExternalLink
} from 'lucide-react'
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Cell, Pie, PieChart } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

// Types
interface User {
  id: string
  username?: string
  name: string
  email: string
  phone?: string
  role: string
  level: string | null
  password?: string
  adminCourtIds?: string[]
  courtIds?: string[]
  createdAt?: string
  _count?: { bookings: number }
}

interface Court {
  id: string
  name: string
  type: string
  surface: string
  pricePerHour: number
  openTime: string
  closeTime: string
  image?: string
  isActive?: boolean
  totalBookings?: number
  totalRevenue?: number
  courtAdmins?: { id: string; name: string }[]
}

interface Booking {
  id: string
  date: string
  startTime: string
  endTime: string
  status: string
  totalPrice: number
  notes?: string
  createdAt?: string
  user: { id: string; name: string; email: string; level: string | null; phone?: string }
  court: { id: string; name: string; type: string; surface: string }
}

interface SlotUser {
  id: string
  name: string
  level: string | null
}

interface TimeSlot {
  time: string
  endTime: string
  available: boolean
  spotsLeft: number
  maxSpots: number
  reservedBy: SlotUser[]
  blocked?: boolean
  blockReason?: string
}

interface BlockedSlot {
  id: string
  courtId: string
  date: string
  startTime: string
  endTime: string
  reason: string | null
  blockedBy: string
  createdAt: string
  court: { id: string; name: string }
  admin: { id: string; name: string }
}

interface AdminStats {
  users: { total: number; players: number; admins: number; byLevel: { level: string; count: number }[] }
  courts: { total: number; active: number }
  bookings: { total: number; confirmed: number; cancelled: number; pending: number; completed: number }
  revenue: { total: number; monthly: number }
  recentBookings: Booking[]
  bookingsByCourt: { courtId: string; courtName: string; count: number; revenue: number }[]
}

// Helper functions
const formatDateShort = (dateStr: string) => {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', weekday: 'short' })
}

const formatDateFull = (dateStr: string) => {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

const getStatusBadge = (status: string) => {
  const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; icon: React.ReactNode; className: string }> = {
    CONFIRMED: { variant: 'default', label: 'Confirmada', icon: <CheckCircle className="w-3 h-3" />, className: 'bg-emerald-600 hover:bg-emerald-700' },
    PENDING: { variant: 'secondary', label: 'Pendente', icon: <AlertCircle className="w-3 h-3" />, className: 'bg-amber-500 hover:bg-amber-600 text-white' },
    CANCELLED: { variant: 'destructive', label: 'Cancelada', icon: <XCircle className="w-3 h-3" />, className: '' },
    COMPLETED: { variant: 'outline', label: 'Concluida', icon: <CheckCircle className="w-3 h-3" />, className: 'border-blue-500 text-blue-600' }
  }
  const { variant, label, icon, className } = config[status] || config.PENDING
  return <Badge variant={variant} className={`flex items-center gap-1 ${className}`}>{icon}{label}</Badge>
}

const getCourtTypeLabel = (type: string) => {
  const labels: Record<string, string> = { INDOOR: 'Coberta', OUTDOOR: 'Aberta' }
  return labels[type] || type
}

const getSurfaceLabel = (surface: string) => {
  const labels: Record<string, string> = { CLAY: 'Saibro', HARD: 'Rigida', GRASS: 'Grama' }
  return labels[surface] || surface
}

const courtSlideshow: Record<string, string[]> = {
  'Tennis Center': ['/tennis-center.png', '/tclogo.png'],
}

function CourtImageSlideshow({ images, alt }: { images: string[]; alt: string }) {
  const [activeIndex, setActiveIndex] = useState(0)
  useEffect(() => {
    if (images.length <= 1) return
    const interval = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % images.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [images.length])
  const isLogo = (src: string) => src.includes('logo')
  return (
    <>
      {images.map((src, i) => (
        isLogo(src) ? (
          <div key={src} className={`absolute inset-0 z-10 bg-white flex items-center justify-center transition-opacity duration-1000 ${i === activeIndex ? 'opacity-100' : 'opacity-0'}`}>
            <img src={src} alt={alt} className="w-1/2 h-1/2 object-contain" />
          </div>
        ) : (
          <img key={src} src={src} alt={alt} className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${i === activeIndex ? 'opacity-100' : 'opacity-0'}`} />
        )
      ))}
    </>
  )
}

const courtExtraInfo: Record<string, { address: string; mapsUrl: string; instagram: string }> = {
  'Tennis Center': {
    address: 'Av. Brasil, 1130 - Sumaré, Caraguatatuba - SP',
    mapsUrl: 'https://www.google.com/maps/search/Av.+Brasil,+1130+-+Sumaré,+Caraguatatuba+-+SP,+11661-200',
    instagram: 'https://instagram.com/tnniscnter',
  },
  'Tennis Point': {
    address: 'R. Caçapava, 574 - Sumaré, Caraguatatuba - SP',
    mapsUrl: 'https://www.google.com/maps/search/R.+Caçapava,+574+-+Sumaré,+Caraguatatuba+-+SP,+11661-040',
    instagram: 'https://instagram.com/tenispointcaraguatatuba',
  },
  'Top Spin (Quadra 1)': {
    address: 'Av. Dos Bandeirantes, 240 - Martim de Sá, Caraguatatuba - SP',
    mapsUrl: 'https://www.google.com/maps/search/Av.+Dos+Bandeirantes,+240+-+Martim+de+Sá,+Caraguatatuba+-+SP,+11662-100',
    instagram: 'https://instagram.com/arena_topspin',
  },
  'Top Spin (Quadra 2)': {
    address: 'Av. Dos Bandeirantes, 240 - Martim de Sá, Caraguatatuba - SP',
    mapsUrl: 'https://www.google.com/maps/search/Av.+Dos+Bandeirantes,+240+-+Martim+de+Sá,+Caraguatatuba+-+SP,+11662-100',
    instagram: 'https://instagram.com/arena_topspin',
  },
}

const getLevelBadge = (level: string | null) => {
  if (!level) return null
  const config: Record<string, { bg: string; text: string; label: string }> = {
    A: { bg: 'bg-emerald-600', text: 'text-white', label: 'Avancado' },
    B: { bg: 'bg-blue-600', text: 'text-white', label: 'Intermediario' },
    C: { bg: 'bg-orange-500', text: 'text-white', label: 'Iniciante' }
  }
  const { bg, text, label } = config[level] || config.C
  return (
    <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold ${bg} ${text} whitespace-nowrap shrink-0`}>
      <span className="sm:hidden">{level}</span><span className="hidden sm:inline">{level} - {label}</span>
    </span>
  )
}

const getNextWeekendDay = (): Date => {
  const today = new Date()
  const dayOfWeek = today.getDay()

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    const d = new Date(today)
    d.setHours(0, 0, 0, 0)
    return d
  }

  const nextSaturday = new Date(today)
  nextSaturday.setDate(today.getDate() + (6 - dayOfWeek))
  nextSaturday.setHours(0, 0, 0, 0)
  return nextSaturday
}

const DEFAULT_TIME_SLOTS: TimeSlot[] = []

// Chart configs
const bookingStatusChartConfig = {
  confirmed: { label: 'Confirmadas', color: '#059669' },
  pending: { label: 'Pendentes', color: '#d97706' },
  completed: { label: 'Concluidas', color: '#2563eb' },
  cancelled: { label: 'Canceladas', color: '#dc2626' },
}

const courtRevenueChartConfig = {
  revenue: { label: 'Receita', color: '#059669' },
  count: { label: 'Reservas', color: '#2563eb' },
}

export default function Home() {
  // State
  const [user, setUser] = useState<User | null>(null)
  const [courts, setCourts] = useState<Court[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [publicBookings, setPublicBookings] = useState<Booking[]>([])
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(getNextWeekendDay())
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>(DEFAULT_TIME_SLOTS)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [courtsLoading, setCourtsLoading] = useState(true)
  const [publicBookingsLoading, setPublicBookingsLoading] = useState(false)
  const [publicBlocks, setPublicBlocks] = useState<{ id: string; courtId: string; date: string; startTime: string; endTime: string; reason: string | null; court: { id: string; name: string } }[]>([])
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('public')

  // Admin state
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null)
  const [adminUsers, setAdminUsers] = useState<User[]>([])
  const [adminBookings, setAdminBookings] = useState<Booking[]>([])
  const [adminCourts, setAdminCourts] = useState<Court[]>([])
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminActiveTab, setAdminActiveTab] = useState('dashboard')
  const [adminBlocks, setAdminBlocks] = useState<BlockedSlot[]>([])
  const [addBlockOpen, setAddBlockOpen] = useState(false)
  const [newBlockForm, setNewBlockForm] = useState({ courtId: '', date: '', startTime: '', endTime: '', reason: '', allDay: false })
  const [blockCourtSlots, setBlockCourtSlots] = useState<{ startTime: string; endTime: string }[]>([])

  const [addUserOpen, setAddUserOpen] = useState(false)
  const [newUserForm, setNewUserForm] = useState({ username: '', name: '', password: '', email: '', phone: '', role: 'PLAYER', level: 'C', courtIds: [] as string[] })

  // Dialog states
  const [loginOpen, setLoginOpen] = useState(false)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [editUserOpen, setEditUserOpen] = useState(false)
  const [editCourtOpen, setEditCourtOpen] = useState(false)
  const [editBookingOpen, setEditBookingOpen] = useState(false)
  const [addCourtOpen, setAddCourtOpen] = useState(false)

  // Form states
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [registerForm, setRegisterForm] = useState({ username: '', name: '', email: '', password: '', phone: '', level: 'C' })
  const [bookingNotes, setBookingNotes] = useState('')
  const [bookingTargetUserId, setBookingTargetUserId] = useState<string>('')
  const [allPlayers, setAllPlayers] = useState<User[]>([])
  const [editUserForm, setEditUserForm] = useState<User | null>(null)
  const [editCourtForm, setEditCourtForm] = useState<Court | null>(null)
  const [editBookingForm, setEditBookingForm] = useState<Booking | null>(null)
  const [newCourtForm, setNewCourtForm] = useState({ name: '', type: 'OUTDOOR', surface: 'CLAY', pricePerHour: '60', image: '' })
  const [bookingCountdown, setBookingCountdown] = useState('')

  // Janela de reservas: abre quarta 20:00, fecha domingo 23:59
  const getBookingWindowStatus = useCallback(() => {
    const now = new Date()
    const day = now.getDay() // 0=dom, 1=seg, 2=ter, 3=qua
    const hour = now.getHours()
    // Aberto: qua >= 20:00 até dom 23:59
    if ((day === 3 && hour >= 20) || day === 4 || day === 5 || day === 6 || day === 0) {
      return true
    }
    return false
  }, [])

  const [bookingWindowOpen, setBookingWindowOpen] = useState(getBookingWindowStatus)

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date()
      const day = now.getDay()
      const isOpen = getBookingWindowStatus()
      setBookingWindowOpen(isOpen)

      if (isOpen) {
        setBookingCountdown('')
        return
      }

      // Calcular próxima quarta 20:00
      let daysUntilWed = (3 - day + 7) % 7
      if (daysUntilWed === 0 && now.getHours() >= 20) daysUntilWed = 7
      const nextWed = new Date(now)
      nextWed.setDate(now.getDate() + daysUntilWed)
      nextWed.setHours(20, 0, 0, 0)

      const diff = nextWed.getTime() - now.getTime()
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      const parts = []
      if (days > 0) parts.push(`${days}d`)
      parts.push(`${String(hours).padStart(2, '0')}h`)
      parts.push(`${String(minutes).padStart(2, '0')}m`)
      parts.push(`${String(seconds).padStart(2, '0')}s`)
      setBookingCountdown(parts.join(' '))
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [getBookingWindowStatus])

  // Load courts
  const loadCourts = useCallback(async () => {
    try {
      setCourtsLoading(true)
      const res = await fetch('/api/courts')
      if (res.ok) {
        const data = await res.json()
        setCourts(data)
      }
    } catch (error) {
      console.error('Error loading courts:', error)
    } finally {
      setCourtsLoading(false)
    }
  }, [])

  const loadBookings = useCallback(async (userId: string) => {
    try {
      const res = await fetch(`/api/bookings?userId=${userId}`)
      if (res.ok) {
        const data = await res.json()
        setBookings(data)
      }
    } catch (error) {
      console.error('Error loading bookings:', error)
    }
  }, [])

  const loadPublicBookings = useCallback(async (date: string) => {
    try {
      setPublicBookingsLoading(true)
      const [bookingsRes, blocksRes] = await Promise.all([
        fetch(`/api/bookings/public?date=${date}`),
        fetch(`/api/blocks/public?date=${date}`)
      ])
      if (bookingsRes.ok) setPublicBookings(await bookingsRes.json())
      if (blocksRes.ok) setPublicBlocks(await blocksRes.json())
    } catch (error) {
      console.error('Error loading public bookings:', error)
    } finally {
      setPublicBookingsLoading(false)
    }
  }, [])

  const loadAdminStats = useCallback(async () => {
    if (!user?.id) return
    try {
      const res = await fetch(`/api/admin/stats?userId=${user.id}`)
      if (res.ok) {
        const data = await res.json()
        setAdminStats(data)
      }
    } catch (error) {
      console.error('Error loading admin stats:', error)
    }
  }, [user?.id])

  const loadAdminUsers = useCallback(async () => {
    if (!user?.id) return
    try {
      setAdminLoading(true)
      const res = await fetch(`/api/admin/users?adminId=${user.id}`)
      if (res.ok) {
        const data = await res.json()
        setAdminUsers(data)
      }
    } catch (error) {
      console.error('Error loading admin users:', error)
    } finally {
      setAdminLoading(false)
    }
  }, [user?.id])

  const loadAdminBookings = useCallback(async () => {
    if (!user?.id) return
    try {
      setAdminLoading(true)
      const res = await fetch(`/api/admin/bookings?adminId=${user.id}`)
      if (res.ok) {
        const data = await res.json()
        setAdminBookings(data.bookings || [])
      }
    } catch (error) {
      console.error('Error loading admin bookings:', error)
    } finally {
      setAdminLoading(false)
    }
  }, [user?.id])

  const loadAdminCourts = useCallback(async () => {
    if (!user?.id) return
    try {
      setAdminLoading(true)
      const res = await fetch(`/api/admin/courts?adminId=${user.id}`)
      if (res.ok) {
        const data = await res.json()
        setAdminCourts(data)
      }
    } catch (error) {
      console.error('Error loading admin courts:', error)
    } finally {
      setAdminLoading(false)
    }
  }, [user?.id])

  const loadAdminBlocks = useCallback(async () => {
    if (!user?.id) return
    try {
      setAdminLoading(true)
      const res = await fetch(`/api/admin/blocks?adminId=${user.id}`)
      if (res.ok) {
        const data = await res.json()
        setAdminBlocks(data)
      }
    } catch (error) {
      console.error('Error loading admin blocks:', error)
    } finally {
      setAdminLoading(false)
    }
  }, [user?.id])

  useEffect(() => { loadCourts() }, [loadCourts])

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch {
        localStorage.removeItem('user')
      }
    }
  }, [])

  useEffect(() => {
    if (user?.id) loadBookings(user.id)
  }, [user, loadBookings])

  useEffect(() => {
    const dateStr = selectedDate.toISOString().split('T')[0]
    loadPublicBookings(dateStr)
  }, [selectedDate, loadPublicBookings])

  useEffect(() => {
    if (!selectedCourt) {
      setAvailableSlots(DEFAULT_TIME_SLOTS)
      return
    }
    const loadAvailability = async () => {
      try {
        const dateStr = selectedDate.toISOString().split('T')[0]
        const res = await fetch(`/api/bookings/availability?courtId=${selectedCourt.id}&date=${dateStr}`)
        if (res.ok) setAvailableSlots(await res.json())
      } catch {
        setAvailableSlots(DEFAULT_TIME_SLOTS)
      }
    }
    loadAvailability()
  }, [selectedCourt, selectedDate])

  const isAdminRole = user?.role === 'ADMIN' || user?.role === 'COURT_ADMIN'

  useEffect(() => {
    if (isAdminRole) loadAdminStats()
  }, [isAdminRole, loadAdminStats])

  useEffect(() => {
    if (!isAdminRole) return
    if (adminActiveTab === 'users') loadAdminUsers()
    if (adminActiveTab === 'bookings') loadAdminBookings()
    if (adminActiveTab === 'courts') loadAdminCourts()
    if (adminActiveTab === 'blocks') loadAdminBlocks()
  }, [isAdminRole, adminActiveTab, loadAdminUsers, loadAdminBookings, loadAdminCourts, loadAdminBlocks])

  // Load court slots for block form when court+date are selected
  useEffect(() => {
    if (!newBlockForm.courtId || !newBlockForm.date) { setBlockCourtSlots([]); return }
    const dateObj = new Date(newBlockForm.date + 'T12:00:00')
    const dayOfWeek = dateObj.getDay()
    fetch(`/api/courts/slots?courtId=${newBlockForm.courtId}&dayOfWeek=${dayOfWeek}`)
      .then(r => r.ok ? r.json() : [])
      .then(setBlockCourtSlots)
      .catch(() => setBlockCourtSlots([]))
  }, [newBlockForm.courtId, newBlockForm.date])

  // Load players for admin booking
  const loadPlayers = useCallback(async () => {
    if (!user?.id || (user.role !== 'ADMIN' && user.role !== 'COURT_ADMIN')) return
    try {
      const res = await fetch(`/api/admin/users?adminId=${user.id}&role=PLAYER`)
      if (res.ok) {
        const data = await res.json()
        setAllPlayers(data)
      }
    } catch (error) {
      console.error('Error loading players:', error)
    }
  }, [user?.id, user?.role])

  useEffect(() => {
    if (user?.role === 'ADMIN' || user?.role === 'COURT_ADMIN') loadPlayers()
  }, [user, loadPlayers])

  // Handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      })
      const data = await res.json()
      if (data.error) {
        toast({ title: 'Erro', description: data.error, variant: 'destructive' })
      } else {
        setUser(data.user)
        localStorage.setItem('user', JSON.stringify(data.user))
        setLoginOpen(false)
        setLoginForm({ username: '', password: '' })
        toast({ title: 'Bem-vindo!', description: `Ola, ${data.user.name}!` })
        loadCourts()
      }
    } catch {
      toast({ title: 'Erro', description: 'Erro ao fazer login', variant: 'destructive' })
    }
    setLoading(false)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerForm)
      })
      const data = await res.json()
      if (data.error) {
        toast({ title: 'Erro', description: data.error, variant: 'destructive' })
      } else {
        setUser(data.user)
        localStorage.setItem('user', JSON.stringify(data.user))
        setRegisterOpen(false)
        setRegisterForm({ username: '', name: '', email: '', password: '', phone: '', level: 'C' })
        toast({ title: 'Cadastro realizado!', description: 'Bem-vindo ao RGTA!' })
        loadCourts()
      }
    } catch {
      toast({ title: 'Erro', description: 'Erro ao cadastrar', variant: 'destructive' })
    }
    setLoading(false)
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('user')
    setBookings([])
    setSelectedCourt(null)
    setAdminStats(null)
    setActiveTab('public')
    toast({ title: 'Ate logo!', description: 'Voce saiu da sua conta' })
  }

  const handleBooking = async () => {
    if (!user || !selectedCourt || !selectedDate || !selectedSlot) return
    const isAdmin = user.role === 'ADMIN' || user.role === 'COURT_ADMIN'
    if (isAdmin && !bookingTargetUserId) {
      toast({ title: 'Erro', description: 'Selecione um jogador para a reserva', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      const dateStr = selectedDate.toISOString().split('T')[0]
      const slotData = availableSlots.find(s => s.time === selectedSlot)
      const endTime = slotData?.endTime || selectedSlot
      const bookingData: any = {
        userId: user.id, courtId: selectedCourt.id, date: dateStr,
        startTime: selectedSlot, endTime, notes: bookingNotes
      }
      if (isAdmin) {
        bookingData.targetUserId = bookingTargetUserId
      }
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      })
      const data = await res.json()
      if (data.error) {
        toast({ title: 'Erro', description: data.error, variant: 'destructive' })
      } else {
        toast({ title: 'Reserva confirmada!', description: `${selectedCourt.name} - ${formatDateShort(dateStr)} as ${selectedSlot}` })
        setBookingOpen(false)
        setSelectedSlot(null)
        setBookingNotes('')
        const [availRes, bookRes] = await Promise.all([
          fetch(`/api/bookings/availability?courtId=${selectedCourt.id}&date=${dateStr}`),
          fetch(`/api/bookings?userId=${user.id}`)
        ])
        if (availRes.ok) setAvailableSlots(await availRes.json())
        if (bookRes.ok) setBookings(await bookRes.json())
        loadPublicBookings(dateStr)
      }
    } catch {
      toast({ title: 'Erro', description: 'Erro ao criar reserva', variant: 'destructive' })
    }
    setLoading(false)
  }

  const handleCancelBooking = async (bookingId: string) => {
    setCancellingId(bookingId)
    try {
      const res = await fetch(`/api/bookings?id=${bookingId}&userId=${user?.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'Reserva cancelada', description: 'Sua reserva foi cancelada' })
        if (user) loadBookings(user.id)
        const dateStr = selectedDate.toISOString().split('T')[0]
        loadPublicBookings(dateStr)
        if (selectedCourt) {
          const availRes = await fetch(`/api/bookings/availability?courtId=${selectedCourt.id}&date=${dateStr}`)
          if (availRes.ok) setAvailableSlots(await availRes.json())
        }
      }
    } catch {
      toast({ title: 'Erro', description: 'Erro ao cancelar reserva', variant: 'destructive' })
    }
    setCancellingId(null)
  }

  const handleUpdateUser = async () => {
    if (!user || !editUserForm) return
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user.id, userId: editUserForm.id, ...editUserForm, courtIds: editUserForm.courtIds || [] })
      })
      const data = await res.json()
      if (data.error) { toast({ title: 'Erro', description: data.error, variant: 'destructive' }) }
      else { toast({ title: 'Sucesso', description: 'Usuario atualizado' }); setEditUserOpen(false); loadAdminUsers() }
    } catch { toast({ title: 'Erro', description: 'Erro ao atualizar usuario', variant: 'destructive' }) }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!user || !confirm('Tem certeza que deseja excluir este usuario?')) return
    try {
      const res = await fetch(`/api/admin/users?adminId=${user.id}&userId=${userId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.error) { toast({ title: 'Erro', description: data.error, variant: 'destructive' }) }
      else { toast({ title: 'Sucesso', description: 'Usuario excluido' }); loadAdminUsers() }
    } catch { toast({ title: 'Erro', description: 'Erro ao excluir usuario', variant: 'destructive' }) }
  }

  const handleAddUser = async () => {
    if (!user) return
    const { username, name, password, role, level, email, phone, courtIds } = newUserForm
    if (!username || !name || !password) { toast({ title: 'Erro', description: 'Username, nome e senha são obrigatórios', variant: 'destructive' }); return }
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user.id, username, name, password, email: email || undefined, phone: phone || undefined, role, level: role === 'PLAYER' ? level : undefined, courtIds: role === 'COURT_ADMIN' ? courtIds : undefined })
      })
      const data = await res.json()
      if (data.error) { toast({ title: 'Erro', description: data.error, variant: 'destructive' }) }
      else {
        toast({ title: 'Sucesso', description: `Usuário ${name} criado` })
        setAddUserOpen(false)
        setNewUserForm({ username: '', name: '', password: '', email: '', phone: '', role: 'PLAYER', level: 'C', courtIds: [] })
        loadAdminUsers()
      }
    } catch { toast({ title: 'Erro', description: 'Erro ao criar usuário', variant: 'destructive' }) }
  }

  const handleUpdateBooking = async () => {
    if (!user || !editBookingForm) return
    try {
      const res = await fetch('/api/admin/bookings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user.id, bookingId: editBookingForm.id, status: editBookingForm.status, notes: editBookingForm.notes })
      })
      const data = await res.json()
      if (data.error) { toast({ title: 'Erro', description: data.error, variant: 'destructive' }) }
      else { toast({ title: 'Sucesso', description: 'Reserva atualizada' }); setEditBookingOpen(false); loadAdminBookings(); loadAdminStats() }
    } catch { toast({ title: 'Erro', description: 'Erro ao atualizar reserva', variant: 'destructive' }) }
  }

  const handleDeleteBooking = async (bookingId: string) => {
    if (!user || !confirm('Tem certeza que deseja excluir esta reserva?')) return
    try {
      const res = await fetch(`/api/admin/bookings?adminId=${user.id}&bookingId=${bookingId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.error) { toast({ title: 'Erro', description: data.error, variant: 'destructive' }) }
      else { toast({ title: 'Sucesso', description: 'Reserva excluida' }); loadAdminBookings(); loadAdminStats() }
    } catch { toast({ title: 'Erro', description: 'Erro ao excluir reserva', variant: 'destructive' }) }
  }

  const handleUpdateCourt = async () => {
    if (!user || !editCourtForm) return
    try {
      const res = await fetch('/api/admin/courts', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user.id, courtId: editCourtForm.id, ...editCourtForm })
      })
      const data = await res.json()
      if (data.error) { toast({ title: 'Erro', description: data.error, variant: 'destructive' }) }
      else { toast({ title: 'Sucesso', description: 'Quadra atualizada' }); setEditCourtOpen(false); loadAdminCourts(); loadCourts() }
    } catch { toast({ title: 'Erro', description: 'Erro ao atualizar quadra', variant: 'destructive' }) }
  }

  const handleAddCourt = async () => {
    if (!user) return
    try {
      const res = await fetch('/api/admin/courts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user.id, ...newCourtForm })
      })
      const data = await res.json()
      if (data.error) { toast({ title: 'Erro', description: data.error, variant: 'destructive' }) }
      else {
        toast({ title: 'Sucesso', description: 'Quadra criada' }); setAddCourtOpen(false)
        setNewCourtForm({ name: '', type: 'OUTDOOR', surface: 'CLAY', pricePerHour: '60', image: '' })
        loadAdminCourts(); loadCourts()
      }
    } catch { toast({ title: 'Erro', description: 'Erro ao criar quadra', variant: 'destructive' }) }
  }

  const handleDeleteCourt = async (courtId: string) => {
    if (!user || !confirm('Tem certeza que deseja excluir esta quadra?')) return
    try {
      const res = await fetch(`/api/admin/courts?adminId=${user.id}&courtId=${courtId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.error) { toast({ title: 'Erro', description: data.error, variant: 'destructive' }) }
      else { toast({ title: 'Sucesso', description: data.message || 'Quadra excluida' }); loadAdminCourts(); loadCourts() }
    } catch { toast({ title: 'Erro', description: 'Erro ao excluir quadra', variant: 'destructive' }) }
  }

  const handleAddBlock = async () => {
    if (!user) return
    const { courtId, date, startTime, endTime, reason, allDay } = newBlockForm
    if (!courtId || !date) { toast({ title: 'Erro', description: 'Selecione a quadra e a data', variant: 'destructive' }); return }

    // Se dia inteiro, usar primeiro e último slot do dia
    const finalStart = allDay && blockCourtSlots.length > 0 ? blockCourtSlots[0].startTime : startTime
    const finalEnd = allDay && blockCourtSlots.length > 0 ? blockCourtSlots[blockCourtSlots.length - 1].endTime : endTime
    if (!finalStart || !finalEnd) { toast({ title: 'Erro', description: 'Selecione os horários', variant: 'destructive' }); return }

    try {
      const res = await fetch('/api/admin/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user.id, courtId, date, startTime: finalStart, endTime: finalEnd, reason: reason || null })
      })
      const data = await res.json()
      if (data.error) { toast({ title: 'Erro', description: data.error, variant: 'destructive' }) }
      else {
        toast({ title: 'Sucesso', description: 'Horário bloqueado' })
        setAddBlockOpen(false)
        setNewBlockForm({ courtId: '', date: '', startTime: '', endTime: '', reason: '', allDay: false })
        loadAdminBlocks()
      }
    } catch { toast({ title: 'Erro', description: 'Erro ao criar bloqueio', variant: 'destructive' }) }
  }

  const handleDeleteBlock = async (blockId: string) => {
    if (!user || !confirm('Remover este bloqueio?')) return
    try {
      const res = await fetch(`/api/admin/blocks?adminId=${user.id}&blockId=${blockId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.error) { toast({ title: 'Erro', description: data.error, variant: 'destructive' }) }
      else { toast({ title: 'Sucesso', description: 'Bloqueio removido' }); loadAdminBlocks() }
    } catch { toast({ title: 'Erro', description: 'Erro ao remover bloqueio', variant: 'destructive' }) }
  }

  const getCourtAdminLabel = (courtIds?: string[]) => {
    if (!courtIds || courtIds.length === 0) return 'Administrador'
    const names = courtIds.map(id => courts.find(c => c.id === id)?.name).filter(Boolean)
    return names.length > 0 ? `Administrador - ${names.join(', ')}` : 'Administrador'
  }

  const isWeekend = (date: Date) => { const day = date.getDay(); return day === 0 || day === 6 }
  const isDateDisabled = (date: Date) => { const today = new Date(); today.setHours(0, 0, 0, 0); return date < today || !isWeekend(date) }

  const bookingsByCourt = publicBookings.reduce((acc, booking) => {
    const courtName = booking.court.name
    if (!acc[courtName]) acc[courtName] = []
    acc[courtName].push(booking)
    return acc
  }, {} as Record<string, Booking[]>)

  const bookingStatusData = adminStats ? [
    { name: 'Confirmadas', value: adminStats.bookings.confirmed, fill: '#059669' },
    { name: 'Pendentes', value: adminStats.bookings.pending, fill: '#d97706' },
    { name: 'Concluidas', value: adminStats.bookings.completed, fill: '#2563eb' },
    { name: 'Canceladas', value: adminStats.bookings.cancelled, fill: '#dc2626' },
  ].filter(d => d.value > 0) : []

  const courtRevenueData = adminStats?.bookingsByCourt.map(item => ({
    name: item.courtName.length > 12 ? item.courtName.substring(0, 12) + '...' : item.courtName,
    revenue: item.revenue, count: item.count,
  })) || []

  return (
    <TooltipProvider>
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/80 via-white to-white">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-md border-b sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/rgta-logo.png" alt="RGTA" className="w-10 h-10 rounded-full shadow-lg shadow-emerald-200" />
            <div>
              <span className="text-lg font-bold text-gray-900 tracking-tight">RGTA</span>
              <p className="text-[11px] text-gray-500 leading-none">Caraguatatuba</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                    <div className="flex items-center justify-end gap-1">
                      {user.role === 'PLAYER' && getLevelBadge(user.level)}
                      {user.role === 'ADMIN' && <Badge className="bg-purple-600 text-white text-[10px] px-1.5"><Shield className="w-3 h-3 mr-0.5" />Admin</Badge>}
                      {user.role === 'COURT_ADMIN' && <Badge className="bg-orange-500 text-white text-[10px] px-1.5"><Shield className="w-3 h-3 mr-0.5" />{getCourtAdminLabel(user.adminCourtIds)}</Badge>}
                    </div>
                  </div>
                </div>
                <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center ring-2 ring-emerald-100">
                  <span className="text-white text-sm font-bold">{user.name.charAt(0)}</span>
                </div>
                <Tooltip><TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={handleLogout} className="text-gray-500 hover:text-red-500 h-9 w-9"><LogOut className="w-4 h-4" /></Button>
                </TooltipTrigger><TooltipContent>Sair</TooltipContent></Tooltip>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
                  <DialogTrigger asChild><Button variant="ghost" size="sm"><LogIn className="w-4 h-4 mr-1.5" />Entrar</Button></DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2"><LogIn className="w-5 h-5 text-emerald-600" />Entrar</DialogTitle>
                      <DialogDescription>Acesse sua conta para fazer reservas</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleLogin} className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-username">Usuario</Label>
                        <div className="relative">
                          <User2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input id="login-username" type="text" value={loginForm.username} onChange={e => setLoginForm({ ...loginForm, username: e.target.value })} placeholder="seu.usuario" required className="pl-10" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-password">Senha</Label>
                        <Input id="login-password" type="password" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} placeholder="******" required />
                      </div>
                      <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
                        {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Entrando...</> : 'Entrar'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
                <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
                  <DialogTrigger asChild><Button size="sm" className="bg-emerald-600 hover:bg-emerald-700"><UserPlus className="w-4 h-4 mr-1.5" />Cadastrar</Button></DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5 text-emerald-600" />Criar conta</DialogTitle>
                      <DialogDescription>Cadastre-se para comecar a reservar</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleRegister} className="space-y-4 mt-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-2"><Label>Usuario *</Label><Input value={registerForm.username} onChange={e => setRegisterForm({ ...registerForm, username: e.target.value })} placeholder="seu.usuario" required /></div>
                        <div className="space-y-2"><Label>Nome completo *</Label><Input value={registerForm.name} onChange={e => setRegisterForm({ ...registerForm, name: e.target.value })} placeholder="Seu nome" required /></div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-2"><Label>Email</Label><Input type="email" value={registerForm.email} onChange={e => setRegisterForm({ ...registerForm, email: e.target.value })} placeholder="seu@email.com" /></div>
                        <div className="space-y-2"><Label>Telefone</Label><Input value={registerForm.phone} onChange={e => setRegisterForm({ ...registerForm, phone: e.target.value })} placeholder="(11) 99999-9999" /></div>
                      </div>
                      <div className="space-y-2">
                        <Label>Categoria de Jogo</Label>
                        <div className="flex gap-2">
                          {(['A', 'B', 'C'] as const).map((cat) => (
                            <button key={cat} type="button" onClick={() => setRegisterForm({ ...registerForm, level: cat })}
                              className={`flex-1 py-2.5 px-3 rounded-xl border-2 font-bold transition-all ${
                                registerForm.level === cat
                                  ? cat === 'A' ? 'border-emerald-600 bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                                    : cat === 'B' ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-200'
                                    : 'border-orange-500 bg-orange-500 text-white shadow-lg shadow-orange-200'
                                  : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white'
                              }`}>
                              {cat}<span className="block text-xs font-normal mt-0.5">{cat === 'A' ? 'Avancado' : cat === 'B' ? 'Intermediario' : 'Iniciante'}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2"><Label>Senha</Label><Input type="password" value={registerForm.password} onChange={e => setRegisterForm({ ...registerForm, password: e.target.value })} placeholder="Minimo 6 caracteres" required /></div>
                      <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
                        {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Cadastrando...</> : 'Cadastrar'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative py-8 md:py-16 overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-green-800">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 rounded-full border-4 border-white/30" />
          <div className="absolute bottom-10 right-20 w-48 h-48 rounded-full border-4 border-white/20" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 text-center text-white">
          {bookingWindowOpen ? (
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-emerald-100">Reservas abertas para fins de semana</span>
            </div>
          ) : (
            <div className="inline-flex flex-col items-center gap-1.5 bg-red-500/20 backdrop-blur-sm rounded-2xl px-5 py-3 mb-6 border border-red-400/30">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-red-100">Reservas fechadas</span>
              </div>
              <span className="text-xs text-red-200">Abre quarta-feira as 20:00</span>
              {bookingCountdown && <span className="text-lg font-bold font-mono text-white tracking-wider">{bookingCountdown}</span>}
            </div>
          )}
          <h1 className="text-2xl md:text-5xl font-bold mb-3 md:mb-4 tracking-tight">Reserve sua quadra de tenis</h1>
          <p className="text-sm md:text-lg text-emerald-100 mb-6 md:mb-8 max-w-2xl mx-auto">Agende horarios nos fins de semana. Ate 2 jogadores por horario!</p>
          <Button size="lg" className="bg-white text-emerald-700 hover:bg-emerald-50 shadow-xl shadow-emerald-900/20 font-semibold" onClick={() => setActiveTab('booking')}>
            <CalendarDays className="w-5 h-5 mr-2" />Fazer Reserva
          </Button>
          <div className="mt-8 md:mt-10 grid grid-cols-4 gap-2 md:gap-8 max-w-2xl mx-auto">
            {[
              { val: `${courts.length || 4}`, label: 'Quadras' },
              { val: 'R$ 60,00', label: '' },
              { val: 'Sab/Dom', label: 'Disponivel' },
              { val: '2 vagas', label: 'Por horario' },
            ].map(item => (
              <div key={item.val} className="bg-white/10 backdrop-blur-sm rounded-xl p-2 md:p-3 flex flex-col items-center justify-center">
                <p className="text-sm md:text-3xl font-bold">{item.val}</p>
                {item.label && <p className="text-emerald-200 text-[10px] md:text-xs mt-0.5">{item.label}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="overflow-x-auto -mx-4 px-4">
            <TabsList className={`inline-flex w-full md:grid md:mx-auto ${isAdminRole ? 'md:max-w-3xl md:grid-cols-5' : 'md:max-w-2xl md:grid-cols-4'} h-auto p-1`}>
              <TabsTrigger value="public" className="flex-1 text-xs md:text-sm whitespace-nowrap px-2 md:px-3 py-2"><Eye className="w-4 h-4 mr-1 md:mr-1.5 shrink-0" /><span className="hidden sm:inline">Reservas do Dia</span><span className="sm:hidden">Dia</span></TabsTrigger>
              <TabsTrigger value="booking" className="flex-1 text-xs md:text-sm whitespace-nowrap px-2 md:px-3 py-2"><CalendarDays className="w-4 h-4 mr-1 md:mr-1.5 shrink-0" />Reservar</TabsTrigger>
              <TabsTrigger value="courts" className="flex-1 text-xs md:text-sm whitespace-nowrap px-2 md:px-3 py-2"><MapPin className="w-4 h-4 mr-1 md:mr-1.5 shrink-0" />Quadras</TabsTrigger>
              {(!user || user.role === 'PLAYER') && <TabsTrigger value="bookings" className="flex-1 text-xs md:text-sm whitespace-nowrap px-2 md:px-3 py-2"><Users className="w-4 h-4 mr-1 md:mr-1.5 shrink-0" /><span className="hidden sm:inline">Minhas Reservas</span><span className="sm:hidden">Minhas</span></TabsTrigger>}
              {isAdminRole && <TabsTrigger value="admin" className="flex-1 text-xs md:text-sm whitespace-nowrap px-2 md:px-3 py-2 data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700"><Settings className="w-4 h-4 mr-1 md:mr-1.5 shrink-0" />Admin</TabsTrigger>}
            </TabsList>
          </div>

          {/* PUBLIC BOOKINGS TAB */}
          <TabsContent value="public" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2"><Eye className="w-5 h-5 text-emerald-600" />Reservas Publicas</CardTitle>
                    <CardDescription>Veja quem reservou cada quadra - ate 2 jogadores por horario</CardDescription>
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="justify-start text-left font-normal min-w-[200px]">
                        <CalendarDays className="mr-2 h-4 w-4 text-emerald-600" />
                        {formatDateFull(selectedDate.toISOString().split('T')[0])}
                        <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end"><Calendar mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} disabled={isDateDisabled} /></PopoverContent>
                  </Popover>
                </div>
              </CardHeader>
              <CardContent>
                {publicBookingsLoading ? (
                  <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="border rounded-lg p-4"><Skeleton className="h-5 w-40 mb-3" /><Skeleton className="h-12 w-full" /></div>)}</div>
                ) : publicBookings.length === 0 && publicBlocks.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><CalendarX className="w-8 h-8 text-gray-400" /></div>
                    <h3 className="text-lg font-semibold mb-1">Nenhuma reserva para este dia</h3>
                    <p className="text-gray-500 text-sm mb-4">Seja o primeiro a reservar!</p>
                    <Button onClick={() => setActiveTab('booking')} className="bg-emerald-600 hover:bg-emerald-700"><CalendarDays className="w-4 h-4 mr-2" />Fazer Reserva</Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(() => {
                      // Agrupar bloqueios por quadra
                      const blocksByCourt: Record<string, typeof publicBlocks> = {}
                      publicBlocks.forEach(block => {
                        const name = block.court.name
                        if (!blocksByCourt[name]) blocksByCourt[name] = []
                        blocksByCourt[name].push(block)
                      })
                      // Todas as quadras que têm bookings ou bloqueios
                      const allCourtNames = new Set([...Object.keys(bookingsByCourt), ...Object.keys(blocksByCourt)])
                      return Array.from(allCourtNames).sort().map(courtName => {
                        const courtBookings = bookingsByCourt[courtName] || []
                        const courtBlocks = blocksByCourt[courtName] || []
                        // Agrupar bookings por slot
                        const slotGroups: Record<string, Booking[]> = {}
                        courtBookings.forEach(b => {
                          const key = `${b.startTime}-${b.endTime}`
                          if (!slotGroups[key]) slotGroups[key] = []
                          slotGroups[key].push(b)
                        })
                        const sortedSlots = Object.entries(slotGroups).sort(([a], [b]) => a.localeCompare(b))
                        const matchCount = sortedSlots.length
                        return (
                        <div key={courtName} className="border rounded-xl overflow-hidden">
                          <div className="bg-emerald-50 px-4 py-3 border-b">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-emerald-600" />{courtName}
                              {matchCount > 0 && <Badge variant="secondary" className="text-xs">{matchCount} {matchCount === 1 ? 'horario' : 'horarios'}</Badge>}
                              {courtBlocks.length > 0 && <Badge variant="destructive" className="text-xs"><Lock className="w-3 h-3 mr-0.5" />{courtBlocks.length} bloqueio{courtBlocks.length > 1 ? 's' : ''}</Badge>}
                            </h3>
                          </div>
                          <div className="divide-y">
                            {sortedSlots.map(([slotTime, slotBookings]) => {
                              const [startTime, endTime] = slotTime.split('-')
                              const playerA = slotBookings[0]
                              const playerB = slotBookings[1]
                              return (
                              <div key={slotTime} className="p-3 sm:p-4 hover:bg-gray-50/50 transition-colors">
                                <div className="flex items-center justify-between gap-2 mb-2 sm:mb-0">
                                  <div className="flex items-center gap-1.5 text-emerald-700 font-mono font-semibold bg-emerald-50 px-2 py-1 rounded-lg text-xs sm:text-sm shrink-0">
                                    <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />{startTime}-{endTime}
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    {slotBookings.length >= 2
                                      ? <Badge className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-[10px] sm:text-xs"><CheckCircle className="w-3 h-3" />Confirmado</Badge>
                                      : <Badge className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white text-[10px] sm:text-xs"><AlertCircle className="w-3 h-3" /><span className="hidden sm:inline">Aguardando Adversario</span><span className="sm:hidden">1 vaga</span></Badge>
                                    }
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                    {playerA.user.level && getLevelBadge(playerA.user.level)}
                                    <p className="font-medium text-xs sm:text-sm truncate">{playerA.user.name}</p>
                                  </div>
                                  {playerB ? (
                                    <>
                                      <span className="text-sm font-bold text-gray-400 shrink-0">x</span>
                                      <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                                        {playerB.user.level && getLevelBadge(playerB.user.level)}
                                        <p className="font-medium text-xs sm:text-sm truncate">{playerB.user.name}</p>
                                      </div>
                                    </>
                                  ) : null}
                                </div>
                              </div>
                              )
                            })}
                            {courtBlocks.map(block => (
                              <div key={block.id} className="p-4 bg-red-50/50">
                                <div className="flex items-center gap-3 md:gap-4">
                                  <div className="flex items-center gap-1.5 text-red-700 font-mono font-semibold bg-red-100 px-2.5 py-1.5 rounded-lg text-sm shrink-0">
                                    <Lock className="w-3.5 h-3.5" />{block.startTime}-{block.endTime}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="destructive" className="text-xs"><Ban className="w-3 h-3 mr-1" />Bloqueado</Badge>
                                    {block.reason && <span className="text-xs text-red-600">{block.reason}</span>}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        )
                      })
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* BOOKING TAB */}
          <TabsContent value="booking" className="space-y-6">
            {!user ? (
              <Card className="max-w-md mx-auto"><CardContent className="pt-8 pb-8 text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><CalendarDays className="w-8 h-8 text-emerald-600" /></div>
                <h3 className="text-lg font-semibold mb-1">Faca login para reservar</h3><p className="text-gray-500 mb-4 text-sm">Voce precisa estar logado</p>
                <Button onClick={() => setLoginOpen(true)} className="bg-emerald-600 hover:bg-emerald-700"><LogIn className="w-4 h-4 mr-2" />Entrar</Button>
              </CardContent></Card>
            ) : user.role === 'PLAYER' && !bookingWindowOpen ? (
              <Card className="max-w-md mx-auto"><CardContent className="pt-8 pb-8 text-center">
                <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><AlertCircle className="w-8 h-8 text-amber-600" /></div>
                <h3 className="text-lg font-semibold mb-1">Janela de reserva fechada</h3>
                <p className="text-gray-500 mb-2 text-sm">Reservas abrem na quarta-feira as 20:00</p>
                {bookingCountdown && <p className="text-lg font-bold font-mono text-amber-600 mt-2">{bookingCountdown}</p>}
                <p className="text-xs text-gray-400 mt-2">Reservas podem ser feitas de quarta (20h) a domingo.</p>
              </CardContent></Card>
            ) : courtsLoading ? (
              <div className="grid lg:grid-cols-3 gap-6"><Skeleton className="h-[400px] rounded-xl" /><Skeleton className="h-[400px] rounded-xl lg:col-span-2" /></div>
            ) : courts.length === 0 ? (
              <Card className="max-w-md mx-auto"><CardContent className="pt-8 pb-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><MapPin className="w-8 h-8 text-gray-400" /></div>
                <h3 className="text-lg font-semibold mb-1">Nenhuma quadra disponivel</h3>
                <Button onClick={() => loadCourts()} className="mt-4 bg-emerald-600 hover:bg-emerald-700"><RefreshCw className="w-4 h-4 mr-2" />Recarregar</Button>
              </CardContent></Card>
            ) : (
              <div className="grid lg:grid-cols-3 gap-6">
                <div><Card><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><span className="w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>Escolha a Quadra</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {courts.filter(c => c.isActive !== false).map(court => (
                      <div key={court.id} onClick={() => { setSelectedCourt(court); setSelectedSlot(null) }}
                        className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedCourt?.id === court.id ? 'border-emerald-600 bg-emerald-50 shadow-sm shadow-emerald-100' : 'border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/30'}`}>
                        <div className="flex justify-between items-center">
                          <div><p className="font-semibold text-sm">{court.name}</p><p className="text-xs text-gray-500 mt-0.5">{getCourtTypeLabel(court.type)} - {getSurfaceLabel(court.surface)}</p></div>
                          <div className="text-right"><p className="font-bold text-emerald-600">{formatCurrency(court.pricePerHour)}</p><p className="text-[10px] text-gray-400"></p></div>
                        </div>
                      </div>
                    ))}
                  </CardContent></Card></div>
                <div className="lg:col-span-2"><Card><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><span className="w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>Escolha Data e Horario</CardTitle></CardHeader>
                  <CardContent>
                    {!selectedCourt ? (
                      <div className="text-center py-12 text-gray-400"><div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3"><MapPin className="w-8 h-8" /></div><p className="font-medium">Selecione uma quadra primeiro</p></div>
                    ) : (
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <p className="font-medium mb-2 text-sm">Data <span className="text-gray-400 font-normal">(fins de semana)</span></p>
                          <Calendar mode="single" selected={selectedDate} onSelect={(date) => { if (date) { setSelectedDate(date); setSelectedSlot(null) } }} disabled={isDateDisabled} className="rounded-xl border" />
                        </div>
                        <div>
                          <p className="font-medium mb-2 text-sm">Horarios <span className="text-gray-400 font-normal">(max. 2 vagas)</span></p>
                          {availableSlots.length === 0 ? (
                            <div className="text-center py-8 text-gray-400"><Clock className="w-8 h-8 mx-auto mb-2" /><p className="text-sm">Nenhum horário disponível para esta quadra neste dia</p></div>
                          ) : <div className="grid grid-cols-2 gap-1.5 max-h-[340px] overflow-y-auto pr-1">
                            {availableSlots.map(slot => (
                              <Button key={slot.time} variant={selectedSlot === slot.time ? 'default' : 'outline'} disabled={!slot.available || !!slot.blocked} onClick={() => !slot.blocked && setSelectedSlot(slot.time)}
                                className={`w-full flex-col h-auto py-2 text-xs ${slot.blocked ? 'opacity-60 bg-red-50 border-red-200 cursor-not-allowed' : selectedSlot === slot.time ? 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200' : slot.available ? 'hover:border-emerald-300 hover:bg-emerald-50/50' : 'opacity-50'}`}>
                                <div className="flex items-center gap-1 font-semibold">{slot.blocked ? <Lock className="w-3 h-3 text-red-500" /> : <Clock className="w-3 h-3" />}{slot.time} - {slot.endTime}</div>
                                <div className="mt-0.5">
                                  {slot.blocked ? <span className="text-[10px] text-red-500 font-medium">{slot.blockReason || 'Bloqueado'}</span>
                                  : slot.available ? (slot.spotsLeft === 2
                                    ? <span className={`text-[10px] font-medium ${selectedSlot === slot.time ? 'text-emerald-100' : 'text-emerald-600'}`}>2 vagas</span>
                                    : <span className={`text-[10px] font-medium ${selectedSlot === slot.time ? 'text-orange-200' : 'text-orange-500'}`}>Ultima vaga!</span>
                                  ) : <span className="text-[10px] text-red-400 font-medium">Lotado</span>}
                                </div>
                                {!slot.blocked && slot.reservedBy.length > 0 && <div className="flex flex-wrap gap-0.5 mt-1 justify-center">
                                  {slot.reservedBy.slice(0, 2).map((u) => <span key={u.id} className={`text-[9px] px-1 rounded truncate max-w-[55px] ${selectedSlot === slot.time ? 'bg-emerald-500/50 text-white' : 'bg-gray-100 text-gray-600'}`}>{u.name.split(' ')[0]}</span>)}
                                </div>}
                              </Button>
                            ))}
                          </div>}
                        </div>
                      </div>
                    )}
                    {selectedCourt && selectedSlot && (
                      <div className="mt-6 p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-100">
                        <h4 className="font-semibold mb-3 flex items-center gap-2"><span className="w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>Resumo da Reserva</h4>
                        {(user.role === 'ADMIN' || user.role === 'COURT_ADMIN') && (
                          <div className="mb-4 p-3 bg-white rounded-lg border">
                            <Label className="text-sm font-medium mb-2 block">Reservar para jogador *</Label>
                            <Select value={bookingTargetUserId} onValueChange={setBookingTargetUserId}>
                              <SelectTrigger><SelectValue placeholder="Selecione o jogador" /></SelectTrigger>
                              <SelectContent>
                                {allPlayers.map(p => (
                                  <SelectItem key={p.id} value={p.id}>{p.name} {p.level ? `(${p.level})` : ''}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-400 mt-1">Administradores nao podem reservar para si mesmos</p>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div><p className="text-gray-500 text-xs">Quadra</p><p className="font-semibold">{selectedCourt.name}</p></div>
                          <div><p className="text-gray-500 text-xs">Data</p><p className="font-semibold">{formatDateShort(selectedDate.toISOString().split('T')[0])}</p></div>
                          <div><p className="text-gray-500 text-xs">Horario</p><p className="font-semibold">{selectedSlot} - {availableSlots.find(s => s.time === selectedSlot)?.endTime || ''}</p></div>
                          <div><p className="text-gray-500 text-xs">Valor</p><p className="font-bold text-emerald-600 text-lg">{formatCurrency(selectedCourt.pricePerHour)}</p></div>
                        </div>
                        <div className="mt-4 space-y-3">
                          <Textarea placeholder="Observacoes (opcional)" value={bookingNotes} onChange={e => setBookingNotes(e.target.value)} rows={2} className="bg-white" />
                          <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
                            <DialogTrigger asChild><Button className="w-full bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200" size="lg"><CheckCircle className="w-5 h-5 mr-2" />Confirmar Reserva</Button></DialogTrigger>
                            <DialogContent>
                              <DialogHeader><DialogTitle>Confirmar reserva?</DialogTitle><DialogDescription>{selectedCourt.name} - {formatDateShort(selectedDate.toISOString().split('T')[0])} - {selectedSlot} às {availableSlots.find(s => s.time === selectedSlot)?.endTime || ''}</DialogDescription></DialogHeader>
                              <div className="bg-emerald-50 p-6 rounded-xl my-4 text-center border border-emerald-100"><p className="text-3xl font-bold text-emerald-600">{formatCurrency(selectedCourt.pricePerHour)}</p><p className="text-sm text-gray-500 mt-1">Valor total</p></div>
                              <DialogFooter className="gap-2">
                                <Button variant="outline" onClick={() => setBookingOpen(false)}>Cancelar</Button>
                                <Button onClick={handleBooking} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
                                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processando...</> : <><CheckCircle className="w-4 h-4 mr-2" />Confirmar</>}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    )}
                  </CardContent></Card></div>
              </div>
            )}
          </TabsContent>

          {/* COURTS TAB */}
          <TabsContent value="courts">
            <div className="text-center mb-8"><h2 className="text-2xl font-bold text-gray-900 mb-1">Nossas Quadras</h2><p className="text-gray-500 text-sm">Disponiveis sabados e domingos</p></div>
            {courtsLoading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[260px] rounded-xl" />)}</div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {courts.filter(c => c.isActive !== false).map(court => (
                  <Card key={court.id} className="overflow-hidden group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                    <div className="aspect-video bg-gray-100 relative overflow-hidden">
                      {courtSlideshow[court.name] ? (
                        <CourtImageSlideshow images={courtSlideshow[court.name]} alt={court.name} />
                      ) : (
                        <img src={court.image || 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400'} alt={court.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                      <Badge className="absolute top-3 right-3 bg-emerald-600 shadow-lg">{formatCurrency(court.pricePerHour)}</Badge>
                    </div>
                    <CardHeader className="pb-2"><CardTitle className="text-base">{court.name}</CardTitle><CardDescription>{getCourtTypeLabel(court.type)} - {getSurfaceLabel(court.surface)}</CardDescription></CardHeader>
                    <CardContent>
                      <div className="flex gap-2 mb-3"><Badge variant="outline" className="text-xs">{getCourtTypeLabel(court.type)}</Badge><Badge variant="secondary" className="text-xs">{getSurfaceLabel(court.surface)}</Badge></div>
                      {courtExtraInfo[court.name] && (
                        <div className="space-y-1.5 mb-3 text-xs">
                          <a href={courtExtraInfo[court.name].mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-start gap-1.5 text-gray-500 hover:text-emerald-600 transition-colors">
                            <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span className="leading-tight">{courtExtraInfo[court.name].address}</span>
                          </a>
                          <a href={courtExtraInfo[court.name].instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-gray-500 hover:text-pink-600 transition-colors">
                            <Instagram className="w-3.5 h-3.5 shrink-0" />
                            <span>{courtExtraInfo[court.name].instagram.replace('https://instagram.com/', '@')}</span>
                          </a>
                        </div>
                      )}
                      <Button className="w-full bg-emerald-600 hover:bg-emerald-700" size="sm" onClick={() => { setSelectedCourt(court); setActiveTab('booking') }}><CalendarDays className="w-4 h-4 mr-1.5" />Reservar</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* MY BOOKINGS TAB */}
          <TabsContent value="bookings">
            {!user ? (
              <Card className="max-w-md mx-auto"><CardContent className="pt-8 pb-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><Users className="w-8 h-8 text-gray-400" /></div>
                <h3 className="text-lg font-semibold mb-1">Faca login</h3><p className="text-gray-500 text-sm mb-4">Voce precisa estar logado para ver suas reservas</p>
                <Button onClick={() => setLoginOpen(true)} className="bg-emerald-600 hover:bg-emerald-700"><LogIn className="w-4 h-4 mr-2" />Entrar</Button>
              </CardContent></Card>
            ) : bookings.length === 0 ? (
              <Card className="max-w-md mx-auto"><CardContent className="pt-8 pb-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><CalendarX className="w-8 h-8 text-gray-400" /></div>
                <h3 className="text-lg font-semibold mb-1">Nenhuma reserva</h3><p className="text-gray-500 text-sm mb-4">Voce ainda nao fez nenhuma reserva</p>
                <Button onClick={() => setActiveTab('booking')} className="bg-emerald-600 hover:bg-emerald-700"><CalendarDays className="w-4 h-4 mr-2" />Fazer Reserva</Button>
              </CardContent></Card>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Minhas Reservas <Badge variant="secondary" className="ml-2">{bookings.length}</Badge></h2>
                  <Button variant="outline" size="sm" onClick={() => user && loadBookings(user.id)}><RefreshCw className="w-4 h-4 mr-1.5" />Atualizar</Button>
                </div>
                {bookings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(booking => (
                  <Card key={booking.id} className={`transition-all ${booking.status === 'CANCELLED' ? 'opacity-60' : 'hover:shadow-md'}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${booking.status === 'CANCELLED' ? 'bg-red-100' : booking.status === 'COMPLETED' ? 'bg-blue-100' : 'bg-emerald-100'}`}>
                            <CalendarDays className={`w-6 h-6 ${booking.status === 'CANCELLED' ? 'text-red-600' : booking.status === 'COMPLETED' ? 'text-blue-600' : 'text-emerald-600'}`} />
                          </div>
                          <div className="min-w-0"><p className="font-semibold text-sm truncate">{booking.court.name}</p><p className="text-xs text-gray-500">{formatDateShort(booking.date)} - {booking.startTime} as {booking.endTime}</p>{booking.notes && <p className="text-xs text-gray-400 mt-0.5 truncate">{booking.notes}</p>}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {getStatusBadge(booking.status)}
                          <span className="font-bold text-emerald-600 text-sm hidden sm:block">{formatCurrency(booking.totalPrice)}</span>
                          {booking.status !== 'CANCELLED' && booking.status !== 'COMPLETED' && (
                            <Tooltip><TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => handleCancelBooking(booking.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 h-8 w-8" disabled={cancellingId === booking.id}>
                                {cancellingId === booking.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                              </Button>
                            </TooltipTrigger><TooltipContent>Cancelar reserva</TooltipContent></Tooltip>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ADMIN TAB */}
          {isAdminRole && (
            <TabsContent value="admin" className="space-y-6">
              <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
                <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-purple-800"><Shield className="w-5 h-5" />Painel de Administracao</CardTitle><CardDescription>{user?.role === 'COURT_ADMIN' ? 'Gerenciamento das suas quadras' : 'Acesso total ao sistema de reservas'}</CardDescription></CardHeader>
              </Card>
              <Tabs value={adminActiveTab} onValueChange={setAdminActiveTab}>
                <div className="overflow-x-auto -mx-4 px-4">
                  <TabsList className="grid grid-cols-5 w-full md:max-w-2xl md:mx-auto h-auto p-1">
                    <TabsTrigger value="dashboard" className="text-[10px] sm:text-sm px-1 sm:px-3 py-2"><BarChart3 className="w-3.5 h-3.5 sm:mr-1 shrink-0" /><span className="hidden sm:inline">Dashboard</span></TabsTrigger>
                    <TabsTrigger value="users" className="text-[10px] sm:text-sm px-1 sm:px-3 py-2"><UserCog className="w-3.5 h-3.5 sm:mr-1 shrink-0" /><span className="hidden sm:inline">Usuarios</span></TabsTrigger>
                    <TabsTrigger value="bookings" className="text-[10px] sm:text-sm px-1 sm:px-3 py-2"><CalendarDays className="w-3.5 h-3.5 sm:mr-1 shrink-0" /><span className="hidden sm:inline">Reservas</span></TabsTrigger>
                    <TabsTrigger value="courts" className="text-[10px] sm:text-sm px-1 sm:px-3 py-2"><MapPin className="w-3.5 h-3.5 sm:mr-1 shrink-0" /><span className="hidden sm:inline">Quadras</span></TabsTrigger>
                    <TabsTrigger value="blocks" className="text-[10px] sm:text-sm px-1 sm:px-3 py-2"><Ban className="w-3.5 h-3.5 sm:mr-1 shrink-0" /><span className="hidden sm:inline">Bloqueios</span></TabsTrigger>
                  </TabsList>
                </div>

                {/* Admin Dashboard */}
                <TabsContent value="dashboard" className="space-y-6">
                  {adminStats ? (<>
                    <div className="grid grid-cols-3 gap-2 md:gap-4">
                      {[
                        { icon: Users, value: adminStats.users.total, label: 'Usuarios', color: 'blue' },
                        { icon: CalendarDays, value: adminStats.bookings.total, label: 'Reservas', color: 'emerald' },
                        { icon: TrendingUp, value: formatCurrency(adminStats.revenue.monthly), label: 'Este Mes', color: 'orange' },
                      ].map(card => {
                        const colors: Record<string, string> = { blue: 'from-blue-50 to-blue-100/50 border-blue-200', emerald: 'from-emerald-50 to-emerald-100/50 border-emerald-200', purple: 'from-purple-50 to-purple-100/50 border-purple-200', orange: 'from-orange-50 to-orange-100/50 border-orange-200' }
                        const iconBg: Record<string, string> = { blue: 'bg-blue-600 shadow-blue-200', emerald: 'bg-emerald-600 shadow-emerald-200', purple: 'bg-purple-600 shadow-purple-200', orange: 'bg-orange-500 shadow-orange-200' }
                        const textColor: Record<string, string> = { blue: 'text-blue-900', emerald: 'text-emerald-900', purple: 'text-purple-900', orange: 'text-orange-900' }
                        const labelColor: Record<string, string> = { blue: 'text-blue-600', emerald: 'text-emerald-600', purple: 'text-purple-600', orange: 'text-orange-600' }
                        return (
                          <Card key={card.label} className={`bg-gradient-to-br ${colors[card.color]}`}>
                            <CardContent className="p-3 sm:p-4"><div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3">
                              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shadow-lg ${iconBg[card.color]}`}><card.icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" /></div>
                              <div className="text-center sm:text-left"><p className={`text-base sm:text-xl font-bold ${textColor[card.color]}`}>{card.value}</p><p className={`text-[10px] sm:text-xs ${labelColor[card.color]}`}>{card.label}</p></div>
                            </div></CardContent>
                          </Card>
                        )
                      })}
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                      <Card><CardHeader className="pb-2"><CardTitle className="text-base">Status das Reservas</CardTitle></CardHeader><CardContent>
                        {bookingStatusData.length > 0 ? (
                          <ChartContainer config={bookingStatusChartConfig} className="h-[200px] w-full">
                            <PieChart><Pie data={bookingStatusData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">{bookingStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}</Pie><ChartTooltip content={<ChartTooltipContent />} /></PieChart>
                          </ChartContainer>
                        ) : <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">Sem dados</div>}
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {[{ l: 'Confirmadas', v: adminStats.bookings.confirmed, c: 'bg-emerald-600' }, { l: 'Pendentes', v: adminStats.bookings.pending, c: 'bg-amber-500' }, { l: 'Concluidas', v: adminStats.bookings.completed, c: 'bg-blue-600' }, { l: 'Canceladas', v: adminStats.bookings.cancelled, c: 'bg-red-600' }].map(i => (
                            <div key={i.l} className="flex items-center gap-2"><div className={`w-2.5 h-2.5 rounded-full ${i.c}`} /><span className="text-xs text-gray-600">{i.l}</span><span className="text-xs font-bold ml-auto">{i.v}</span></div>
                          ))}
                        </div>
                      </CardContent></Card>
                      <Card><CardHeader className="pb-2"><CardTitle className="text-base">Receita por Quadra</CardTitle></CardHeader><CardContent>
                        {courtRevenueData.length > 0 ? (
                          <ChartContainer config={courtRevenueChartConfig} className="h-[200px] w-full">
                            <BarChart data={courtRevenueData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${v}`} /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="revenue" fill="#059669" radius={[6, 6, 0, 0]} /></BarChart>
                          </ChartContainer>
                        ) : <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">Sem dados</div>}
                        <div className="space-y-2 mt-3">
                          {adminStats.bookingsByCourt.map(item => (
                            <div key={item.courtId}><div className="flex justify-between items-center text-xs mb-1"><span className="text-gray-600 truncate mr-2">{item.courtName}</span><span className="font-bold text-emerald-600 shrink-0">{formatCurrency(item.revenue)}</span></div>
                            <Progress value={adminStats.revenue.total > 0 ? (item.revenue / adminStats.revenue.total) * 100 : 0} className="h-1.5 bg-emerald-100" /></div>
                          ))}
                        </div>
                      </CardContent></Card>
                    </div>
                    <Card><CardHeader className="pb-2"><CardTitle className="text-base">Jogadores por Nivel</CardTitle></CardHeader><CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        {adminStats.users.byLevel.map(item => {
                          const c: Record<string, { l: string; color: string; bg: string }> = { A: { l: 'Avancado', color: 'bg-emerald-600', bg: 'bg-emerald-50' }, B: { l: 'Intermediario', color: 'bg-blue-600', bg: 'bg-blue-50' }, C: { l: 'Iniciante', color: 'bg-orange-500', bg: 'bg-orange-50' } }
                          const cfg = c[item.level] || c.C
                          const pct = adminStats.users.players > 0 ? (item.count / adminStats.users.players) * 100 : 0
                          return <div key={item.level} className={`${cfg.bg} rounded-xl p-4 text-center`}><div className="text-2xl font-bold">{item.count}</div><div className="text-xs text-gray-600 mb-2">{item.level} - {cfg.l}</div><Progress value={pct} className="h-1.5" /><div className="text-[10px] text-gray-400 mt-1">{Math.round(pct)}%</div></div>
                        })}
                      </div>
                    </CardContent></Card>
                    <Card><CardHeader className="pb-2"><CardTitle className="text-base">Reservas Recentes</CardTitle></CardHeader><CardContent><div className="space-y-2">
                      {adminStats.recentBookings.map(booking => (
                        <div key={booking.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50/80 hover:bg-gray-100/80 transition-colors">
                          <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center shrink-0"><span className="text-white text-xs font-bold">{booking.user.name.charAt(0)}</span></div>
                          <div><p className="font-medium text-sm">{booking.user.name}</p><p className="text-xs text-gray-500">{booking.court.name} - {formatDateShort(booking.date)} - {booking.startTime}h</p></div></div>
                          <div className="flex items-center gap-2">{getStatusBadge(booking.status)}<span className="text-sm font-bold text-emerald-600 hidden sm:block">{formatCurrency(booking.totalPrice)}</span></div>
                        </div>
                      ))}
                    </div></CardContent></Card>
                  </>) : (
                    <div className="space-y-6"><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[90px] rounded-xl" />)}</div><div className="grid md:grid-cols-2 gap-6"><Skeleton className="h-[350px] rounded-xl" /><Skeleton className="h-[350px] rounded-xl" /></div></div>
                  )}
                </TabsContent>

                {/* Admin Users */}
                <TabsContent value="users" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Gerenciar Usuarios <Badge variant="secondary">{adminUsers.length}</Badge></h3>
                    {user?.role === 'ADMIN' && <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
                      <DialogTrigger asChild><Button className="bg-emerald-600 hover:bg-emerald-700" size="sm"><Plus className="w-4 h-4 mr-1.5" />Novo Usuario</Button></DialogTrigger>
                      <DialogContent><DialogHeader><DialogTitle>Criar Novo Usuario</DialogTitle><DialogDescription>Crie um jogador, administrador de quadra ou administrador</DialogDescription></DialogHeader>
                        <div className="space-y-4 mt-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Username *</Label><Input value={newUserForm.username} onChange={e => setNewUserForm({ ...newUserForm, username: e.target.value })} placeholder="joao.silva" /></div>
                            <div className="space-y-2"><Label>Senha *</Label><Input type="password" value={newUserForm.password} onChange={e => setNewUserForm({ ...newUserForm, password: e.target.value })} placeholder="Min. 6 caracteres" /></div>
                          </div>
                          <div className="space-y-2"><Label>Nome Completo *</Label><Input value={newUserForm.name} onChange={e => setNewUserForm({ ...newUserForm, name: e.target.value })} placeholder="João da Silva" /></div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Email</Label><Input value={newUserForm.email} onChange={e => setNewUserForm({ ...newUserForm, email: e.target.value })} placeholder="email@exemplo.com" /></div>
                            <div className="space-y-2"><Label>Telefone</Label><Input value={newUserForm.phone} onChange={e => setNewUserForm({ ...newUserForm, phone: e.target.value })} placeholder="(12) 99999-9999" /></div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Função</Label><Select value={newUserForm.role} onValueChange={v => setNewUserForm({ ...newUserForm, role: v, level: v === 'PLAYER' ? 'C' : '', courtIds: v === 'COURT_ADMIN' ? newUserForm.courtIds : [] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PLAYER">Jogador</SelectItem><SelectItem value="COURT_ADMIN">Admin Quadra</SelectItem><SelectItem value="ADMIN">Administrador</SelectItem></SelectContent></Select></div>
                            {newUserForm.role === 'PLAYER' && <div className="space-y-2"><Label>Nivel</Label><Select value={newUserForm.level} onValueChange={v => setNewUserForm({ ...newUserForm, level: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="A">A - Avancado</SelectItem><SelectItem value="B">B - Intermediario</SelectItem><SelectItem value="C">C - Iniciante</SelectItem></SelectContent></Select></div>}
                          </div>
                          {newUserForm.role === 'COURT_ADMIN' && (
                            <div className="space-y-2">
                              <Label>Quadras Administradas</Label>
                              <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                                {courts.filter(c => c.isActive !== false).map(court => (
                                  <label key={court.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded">
                                    <input type="checkbox" checked={newUserForm.courtIds.includes(court.id)} onChange={e => {
                                      setNewUserForm({ ...newUserForm, courtIds: e.target.checked ? [...newUserForm.courtIds, court.id] : newUserForm.courtIds.filter(id => id !== court.id) })
                                    }} className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                                    <span className="text-sm">{court.name}</span>
                                    <span className="text-xs text-gray-400 ml-auto">{getCourtTypeLabel(court.type)}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                          <Button onClick={handleAddUser} className="w-full bg-emerald-600 hover:bg-emerald-700"><UserPlus className="w-4 h-4 mr-2" />Criar Usuario</Button>
                        </div>
                      </DialogContent>
                    </Dialog>}
                  </div>
                  {adminLoading ? <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-[80px] rounded-xl" />)}</div> : (
                    <div className="space-y-3">{adminUsers.map(u => (
                      <Card key={u.id} className="hover:shadow-sm transition-shadow"><CardContent className="p-3 md:p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-emerald-600 flex items-center justify-center shrink-0"><span className="text-white font-bold">{u.name.charAt(0)}</span></div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap"><p className="font-semibold text-sm truncate">{u.name}</p>{u.role === 'ADMIN' && <Badge className="bg-purple-600 text-white text-[10px] px-1.5">Admin</Badge>}{u.role === 'COURT_ADMIN' && <Badge className="bg-orange-500 text-white text-[10px] px-1.5 truncate max-w-[150px] md:max-w-none">{getCourtAdminLabel(u.adminCourtIds)}</Badge>}</div>
                            {u.username && <p className="text-xs text-gray-400 font-mono">@{u.username}</p>}
                            <div className="flex items-center gap-2 mt-0.5">{u.level && getLevelBadge(u.level)}<span className="text-xs text-gray-400">{u._count?.bookings || 0} reservas</span></div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button variant="outline" size="sm" className="h-8 px-2 sm:px-3" onClick={() => { setEditUserForm({ ...u, courtIds: u.adminCourtIds || [], password: undefined }); setEditUserOpen(true) }}><Edit className="w-3.5 h-3.5 sm:mr-1" /><span className="hidden sm:inline">Editar</span></Button>
                            {u.id !== user?.id && <Button variant="destructive" size="sm" className="h-8 px-2" onClick={() => handleDeleteUser(u.id)}><Trash2 className="w-3.5 h-3.5" /></Button>}
                          </div>
                        </div>
                      </CardContent></Card>
                    ))}</div>
                  )}
                </TabsContent>

                {/* Admin Bookings */}
                <TabsContent value="bookings" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Gerenciar Reservas <Badge variant="secondary">{adminBookings.length}</Badge></h3>
                    <Button variant="outline" size="sm" onClick={loadAdminBookings}><RefreshCw className="w-4 h-4 mr-1.5" />Atualizar</Button>
                  </div>
                  {adminLoading ? <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-[90px] rounded-xl" />)}</div> : (
                    <div className="space-y-3">{adminBookings.map(booking => (
                      <Card key={booking.id} className="hover:shadow-sm transition-shadow"><CardContent className="p-3 md:p-4"><div className="flex items-center justify-between gap-2 md:gap-3">
                        <div className="flex items-center gap-2 md:gap-3 min-w-0">
                          <div className="h-9 w-9 rounded-full bg-emerald-600 flex items-center justify-center shrink-0"><span className="text-white text-xs font-bold">{booking.user.name.charAt(0)}</span></div>
                          <div className="min-w-0"><p className="font-semibold text-sm">{booking.user.name}</p><p className="text-xs text-gray-500">{booking.court.name}</p><p className="text-xs text-gray-600">{formatDateShort(booking.date)} - {booking.startTime} as {booking.endTime}</p><div className="flex items-center gap-2 mt-0.5 sm:hidden">{getStatusBadge(booking.status)}<span className="text-xs font-bold text-emerald-600">{formatCurrency(booking.totalPrice)}</span></div></div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right hidden sm:block">{getStatusBadge(booking.status)}<p className="font-bold text-emerald-600 text-sm mt-1">{formatCurrency(booking.totalPrice)}</p></div>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => { setEditBookingForm(booking); setEditBookingOpen(true) }}><Edit className="w-3.5 h-3.5" /></Button>
                            <Button variant="destructive" size="sm" className="h-7 px-2" onClick={() => handleDeleteBooking(booking.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </div>
                      </div></CardContent></Card>
                    ))}</div>
                  )}
                </TabsContent>

                {/* Admin Courts */}
                <TabsContent value="courts" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Gerenciar Quadras <Badge variant="secondary">{adminCourts.length}</Badge></h3>
                    {user?.role === 'ADMIN' && <Dialog open={addCourtOpen} onOpenChange={setAddCourtOpen}>
                      <DialogTrigger asChild><Button className="bg-emerald-600 hover:bg-emerald-700" size="sm"><Plus className="w-4 h-4 mr-1.5" />Nova Quadra</Button></DialogTrigger>
                      <DialogContent><DialogHeader><DialogTitle>Adicionar Nova Quadra</DialogTitle></DialogHeader>
                        <div className="space-y-4 mt-4">
                          <div className="space-y-2"><Label>Nome</Label><Input value={newCourtForm.name} onChange={e => setNewCourtForm({ ...newCourtForm, name: e.target.value })} placeholder="Nome da quadra" /></div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Tipo</Label><Select value={newCourtForm.type} onValueChange={v => setNewCourtForm({ ...newCourtForm, type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="INDOOR">Coberta</SelectItem><SelectItem value="OUTDOOR">Aberta</SelectItem></SelectContent></Select></div>
                            <div className="space-y-2"><Label>Superficie</Label><Select value={newCourtForm.surface} onValueChange={v => setNewCourtForm({ ...newCourtForm, surface: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="CLAY">Saibro</SelectItem><SelectItem value="HARD">Rigida</SelectItem><SelectItem value="GRASS">Grama</SelectItem></SelectContent></Select></div>
                          </div>
                          <div className="space-y-2"><Label>Preco por Jogo (R$)</Label><Input type="number" value={newCourtForm.pricePerHour} onChange={e => setNewCourtForm({ ...newCourtForm, pricePerHour: e.target.value })} /></div>
                          <div className="space-y-2"><Label>URL da Imagem (opcional)</Label><Input value={newCourtForm.image} onChange={e => setNewCourtForm({ ...newCourtForm, image: e.target.value })} placeholder="https://..." /></div>
                          <Button onClick={handleAddCourt} className="w-full bg-emerald-600 hover:bg-emerald-700">Criar Quadra</Button>
                        </div>
                      </DialogContent>
                    </Dialog>}
                  </div>
                  {adminLoading ? <div className="grid md:grid-cols-2 gap-4">{[1, 2].map(i => <Skeleton key={i} className="h-[100px] rounded-xl" />)}</div> : (
                    <div className="grid md:grid-cols-2 gap-4">{adminCourts.map(court => (
                      <Card key={court.id} className={`hover:shadow-sm transition-shadow ${court.isActive === false ? 'opacity-60' : ''}`}><CardContent className="p-3 sm:p-4"><div className="flex items-start gap-2 sm:gap-3">
                        <div className="w-14 h-12 sm:w-16 sm:h-14 bg-gray-100 rounded-lg overflow-hidden shrink-0"><img src={court.image || 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=200'} alt={court.name} className="w-full h-full object-cover" /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5 min-w-0"><p className="font-semibold text-sm truncate">{court.name}</p>{court.isActive === false && <Badge variant="destructive" className="text-[10px]">Inativa</Badge>}</div>
                            <div className="flex gap-1 shrink-0">
                              <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => { setEditCourtForm(court); setEditCourtOpen(true) }}><Edit className="w-3.5 h-3.5" /></Button>
                              {user?.role === 'ADMIN' && <Button variant="destructive" size="sm" className="h-7 px-2" onClick={() => handleDeleteCourt(court.id)}><Trash2 className="w-3.5 h-3.5" /></Button>}
                            </div>
                          </div>
                          <p className="text-xs text-gray-500">{getCourtTypeLabel(court.type)} - {getSurfaceLabel(court.surface)}</p>
                          {court.courtAdmins && court.courtAdmins.length > 0 ? (
                            <p className="text-xs text-indigo-600 mt-0.5 flex items-center gap-1"><Shield className="w-3 h-3" />{court.courtAdmins.map(a => a.name).join(', ')}</p>
                          ) : (
                            <p className="text-xs text-gray-400 mt-0.5">Sem administrador</p>
                          )}
                          <div className="flex items-center gap-3 mt-1.5 text-xs"><span className="font-bold text-emerald-600">{formatCurrency(court.pricePerHour)}</span><span className="text-gray-400">{court.totalBookings} reservas</span><span className="text-gray-400">{formatCurrency(court.totalRevenue || 0)}</span></div>
                        </div>
                      </div></CardContent></Card>
                    ))}</div>
                  )}
                </TabsContent>

                {/* Admin Blocks */}
                <TabsContent value="blocks" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Bloqueio de Horarios <Badge variant="secondary">{adminBlocks.length}</Badge></h3>
                    <Dialog open={addBlockOpen} onOpenChange={setAddBlockOpen}>
                      <DialogTrigger asChild><Button className="bg-red-600 hover:bg-red-700" size="sm"><Plus className="w-4 h-4 mr-1.5" />Novo Bloqueio</Button></DialogTrigger>
                      <DialogContent><DialogHeader><DialogTitle>Bloquear Horario</DialogTitle><DialogDescription>Bloqueie horários em uma quadra para manutenção, limpeza ou eventos</DialogDescription></DialogHeader>
                        <div className="space-y-4 mt-4">
                          <div className="space-y-2">
                            <Label>Quadra *</Label>
                            <Select value={newBlockForm.courtId} onValueChange={v => setNewBlockForm({ ...newBlockForm, courtId: v, startTime: '', endTime: '' })}>
                              <SelectTrigger><SelectValue placeholder="Selecione a quadra" /></SelectTrigger>
                              <SelectContent>{courts.filter(c => c.isActive !== false).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Data * <span className="text-gray-400 font-normal">(fins de semana)</span></Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start text-left font-normal">
                                  <CalendarDays className="mr-2 h-4 w-4 text-red-600" />
                                  {newBlockForm.date ? formatDateFull(newBlockForm.date) : 'Selecione a data'}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={newBlockForm.date ? new Date(newBlockForm.date + 'T12:00:00') : undefined} onSelect={(date) => { if (date) setNewBlockForm({ ...newBlockForm, date: date.toISOString().split('T')[0], startTime: '', endTime: '' }) }} disabled={isDateDisabled} />
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" id="allDay" checked={newBlockForm.allDay} onChange={e => setNewBlockForm({ ...newBlockForm, allDay: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500" />
                            <Label htmlFor="allDay">Bloquear dia inteiro</Label>
                          </div>
                          {!newBlockForm.allDay && newBlockForm.courtId && newBlockForm.date && blockCourtSlots.length > 0 && (
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Inicio *</Label>
                                  <Select value={newBlockForm.startTime} onValueChange={v => setNewBlockForm({ ...newBlockForm, startTime: v, endTime: '' })}>
                                    <SelectTrigger><SelectValue placeholder="Horario" /></SelectTrigger>
                                    <SelectContent>{blockCourtSlots.map(s => <SelectItem key={s.startTime} value={s.startTime}>{s.startTime}</SelectItem>)}</SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>Fim *</Label>
                                  <Select value={newBlockForm.endTime} onValueChange={v => setNewBlockForm({ ...newBlockForm, endTime: v })}>
                                    <SelectTrigger><SelectValue placeholder="Horario" /></SelectTrigger>
                                    <SelectContent>{blockCourtSlots.filter(s => s.startTime >= (newBlockForm.startTime || '')).map(s => <SelectItem key={s.endTime} value={s.endTime}>{s.endTime}</SelectItem>)}</SelectContent>
                                  </Select>
                                </div>
                              </div>
                          )}
                          <div className="space-y-2">
                            <Label>Motivo (opcional)</Label>
                            <Input value={newBlockForm.reason} onChange={e => setNewBlockForm({ ...newBlockForm, reason: e.target.value })} placeholder="Ex: Manutenção, Limpeza, Evento..." />
                          </div>
                          <Button onClick={handleAddBlock} className="w-full bg-red-600 hover:bg-red-700"><Ban className="w-4 h-4 mr-2" />Bloquear Horario</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  {adminLoading ? <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-[80px] rounded-xl" />)}</div> : adminBlocks.length === 0 ? (
                    <Card><CardContent className="pt-8 pb-8 text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><Ban className="w-8 h-8 text-gray-400" /></div>
                      <h3 className="text-lg font-semibold mb-1">Nenhum bloqueio ativo</h3>
                      <p className="text-gray-500 text-sm">Crie bloqueios para impedir reservas em horários específicos</p>
                    </CardContent></Card>
                  ) : (
                    <div className="space-y-3">{adminBlocks.map(block => (
                      <Card key={block.id} className="border-red-100 hover:shadow-sm transition-shadow"><CardContent className="p-4"><div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0"><Lock className="w-5 h-5 text-red-600" /></div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm">{block.court.name}</p>
                            <p className="text-xs text-gray-600">{formatDateShort(block.date)} · {block.startTime} - {block.endTime}</p>
                            {block.reason && <p className="text-xs text-red-600 mt-0.5">{block.reason}</p>}
                            <p className="text-[10px] text-gray-400 mt-0.5">Bloqueado por {block.admin.name}</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteBlock(block.id)} className="shrink-0 text-red-600 border-red-200 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 mr-1" />Remover</Button>
                      </div></CardContent></Card>
                    ))}</div>
                  )}
                </TabsContent>
              </Tabs>
            </TabsContent>
          )}
        </Tabs>
      </section>

      {/* Edit Dialogs */}
      <Dialog open={editUserOpen} onOpenChange={setEditUserOpen}><DialogContent><DialogHeader><DialogTitle>Editar Usuario</DialogTitle></DialogHeader>
        {editUserForm && <div className="space-y-4 mt-4">
          <div className="space-y-2"><Label>Username</Label><Input value={editUserForm.username || ''} onChange={e => setEditUserForm({ ...editUserForm, username: e.target.value })} className="font-mono" /></div>
          <div className="space-y-2"><Label>Nome</Label><Input value={editUserForm.name} onChange={e => setEditUserForm({ ...editUserForm, name: e.target.value })} /></div>
          <div className="space-y-2"><Label>Email</Label><Input value={editUserForm.email} onChange={e => setEditUserForm({ ...editUserForm, email: e.target.value })} /></div>
          <div className="space-y-2"><Label>Telefone</Label><Input value={editUserForm.phone || ''} onChange={e => setEditUserForm({ ...editUserForm, phone: e.target.value })} /></div>
          <div className="space-y-2"><Label>Nova Senha</Label><Input type="password" placeholder="Deixe vazio para manter a atual" value={editUserForm.password || ''} onChange={e => setEditUserForm({ ...editUserForm, password: e.target.value || undefined })} /></div>
          <div className="grid grid-cols-2 gap-4">
            {user?.role === 'ADMIN' && <div className="space-y-2"><Label>Funcao</Label><Select value={editUserForm.role} onValueChange={v => setEditUserForm({ ...editUserForm, role: v, level: (v === 'ADMIN' || v === 'COURT_ADMIN') ? null : editUserForm.level, courtIds: v === 'COURT_ADMIN' ? (editUserForm.courtIds || []) : [] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PLAYER">Jogador</SelectItem><SelectItem value="COURT_ADMIN">Admin Quadra</SelectItem><SelectItem value="ADMIN">Administrador</SelectItem></SelectContent></Select></div>}
            {editUserForm.role === 'PLAYER' && <div className="space-y-2"><Label>Nivel</Label><Select value={editUserForm.level || 'C'} onValueChange={v => setEditUserForm({ ...editUserForm, level: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="A">A - Avancado</SelectItem><SelectItem value="B">B - Intermediario</SelectItem><SelectItem value="C">C - Iniciante</SelectItem></SelectContent></Select></div>}
          </div>
          {editUserForm.role === 'COURT_ADMIN' && (
            <div className="space-y-2">
              <Label>Quadras Administradas</Label>
              <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                {courts.length === 0 ? <p className="text-sm text-gray-400">Nenhuma quadra disponivel</p> : courts.filter(c => c.isActive !== false).map(court => (
                  <label key={court.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded">
                    <input type="checkbox" checked={(editUserForm.courtIds || []).includes(court.id)} onChange={e => {
                      const ids = editUserForm.courtIds || []
                      setEditUserForm({ ...editUserForm, courtIds: e.target.checked ? [...ids, court.id] : ids.filter(id => id !== court.id) })
                    }} className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                    <span className="text-sm">{court.name}</span>
                    <span className="text-xs text-gray-400 ml-auto">{getCourtTypeLabel(court.type)}</span>
                  </label>
                ))}
              </div>
              {(editUserForm.courtIds || []).length === 0 && <p className="text-xs text-amber-600">Selecione ao menos uma quadra</p>}
            </div>
          )}
          <Button onClick={handleUpdateUser} className="w-full bg-emerald-600 hover:bg-emerald-700">Salvar Alteracoes</Button>
        </div>}
      </DialogContent></Dialog>

      <Dialog open={editBookingOpen} onOpenChange={setEditBookingOpen}><DialogContent><DialogHeader><DialogTitle>Editar Reserva</DialogTitle></DialogHeader>
        {editBookingForm && <div className="space-y-4 mt-4">
          <div className="p-3 bg-gray-50 rounded-xl"><p className="font-medium">{editBookingForm.user.name}</p><p className="text-sm text-gray-500">{editBookingForm.court.name} - {formatDateShort(editBookingForm.date)} - {editBookingForm.startTime}h</p></div>
          <div className="space-y-2"><Label>Status</Label><Select value={editBookingForm.status} onValueChange={v => setEditBookingForm({ ...editBookingForm, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PENDING">Pendente</SelectItem><SelectItem value="CONFIRMED">Confirmada</SelectItem><SelectItem value="COMPLETED">Concluida</SelectItem><SelectItem value="CANCELLED">Cancelada</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label>Observacoes</Label><Textarea value={editBookingForm.notes || ''} onChange={e => setEditBookingForm({ ...editBookingForm, notes: e.target.value })} /></div>
          <Button onClick={handleUpdateBooking} className="w-full bg-emerald-600 hover:bg-emerald-700">Salvar Alteracoes</Button>
        </div>}
      </DialogContent></Dialog>

      <Dialog open={editCourtOpen} onOpenChange={setEditCourtOpen}><DialogContent><DialogHeader><DialogTitle>Editar Quadra</DialogTitle></DialogHeader>
        {editCourtForm && <div className="space-y-4 mt-4">
          <div className="space-y-2"><Label>Nome</Label><Input value={editCourtForm.name} onChange={e => setEditCourtForm({ ...editCourtForm, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Tipo</Label><Select value={editCourtForm.type} onValueChange={v => setEditCourtForm({ ...editCourtForm, type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="INDOOR">Coberta</SelectItem><SelectItem value="OUTDOOR">Aberta</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Superficie</Label><Select value={editCourtForm.surface} onValueChange={v => setEditCourtForm({ ...editCourtForm, surface: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="CLAY">Saibro</SelectItem><SelectItem value="HARD">Rigida</SelectItem><SelectItem value="GRASS">Grama</SelectItem></SelectContent></Select></div>
          </div>
          <div className="space-y-2"><Label>Preco por Jogo (R$)</Label><Input type="number" value={editCourtForm.pricePerHour} onChange={e => setEditCourtForm({ ...editCourtForm, pricePerHour: parseFloat(e.target.value) })} /></div>
          <div className="space-y-2"><Label>URL da Imagem</Label><Input value={editCourtForm.image || ''} onChange={e => setEditCourtForm({ ...editCourtForm, image: e.target.value })} /></div>
          <div className="flex items-center gap-2"><input type="checkbox" id="isActive" checked={editCourtForm.isActive !== false} onChange={e => setEditCourtForm({ ...editCourtForm, isActive: e.target.checked })} className="rounded" /><Label htmlFor="isActive">Quadra ativa</Label></div>
          <Button onClick={handleUpdateCourt} className="w-full bg-emerald-600 hover:bg-emerald-700">Salvar Alteracoes</Button>
        </div>}
      </DialogContent></Dialog>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <img src="/rgta-logo.png" alt="RGTA" className="w-8 h-8 rounded-full" />
            <span className="text-white font-bold">RGTA - Caraguatatuba</span>
          </div>
          <p className="text-sm">Sistema de Reservas de Quadras de Tenis</p>
          <p className="text-xs mt-2 text-gray-500">2026 RGTA - Caraguatatuba. Todos os direitos reservados.</p>
          <p className="text-xs mt-1 text-gray-600">Criado por Leandro Neves</p>
        </div>
      </footer>
    </div>
    </TooltipProvider>
  )
}
