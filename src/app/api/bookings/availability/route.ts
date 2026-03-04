import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { BookingStatus } from '@prisma/client'

// Máximo de reservas por horário
const MAX_BOOKINGS_PER_SLOT = 2

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const courtId = searchParams.get('courtId')
    const date = searchParams.get('date')

    if (!courtId || !date) {
      return NextResponse.json(
        { error: 'courtId e date são obrigatórios' },
        { status: 400 }
      )
    }

    // Determinar dia da semana a partir da data
    const dateObj = new Date(date + 'T12:00:00')
    const dayOfWeek = dateObj.getDay() // 0=Dom, 6=Sab

    // Buscar slots configurados para esta quadra e dia da semana
    const courtSlots = await db.courtSlot.findMany({
      where: { courtId, dayOfWeek },
      orderBy: { startTime: 'asc' }
    })

    if (courtSlots.length === 0) {
      return NextResponse.json([])
    }

    // Buscar reservas do dia com informações do usuário
    const bookings = await db.booking.findMany({
      where: {
        courtId,
        date,
        status: { notIn: [BookingStatus.CANCELLED] }
      },
      select: {
        startTime: true,
        endTime: true,
        user: {
          select: {
            id: true,
            name: true,
            level: true
          }
        }
      }
    })

    // Buscar bloqueios para esta quadra e data
    const blocks = await db.blockedSlot.findMany({
      where: { courtId, date },
      select: { startTime: true, endTime: true, reason: true }
    })

    // Retornar disponibilidade para cada slot configurado
    const availability: TimeSlot[] = courtSlots.map(slot => {
      // Encontrar reservas que se sobrepõem com este slot
      const slotBookings = bookings.filter(b =>
        b.startTime < slot.endTime && b.endTime > slot.startTime
      )
      const reservedBy: SlotUser[] = slotBookings.map(b => ({
        id: b.user.id,
        name: b.user.name,
        level: b.user.level
      }))

      // Verificar se algum bloqueio se sobrepõe com este slot
      const overlappingBlock = blocks.find(b =>
        b.startTime < slot.endTime && b.endTime > slot.startTime
      )
      const isBlocked = !!overlappingBlock

      const spotsLeft = MAX_BOOKINGS_PER_SLOT - reservedBy.length
      return {
        time: slot.startTime,
        endTime: slot.endTime,
        available: isBlocked ? false : spotsLeft > 0,
        spotsLeft: isBlocked ? 0 : spotsLeft,
        maxSpots: MAX_BOOKINGS_PER_SLOT,
        reservedBy,
        blocked: isBlocked || undefined,
        blockReason: overlappingBlock?.reason || (isBlocked ? 'Bloqueado' : undefined)
      }
    })

    return NextResponse.json(availability)
  } catch (error) {
    console.error('Get availability error:', error)
    return NextResponse.json(
      { error: 'Erro ao verificar disponibilidade' },
      { status: 500 }
    )
  }
}
