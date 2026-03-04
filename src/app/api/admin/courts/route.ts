import { NextRequest, NextResponse } from 'next/server'
import { CourtType, SurfaceType } from '@prisma/client'
import { db } from '@/lib/db'

// GET - Listar todas as quadras com estatísticas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const adminId = searchParams.get('adminId')

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

    // COURT_ADMIN: restringir as quadras que administra
    let courtWhere: any = {}
    if (admin.role === 'COURT_ADMIN') {
      const adminCourts = await db.courtAdmin.findMany({
        where: { userId: adminId },
        select: { courtId: true }
      })
      courtWhere = { id: { in: adminCourts.map(ac => ac.courtId) } }
    }

    // Buscar quadras com estatísticas e admins
    const courts = await db.court.findMany({
      where: courtWhere,
      include: {
        _count: {
          select: { bookings: true }
        },
        admins: {
          include: {
            user: {
              select: { id: true, name: true }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    // Buscar receita por quadra
    const courtIds = courts.map(c => c.id)
    const revenueByCourt = await db.booking.groupBy({
      by: ['courtId'],
      where: { status: { in: ['CONFIRMED', 'COMPLETED'] }, courtId: { in: courtIds } },
      _sum: { totalPrice: true }
    })

    const revenueMap = new Map(revenueByCourt.map(r => [r.courtId, r._sum.totalPrice || 0]))

    const courtsWithStats = courts.map(court => ({
      ...court,
      totalBookings: court._count.bookings,
      totalRevenue: revenueMap.get(court.id) || 0,
      courtAdmins: court.admins.map(a => ({ id: a.user.id, name: a.user.name })),
      admins: undefined
    }))

    return NextResponse.json(courtsWithStats)

  } catch (error) {
    console.error('Erro ao listar quadras:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// PUT - Atualizar quadra
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { adminId, courtId, name, type, surface, pricePerHour, isActive, image } = body

    if (!adminId || !courtId) {
      return NextResponse.json({ error: 'IDs são obrigatórios' }, { status: 400 })
    }

    // Verificar se é admin
    const admin = await db.user.findUnique({
      where: { id: adminId }
    })

    if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'COURT_ADMIN')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // COURT_ADMIN: verificar se administra essa quadra
    if (admin.role === 'COURT_ADMIN') {
      const isAdminOfCourt = await db.courtAdmin.findUnique({
        where: { userId_courtId: { userId: adminId, courtId } }
      })
      if (!isAdminOfCourt) {
        return NextResponse.json({ error: 'Você só pode editar quadras que administra' }, { status: 403 })
      }
    }

    // Preparar dados para atualização
    const updateData: any = {}
    if (name) updateData.name = name
    if (type && ['INDOOR', 'OUTDOOR'].includes(type)) {
      updateData.type = type as CourtType
    }
    if (surface && ['CLAY', 'HARD', 'GRASS'].includes(surface)) {
      updateData.surface = surface as SurfaceType
    }
    if (pricePerHour !== undefined) {
      updateData.pricePerHour = parseFloat(pricePerHour)
    }
    if (isActive !== undefined) {
      updateData.isActive = isActive
    }
    if (image !== undefined) {
      updateData.image = image
    }

    const updatedCourt = await db.court.update({
      where: { id: courtId },
      data: updateData
    })

    return NextResponse.json(updatedCourt)

  } catch (error) {
    console.error('Erro ao atualizar quadra:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// POST - Criar nova quadra
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { adminId, name, type, surface, pricePerHour, image } = body

    if (!adminId) {
      return NextResponse.json({ error: 'ID do administrador é obrigatório' }, { status: 400 })
    }

    // Verificar se é admin
    const admin = await db.user.findUnique({
      where: { id: adminId }
    })

    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    if (!name || !type || !surface || !pricePerHour) {
      return NextResponse.json({ error: 'Nome, tipo, superfície e preço são obrigatórios' }, { status: 400 })
    }

    const newCourt = await db.court.create({
      data: {
        name,
        type: type as CourtType,
        surface: surface as SurfaceType,
        pricePerHour: parseFloat(pricePerHour),
        image: image || null,
        isActive: true
      }
    })

    return NextResponse.json(newCourt)

  } catch (error) {
    console.error('Erro ao criar quadra:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// DELETE - Excluir quadra
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const adminId = searchParams.get('adminId')
    const courtId = searchParams.get('courtId')

    if (!adminId || !courtId) {
      return NextResponse.json({ error: 'IDs são obrigatórios' }, { status: 400 })
    }

    // Verificar se é admin
    const admin = await db.user.findUnique({
      where: { id: adminId }
    })

    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Verificar se há reservas
    const bookingCount = await db.booking.count({
      where: { courtId }
    })

    if (bookingCount > 0) {
      // Em vez de excluir, apenas desativar
      await db.court.update({
        where: { id: courtId },
        data: { isActive: false }
      })
      return NextResponse.json({ success: true, message: 'Quadra desativada (possui reservas)' })
    }

    // Se não há reservas, excluir
    await db.court.delete({
      where: { id: courtId }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Erro ao excluir quadra:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
