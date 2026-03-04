import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { BookingStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const courtId = searchParams.get('courtId')

    const where: Record<string, unknown> = {
      status: { notIn: [BookingStatus.CANCELLED] }
    }
    
    if (date) where.date = date
    if (courtId) where.courtId = courtId

    const bookings = await db.booking.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            level: true
          }
        },
        court: {
          select: {
            id: true,
            name: true,
            type: true,
            surface: true
          }
        }
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' }
      ]
    })

    return NextResponse.json(bookings)
  } catch (error) {
    console.error('Get public bookings error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar reservas públicas' },
      { status: 500 }
    )
  }
}
