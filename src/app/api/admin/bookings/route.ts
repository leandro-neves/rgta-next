import { NextRequest, NextResponse } from 'next/server'
import { BookingStatus } from '@prisma/client'
import { db } from '@/lib/db'

// GET - Listar todas as reservas com filtros
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const adminId = searchParams.get('adminId')
    const status = searchParams.get('status')
    const courtId = searchParams.get('courtId')
    const userId = searchParams.get('userId')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    if (!adminId) {
      return NextResponse.json({ error: 'ID do administrador é obrigatório' }, { status: 400 })
    }

    // Verificar se é admin
    const admin = await db.user.findUnique({
      where: { id: adminId }
    })

    if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'COURT_ADMIN')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Construir filtros
    const where: any = {}

    // COURT_ADMIN: restringir as quadras que administra
    if (admin.role === 'COURT_ADMIN') {
      const adminCourts = await db.courtAdmin.findMany({
        where: { userId: adminId },
        select: { courtId: true }
      })
      where.courtId = { in: adminCourts.map(ac => ac.courtId) }
    }

    if (status && ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'].includes(status)) {
      where.status = status
    }
    if (courtId) {
      where.courtId = courtId
    }
    if (userId) {
      where.userId = userId
    }
    if (dateFrom) {
      where.date = { ...where.date, gte: dateFrom }
    }
    if (dateTo) {
      where.date = { ...where.date, lte: dateTo }
    }

    // Buscar total para paginação
    const total = await db.booking.count({ where })

    // Buscar reservas
    const bookings = await db.booking.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, name: true, email: true, level: true, phone: true } },
        court: { select: { id: true, name: true, type: true, surface: true } }
      },
      orderBy: [
        { date: 'desc' },
        { startTime: 'asc' }
      ],
      skip: (page - 1) * limit,
      take: limit
    })

    return NextResponse.json({
      bookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Erro ao listar reservas:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// PUT - Atualizar status da reserva
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { adminId, bookingId, status, notes } = body

    if (!adminId || !bookingId) {
      return NextResponse.json({ error: 'IDs são obrigatórios' }, { status: 400 })
    }

    // Verificar se é admin
    const admin = await db.user.findUnique({
      where: { id: adminId }
    })

    if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'COURT_ADMIN')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // COURT_ADMIN: verificar se a reserva pertence a uma quadra que administra
    if (admin.role === 'COURT_ADMIN') {
      const booking = await db.booking.findUnique({ where: { id: bookingId }, select: { courtId: true } })
      if (booking) {
        const isAdminOfCourt = await db.courtAdmin.findUnique({
          where: { userId_courtId: { userId: adminId, courtId: booking.courtId } }
        })
        if (!isAdminOfCourt) {
          return NextResponse.json({ error: 'Você só pode gerenciar reservas das quadras que administra' }, { status: 403 })
        }
      }
    }

    // Preparar dados para atualização
    const updateData: any = {}
    if (status && ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'].includes(status)) {
      updateData.status = status as BookingStatus
    }
    if (notes !== undefined) {
      updateData.notes = notes
    }

    const updatedBooking = await db.booking.update({
      where: { id: bookingId },
      data: updateData,
      include: {
        user: { select: { id: true, username: true, name: true, email: true, level: true } },
        court: { select: { id: true, name: true } }
      }
    })

    return NextResponse.json(updatedBooking)

  } catch (error) {
    console.error('Erro ao atualizar reserva:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// DELETE - Excluir reserva
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const adminId = searchParams.get('adminId')
    const bookingId = searchParams.get('bookingId')

    if (!adminId || !bookingId) {
      return NextResponse.json({ error: 'IDs são obrigatórios' }, { status: 400 })
    }

    // Verificar se é admin
    const admin = await db.user.findUnique({
      where: { id: adminId }
    })

    if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'COURT_ADMIN')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // COURT_ADMIN: verificar se a reserva pertence a uma quadra que administra
    if (admin.role === 'COURT_ADMIN') {
      const booking = await db.booking.findUnique({ where: { id: bookingId }, select: { courtId: true } })
      if (booking) {
        const isAdminOfCourt = await db.courtAdmin.findUnique({
          where: { userId_courtId: { userId: adminId, courtId: booking.courtId } }
        })
        if (!isAdminOfCourt) {
          return NextResponse.json({ error: 'Você só pode gerenciar reservas das quadras que administra' }, { status: 403 })
        }
      }
    }

    await db.booking.delete({
      where: { id: bookingId }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Erro ao excluir reserva:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
