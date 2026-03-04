import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')

    if (!date) {
      return NextResponse.json({ error: 'date é obrigatório' }, { status: 400 })
    }

    const blocks = await db.blockedSlot.findMany({
      where: { date },
      select: {
        id: true,
        courtId: true,
        date: true,
        startTime: true,
        endTime: true,
        reason: true,
        court: { select: { id: true, name: true } }
      },
      orderBy: [{ startTime: 'asc' }]
    })

    return NextResponse.json(blocks)
  } catch (error) {
    console.error('Get public blocks error:', error)
    return NextResponse.json({ error: 'Erro ao buscar bloqueios' }, { status: 500 })
  }
}
