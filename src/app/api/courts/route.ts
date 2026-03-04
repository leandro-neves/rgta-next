import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { CourtType, SurfaceType } from '@prisma/client'

export async function GET() {
  try {
    const courts = await db.court.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    })
    console.log('Courts loaded:', courts.length)

    return NextResponse.json(courts)
  } catch (error) {
    console.error('Get courts error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar quadras' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    const court = await db.court.create({
      data: {
        name: data.name,
        type: data.type as CourtType || CourtType.OUTDOOR,
        surface: data.surface as SurfaceType || SurfaceType.CLAY,
        pricePerHour: parseFloat(data.pricePerHour) || 60,
        image: data.image || null,
        isActive: true
      }
    })

    return NextResponse.json(court)
  } catch (error) {
    console.error('Create court error:', error)
    return NextResponse.json(
      { error: 'Erro ao criar quadra' },
      { status: 500 }
    )
  }
}
