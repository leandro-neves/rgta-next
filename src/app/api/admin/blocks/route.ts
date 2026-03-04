import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Listar bloqueios
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const adminId = searchParams.get('adminId')
    const courtId = searchParams.get('courtId')
    const date = searchParams.get('date')

    if (!adminId) {
      return NextResponse.json({ error: 'ID do administrador é obrigatório' }, { status: 400 })
    }

    const admin = await db.user.findUnique({ where: { id: adminId } })
    if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'COURT_ADMIN')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const where: Record<string, unknown> = {}

    // COURT_ADMIN só vê bloqueios das suas quadras
    if (admin.role === 'COURT_ADMIN') {
      const adminCourts = await db.courtAdmin.findMany({
        where: { userId: adminId },
        select: { courtId: true }
      })
      where.courtId = { in: adminCourts.map(ac => ac.courtId) }
    }

    if (courtId) where.courtId = courtId
    if (date) where.date = date

    const blocks = await db.blockedSlot.findMany({
      where,
      include: {
        court: { select: { id: true, name: true } },
        admin: { select: { id: true, name: true } }
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }]
    })

    return NextResponse.json(blocks)
  } catch (error) {
    console.error('Erro ao listar bloqueios:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// POST - Criar bloqueio
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { adminId, courtId, date, startTime, endTime, reason } = body

    if (!adminId || !courtId || !date || !startTime || !endTime) {
      return NextResponse.json({ error: 'Campos obrigatórios: adminId, courtId, date, startTime, endTime' }, { status: 400 })
    }

    const admin = await db.user.findUnique({ where: { id: adminId } })
    if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'COURT_ADMIN')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // COURT_ADMIN só bloqueia suas quadras
    if (admin.role === 'COURT_ADMIN') {
      const isAdminOfCourt = await db.courtAdmin.findUnique({
        where: { userId_courtId: { userId: adminId, courtId } }
      })
      if (!isAdminOfCourt) {
        return NextResponse.json({ error: 'Você só pode bloquear quadras que administra' }, { status: 403 })
      }
    }

    // Validar horários contra slots configurados da quadra
    const dateObj = new Date(date + 'T12:00:00')
    const dayOfWeek = dateObj.getDay()
    const courtSlots = await db.courtSlot.findMany({
      where: { courtId, dayOfWeek },
      orderBy: { startTime: 'asc' }
    })

    if (courtSlots.length === 0) {
      return NextResponse.json({ error: 'Nenhum horário configurado para esta quadra neste dia' }, { status: 400 })
    }

    if (startTime >= endTime) {
      return NextResponse.json({ error: 'Horário de início deve ser anterior ao de fim' }, { status: 400 })
    }

    // Verificar se o range do bloqueio cobre pelo menos um slot
    const coversSlot = courtSlots.some(s => s.startTime < endTime && s.endTime > startTime)
    if (!coversSlot) {
      return NextResponse.json({ error: 'O bloqueio não cobre nenhum horário configurado' }, { status: 400 })
    }

    const block = await db.blockedSlot.create({
      data: {
        courtId,
        date,
        startTime,
        endTime,
        reason: reason || null,
        blockedBy: adminId
      },
      include: {
        court: { select: { id: true, name: true } },
        admin: { select: { id: true, name: true } }
      }
    })

    return NextResponse.json(block)
  } catch (error) {
    console.error('Erro ao criar bloqueio:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// DELETE - Remover bloqueio
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const adminId = searchParams.get('adminId')
    const blockId = searchParams.get('blockId')

    if (!adminId || !blockId) {
      return NextResponse.json({ error: 'adminId e blockId são obrigatórios' }, { status: 400 })
    }

    const admin = await db.user.findUnique({ where: { id: adminId } })
    if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'COURT_ADMIN')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const block = await db.blockedSlot.findUnique({ where: { id: blockId } })
    if (!block) {
      return NextResponse.json({ error: 'Bloqueio não encontrado' }, { status: 404 })
    }

    // COURT_ADMIN só pode remover bloqueios das suas quadras
    if (admin.role === 'COURT_ADMIN') {
      const isAdminOfCourt = await db.courtAdmin.findUnique({
        where: { userId_courtId: { userId: adminId, courtId: block.courtId } }
      })
      if (!isAdminOfCourt) {
        return NextResponse.json({ error: 'Você só pode remover bloqueios das suas quadras' }, { status: 403 })
      }
    }

    await db.blockedSlot.delete({ where: { id: blockId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao remover bloqueio:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
