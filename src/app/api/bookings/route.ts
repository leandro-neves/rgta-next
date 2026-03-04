import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { BookingStatus } from '@prisma/client'

// Máximo de reservas por horário por quadra
const MAX_BOOKINGS_PER_SLOT = 2
// Máximo de reservas por usuário por dia
const MAX_BOOKINGS_PER_USER_PER_DAY = 2

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const courtId = searchParams.get('courtId')
    const date = searchParams.get('date')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}

    if (userId) where.userId = userId
    if (courtId) where.courtId = courtId
    if (date) where.date = date
    if (status && Object.values(BookingStatus).includes(status as BookingStatus)) {
      where.status = status
    }

    const bookings = await db.booking.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            phone: true,
            level: true
          }
        },
        court: true
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' }
      ]
    })

    return NextResponse.json(bookings)
  } catch (error) {
    console.error('Get bookings error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar reservas' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // Validar campos obrigatórios
    // Se admin/court_admin reservando para outro usuario, targetUserId eh o usuario destino
    const targetUserId = data.targetUserId || data.userId
    const requestingUserId = data.userId

    if (!requestingUserId || !data.courtId || !data.date || !data.startTime || !data.endTime) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: userId, courtId, date, startTime, endTime' },
        { status: 400 }
      )
    }

    // Verificar se o usuario solicitante existe
    const requestingUser = await db.user.findUnique({ where: { id: requestingUserId } })
    if (!requestingUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 401 }
      )
    }

    // Administrador nao pode reservar para si mesmo
    if ((requestingUser.role === 'ADMIN' || requestingUser.role === 'COURT_ADMIN') && targetUserId === requestingUserId) {
      return NextResponse.json(
        { error: 'Administradores não podem realizar reservas para si mesmos, apenas para usuários' },
        { status: 400 }
      )
    }

    // Se admin reservando para outro, verificar se o usuario destino existe
    let bookingUser = requestingUser
    if (targetUserId !== requestingUserId) {
      if (requestingUser.role !== 'ADMIN' && requestingUser.role !== 'COURT_ADMIN') {
        return NextResponse.json(
          { error: 'Apenas administradores podem criar reservas para outros usuários' },
          { status: 403 }
        )
      }
      const targetUser = await db.user.findUnique({ where: { id: targetUserId } })
      if (!targetUser) {
        return NextResponse.json(
          { error: 'Usuário destino não encontrado' },
          { status: 400 }
        )
      }
      bookingUser = targetUser

      // COURT_ADMIN so pode criar reservas nas suas quadras
      if (requestingUser.role === 'COURT_ADMIN') {
        const isAdminOfCourt = await db.courtAdmin.findUnique({
          where: { userId_courtId: { userId: requestingUserId, courtId: data.courtId } }
        })
        if (!isAdminOfCourt) {
          return NextResponse.json(
            { error: 'Você só pode criar reservas nas quadras que administra' },
            { status: 403 }
          )
        }
      }
    }

    // Validar janela de reserva: Reservas so podem ser feitas a partir de quarta 20:00
    // Segunda e terca estao completamente bloqueados
    if (requestingUser.role === 'PLAYER') {
      const now = new Date()
      const currentDay = now.getDay() // 0=dom, 1=seg, 2=ter, 3=qua, 4=qui, 5=sex, 6=sab
      const currentHour = now.getHours()

      if (currentDay === 1 || currentDay === 2) {
        return NextResponse.json(
          { error: 'Reservas não podem ser realizadas às segundas e terças-feiras. A janela de reserva abre na quarta-feira às 20:00' },
          { status: 400 }
        )
      }

      if (currentDay === 3 && currentHour < 20) {
        return NextResponse.json(
          { error: 'Reservas só podem ser realizadas a partir de quarta-feira às 20:00' },
          { status: 400 }
        )
      }
    }

    // Validar se é fim de semana
    const dateObj = new Date(data.date + 'T12:00:00')
    const dayOfWeek = dateObj.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      return NextResponse.json(
        { error: 'Reservas permitidas apenas para sábados e domingos' },
        { status: 400 }
      )
    }

    // Validar se a data não é no passado
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const bookingDate = new Date(data.date + 'T00:00:00')
    if (bookingDate < today) {
      return NextResponse.json(
        { error: 'Não é possível reservar em datas passadas' },
        { status: 400 }
      )
    }

    // Verificar se a quadra existe
    const court = await db.court.findUnique({ where: { id: data.courtId } })
    if (!court) {
      return NextResponse.json(
        { error: 'Quadra não encontrada' },
        { status: 400 }
      )
    }

    // Validar que o horário corresponde a um slot configurado
    const validSlot = await db.courtSlot.findFirst({
      where: {
        courtId: data.courtId,
        dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime
      }
    })
    if (!validSlot) {
      return NextResponse.json(
        { error: 'Horário não disponível para esta quadra neste dia' },
        { status: 400 }
      )
    }

    // Verificar se o horário está bloqueado
    const blockedSlot = await db.blockedSlot.findFirst({
      where: {
        courtId: data.courtId,
        date: data.date,
        startTime: { lt: data.endTime },
        endTime: { gt: data.startTime }
      }
    })

    if (blockedSlot) {
      return NextResponse.json(
        { error: `Horário bloqueado${blockedSlot.reason ? ': ' + blockedSlot.reason : ''}` },
        { status: 400 }
      )
    }

    // Verificar se o usuario destino já tem reserva neste horário em QUALQUER quadra
    const userTimeConflict = await db.booking.findFirst({
      where: {
        userId: targetUserId,
        date: data.date,
        status: { notIn: [BookingStatus.CANCELLED] },
        OR: [
          {
            AND: [
              { startTime: { lte: data.startTime } },
              { endTime: { gt: data.startTime } }
            ]
          },
          {
            AND: [
              { startTime: { lt: data.endTime } },
              { endTime: { gte: data.endTime } }
            ]
          }
        ]
      },
      include: { court: { select: { name: true } } }
    })

    if (userTimeConflict) {
      return NextResponse.json(
        { error: `${bookingUser.name} já tem uma reserva neste horário (${userTimeConflict.court.name} - ${userTimeConflict.startTime})` },
        { status: 400 }
      )
    }

    // Verificar limite de reservas por usuário por dia
    const userDayBookings = await db.booking.count({
      where: {
        userId: targetUserId,
        date: data.date,
        status: { notIn: [BookingStatus.CANCELLED] }
      }
    })

    if (userDayBookings >= MAX_BOOKINGS_PER_USER_PER_DAY) {
      return NextResponse.json(
        { error: `Limite de ${MAX_BOOKINGS_PER_USER_PER_DAY} reservas por dia atingido` },
        { status: 400 }
      )
    }

    // Contar reservas existentes neste horário nesta quadra
    const existingBookings = await db.booking.findMany({
      where: {
        courtId: data.courtId,
        date: data.date,
        status: { notIn: [BookingStatus.CANCELLED] },
        OR: [
          {
            AND: [
              { startTime: { lte: data.startTime } },
              { endTime: { gt: data.startTime } }
            ]
          },
          {
            AND: [
              { startTime: { lt: data.endTime } },
              { endTime: { gte: data.endTime } }
            ]
          }
        ]
      }
    })

    if (existingBookings.length >= MAX_BOOKINGS_PER_SLOT) {
      return NextResponse.json(
        { error: `Este horário já possui o máximo de ${MAX_BOOKINGS_PER_SLOT} reservas` },
        { status: 400 }
      )
    }

    // Regra de adversario: verificar se o usuario jogara com o mesmo adversario
    // Maximo 2x no mes, nao consecutivo, com intervalo de 15 dias
    if (existingBookings.length === 1) {
      const adversaryBooking = existingBookings[0]
      const adversaryId = adversaryBooking.userId

      // Buscar todas as reservas do mes onde ambos jogaram juntos (mesmo horario, mesma quadra)
      const bookingMonth = data.date.substring(0, 7) // YYYY-MM
      const allMonthBookings = await db.booking.findMany({
        where: {
          date: { startsWith: bookingMonth },
          status: { notIn: [BookingStatus.CANCELLED] }
        },
        orderBy: { date: 'asc' }
      })

      // Encontrar pares onde ambos jogadores estao no mesmo slot/quadra
      const sharedBookings: string[] = [] // datas em que jogaram juntos
      const bookingsBySlot = new Map<string, string[]>()

      for (const b of allMonthBookings) {
        const slotKey = `${b.courtId}-${b.date}-${b.startTime}`
        const users = bookingsBySlot.get(slotKey) || []
        users.push(b.userId)
        bookingsBySlot.set(slotKey, users)
      }

      for (const [slotKey, users] of bookingsBySlot) {
        if (users.includes(targetUserId) && users.includes(adversaryId)) {
          const slotDate = slotKey.split('-').slice(1, 4).join('-') // extrair date do slotKey
          sharedBookings.push(slotDate)
        }
      }

      if (sharedBookings.length >= 2) {
        return NextResponse.json(
          { error: 'Você já jogou 2 vezes com este adversário neste mês. Máximo permitido: 2 vezes por mês' },
          { status: 400 }
        )
      }

      if (sharedBookings.length === 1) {
        // Verificar intervalo de 15 dias
        const lastSharedDate = new Date(sharedBookings[0] + 'T00:00:00')
        const newBookingDate = new Date(data.date + 'T00:00:00')
        const daysDiff = Math.abs((newBookingDate.getTime() - lastSharedDate.getTime()) / (1000 * 60 * 60 * 24))

        if (daysDiff < 15) {
          return NextResponse.json(
            { error: `Intervalo mínimo de 15 dias para jogar com o mesmo adversário. Último jogo juntos: ${sharedBookings[0]}. Próximo permitido após 15 dias.` },
            { status: 400 }
          )
        }
      }
    }

    const booking = await db.booking.create({
      data: {
        userId: targetUserId,
        courtId: data.courtId,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        totalPrice: court.pricePerHour,
        notes: data.notes || null,
        status: BookingStatus.CONFIRMED
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            level: true
          }
        },
        court: true
      }
    })

    return NextResponse.json(booking)
  } catch (error) {
    console.error('Create booking error:', error)
    return NextResponse.json(
      { error: 'Erro ao criar reserva' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, status, notes } = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'ID da reserva é obrigatório' },
        { status: 400 }
      )
    }

    const booking = await db.booking.update({
      where: { id },
      data: {
        ...(status && { status: status as BookingStatus }),
        notes
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            level: true
          }
        },
        court: true
      }
    })

    return NextResponse.json(booking)
  } catch (error) {
    console.error('Update booking error:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar reserva' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const userId = searchParams.get('userId')

    if (!id) {
      return NextResponse.json(
        { error: 'ID da reserva é obrigatório' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'userId é obrigatório para cancelar' },
        { status: 400 }
      )
    }

    // Verificar se a reserva existe e pertence ao usuário (ou é admin)
    const booking = await db.booking.findUnique({
      where: { id },
      include: { user: { select: { id: true } } }
    })

    if (!booking) {
      return NextResponse.json(
        { error: 'Reserva não encontrada' },
        { status: 404 }
      )
    }

    // Verificar se o usuário é dono da reserva ou admin
    const requestingUser = await db.user.findUnique({ where: { id: userId } })
    if (!requestingUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 401 }
      )
    }

    const isAdmin = requestingUser.role === 'ADMIN' || requestingUser.role === 'COURT_ADMIN'
    if (booking.userId !== userId && !isAdmin) {
      return NextResponse.json(
        { error: 'Você só pode cancelar suas próprias reservas' },
        { status: 403 }
      )
    }

    // Verificar se a reserva já está cancelada
    if (booking.status === BookingStatus.CANCELLED) {
      return NextResponse.json(
        { error: 'Esta reserva já foi cancelada' },
        { status: 400 }
      )
    }

    await db.booking.update({
      where: { id },
      data: { status: BookingStatus.CANCELLED }
    })

    return NextResponse.json({ message: 'Reserva cancelada com sucesso' })
  } catch (error) {
    console.error('Delete booking error:', error)
    return NextResponse.json(
      { error: 'Erro ao cancelar reserva' },
      { status: 500 }
    )
  }
}
