import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 })
    }

    // Verificar se o usuário é admin
    const user = await db.user.findUnique({
      where: { id: userId }
    })

    if (!user || (user.role !== 'ADMIN' && user.role !== 'COURT_ADMIN')) {
      return NextResponse.json({ error: 'Acesso negado. Apenas administradores.' }, { status: 403 })
    }

    // Para COURT_ADMIN, restringir as quadras que ele administra
    let courtFilter: any = undefined
    if (user.role === 'COURT_ADMIN') {
      const adminCourts = await db.courtAdmin.findMany({
        where: { userId },
        select: { courtId: true }
      })
      const courtIds = adminCourts.map(ac => ac.courtId)
      courtFilter = { courtId: { in: courtIds } }
    }

    const bookingFilter = courtFilter || {}

    // Buscar estatísticas em lotes para não estourar pool de conexões
    const [totalUsers, totalPlayers, totalAdmins, totalCourts, activeCourts] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { role: 'PLAYER' } }),
      db.user.count({ where: { role: { in: ['ADMIN', 'COURT_ADMIN'] } } }),
      user.role === 'COURT_ADMIN'
        ? db.courtAdmin.count({ where: { userId } })
        : db.court.count(),
      user.role === 'COURT_ADMIN'
        ? db.court.count({ where: { isActive: true, admins: { some: { userId } } } })
        : db.court.count({ where: { isActive: true } }),
    ])

    const [totalBookings, confirmedBookings, cancelledBookings, pendingBookings, completedBookings] = await Promise.all([
      db.booking.count({ where: bookingFilter }),
      db.booking.count({ where: { ...bookingFilter, status: 'CONFIRMED' } }),
      db.booking.count({ where: { ...bookingFilter, status: 'CANCELLED' } }),
      db.booking.count({ where: { ...bookingFilter, status: 'PENDING' } }),
      db.booking.count({ where: { ...bookingFilter, status: 'COMPLETED' } }),
    ])

    const [totalRevenue, monthlyRevenue, recentBookings, bookingsByCourt, usersByLevel] = await Promise.all([
      db.booking.aggregate({
        where: { ...bookingFilter, status: { in: ['CONFIRMED', 'COMPLETED'] } },
        _sum: { totalPrice: true }
      }),
      db.booking.aggregate({
        where: {
          ...bookingFilter,
          status: { in: ['CONFIRMED', 'COMPLETED'] },
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        },
        _sum: { totalPrice: true }
      }),
      db.booking.findMany({
        where: bookingFilter,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, username: true, name: true, email: true, level: true } },
          court: { select: { id: true, name: true } }
        }
      }),
      db.booking.groupBy({
        by: ['courtId'],
        where: bookingFilter,
        _count: { id: true },
        _sum: { totalPrice: true }
      }),
      db.user.groupBy({
        by: ['level'],
        where: { level: { not: null } },
        _count: { id: true }
      })
    ])

    // Buscar nomes das quadras
    const courtIds = bookingsByCourt.map(b => b.courtId)
    const courts = await db.court.findMany({
      where: { id: { in: courtIds } },
      select: { id: true, name: true }
    })

    const courtMap = new Map(courts.map(c => [c.id, c.name]))

    const bookingsByCourtNamed = bookingsByCourt.map(b => ({
      courtId: b.courtId,
      courtName: courtMap.get(b.courtId) || 'Desconhecida',
      count: b._count.id,
      revenue: b._sum.totalPrice || 0
    }))

    return NextResponse.json({
      users: {
        total: totalUsers,
        players: totalPlayers,
        admins: totalAdmins,
        byLevel: usersByLevel.map(u => ({ level: u.level, count: u._count.id }))
      },
      courts: {
        total: totalCourts,
        active: activeCourts
      },
      bookings: {
        total: totalBookings,
        confirmed: confirmedBookings,
        cancelled: cancelledBookings,
        pending: pendingBookings,
        completed: completedBookings
      },
      revenue: {
        total: totalRevenue._sum.totalPrice || 0,
        monthly: monthlyRevenue._sum.totalPrice || 0
      },
      recentBookings,
      bookingsByCourt: bookingsByCourtNamed
    })

  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
