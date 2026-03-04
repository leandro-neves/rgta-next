import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const courtId = searchParams.get('courtId')
  const dayOfWeek = searchParams.get('dayOfWeek')

  if (!courtId || dayOfWeek === null) {
    return NextResponse.json({ error: 'courtId e dayOfWeek são obrigatórios' }, { status: 400 })
  }

  const slots = await db.courtSlot.findMany({
    where: { courtId, dayOfWeek: parseInt(dayOfWeek) },
    select: { startTime: true, endTime: true },
    orderBy: { startTime: 'asc' }
  })

  return NextResponse.json(slots)
}
