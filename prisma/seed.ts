import { PrismaClient, Role, CourtType, SurfaceType, BookingStatus, PlayerLevel } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Iniciando seed do banco de dados...')

  // Limpar dados existentes
  await prisma.courtSlot.deleteMany()
  await prisma.courtAdmin.deleteMany()
  await prisma.booking.deleteMany()
  await prisma.court.deleteMany()
  await prisma.user.deleteMany()

  const hashedPassword = await bcrypt.hash('123456', 10)

  // Criar admin (sem level - administrador nao tem categoria)
  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      name: 'Administrador',
      email: 'admin@tenniscourt.com',
      password: hashedPassword,
      phone: '(11) 99999-0000',
      role: Role.ADMIN,
      level: null
    }
  })

  // Criar 3 jogadores - um por categoria
  const players = await Promise.all([
    prisma.user.create({
      data: {
        username: 'joao.silva',
        name: 'Joao Silva',
        email: 'joao@email.com',
        password: hashedPassword,
        phone: '(11) 99999-0001',
        role: Role.PLAYER,
        level: PlayerLevel.A,
      }
    }),
    prisma.user.create({
      data: {
        username: 'maria.santos',
        name: 'Maria Santos',
        email: 'maria@email.com',
        password: hashedPassword,
        phone: '(11) 99999-0002',
        role: Role.PLAYER,
        level: PlayerLevel.B,
      }
    }),
    prisma.user.create({
      data: {
        username: 'ana.oliveira',
        name: 'Ana Oliveira',
        email: 'ana@email.com',
        password: hashedPassword,
        phone: '(11) 99999-0003',
        role: Role.PLAYER,
        level: PlayerLevel.C,
      }
    })
  ])

  console.log('Usuarios criados')

  // Criar quadras
  const courts = await Promise.all([
    prisma.court.create({
      data: {
        name: 'Tennis Center',
        type: CourtType.INDOOR,
        surface: SurfaceType.CLAY,
        pricePerHour: 60,
        openTime: '08:00',
        closeTime: '17:00',
        isActive: true,
        image: '/tennis-center.png'
      }
    }),
    prisma.court.create({
      data: {
        name: 'Tennis Point',
        type: CourtType.OUTDOOR,
        surface: SurfaceType.CLAY,
        pricePerHour: 60,
        openTime: '08:00',
        closeTime: '19:00',
        isActive: true,
        image: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=800&h=400&fit=crop'
      }
    }),
    prisma.court.create({
      data: {
        name: 'Top Spin (Quadra 1)',
        type: CourtType.OUTDOOR,
        surface: SurfaceType.CLAY,
        pricePerHour: 60,
        openTime: '07:30',
        closeTime: '19:00',
        isActive: true,
        image: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=400&fit=crop'
      }
    }),
    prisma.court.create({
      data: {
        name: 'Top Spin (Quadra 2)',
        type: CourtType.OUTDOOR,
        surface: SurfaceType.CLAY,
        pricePerHour: 60,
        openTime: '07:30',
        closeTime: '19:00',
        isActive: true,
        image: 'https://images.unsplash.com/photo-1526232761682-d26e03ac148e?w=800&h=400&fit=crop'
      }
    })
  ])

  console.log('Quadras criadas')

  // Criar slots de horários por quadra e dia da semana
  // dayOfWeek: 0=Domingo, 6=Sábado
  const slotData: { courtIdx: number; day: number; start: string; end: string }[] = [
    // Tennis Center - Sábado
    { courtIdx: 0, day: 6, start: '08:00', end: '09:30' },
    { courtIdx: 0, day: 6, start: '09:30', end: '11:00' },
    { courtIdx: 0, day: 6, start: '11:00', end: '12:30' },
    { courtIdx: 0, day: 6, start: '12:30', end: '14:00' },
    { courtIdx: 0, day: 6, start: '14:00', end: '15:30' },
    { courtIdx: 0, day: 6, start: '15:30', end: '17:00' },
    // Tennis Center - Domingo
    { courtIdx: 0, day: 0, start: '08:30', end: '10:00' },
    { courtIdx: 0, day: 0, start: '10:00', end: '11:30' },

    // Tennis Point - Sábado
    { courtIdx: 1, day: 6, start: '08:00', end: '09:00' },
    { courtIdx: 1, day: 6, start: '09:00', end: '10:00' },
    { courtIdx: 1, day: 6, start: '10:00', end: '11:30' },
    { courtIdx: 1, day: 6, start: '11:30', end: '13:00' },
    { courtIdx: 1, day: 6, start: '13:00', end: '14:30' },
    { courtIdx: 1, day: 6, start: '14:30', end: '16:00' },
    { courtIdx: 1, day: 6, start: '16:00', end: '17:30' },
    { courtIdx: 1, day: 6, start: '17:30', end: '19:00' },
    // Tennis Point - Domingo
    { courtIdx: 1, day: 0, start: '10:00', end: '11:30' },
    { courtIdx: 1, day: 0, start: '11:30', end: '13:00' },
    { courtIdx: 1, day: 0, start: '13:00', end: '14:30' },
    { courtIdx: 1, day: 0, start: '14:30', end: '16:00' },
    { courtIdx: 1, day: 0, start: '16:00', end: '17:30' },
    { courtIdx: 1, day: 0, start: '17:30', end: '19:00' },

    // Top Spin Quadra 1 - Sábado
    { courtIdx: 2, day: 6, start: '07:30', end: '09:00' },
    { courtIdx: 2, day: 6, start: '09:00', end: '10:30' },
    { courtIdx: 2, day: 6, start: '10:30', end: '12:00' },
    { courtIdx: 2, day: 6, start: '16:00', end: '17:30' },
    { courtIdx: 2, day: 6, start: '17:30', end: '19:00' },
    // Top Spin Quadra 1 - Domingo
    { courtIdx: 2, day: 0, start: '08:00', end: '09:30' },
    { courtIdx: 2, day: 0, start: '09:30', end: '11:00' },
    { courtIdx: 2, day: 0, start: '11:00', end: '12:30' },

    // Top Spin Quadra 2 - Sábado
    { courtIdx: 3, day: 6, start: '07:30', end: '09:00' },
    { courtIdx: 3, day: 6, start: '09:00', end: '10:30' },
    { courtIdx: 3, day: 6, start: '10:30', end: '12:00' },
    { courtIdx: 3, day: 6, start: '16:00', end: '17:30' },
    { courtIdx: 3, day: 6, start: '17:30', end: '19:00' },
    // Top Spin Quadra 2 - Domingo
    { courtIdx: 3, day: 0, start: '08:00', end: '09:30' },
    { courtIdx: 3, day: 0, start: '09:30', end: '11:00' },
    { courtIdx: 3, day: 0, start: '11:00', end: '12:30' },
  ]

  for (const s of slotData) {
    await prisma.courtSlot.create({
      data: {
        courtId: courts[s.courtIdx].id,
        dayOfWeek: s.day,
        startTime: s.start,
        endTime: s.end
      }
    })
  }

  console.log('Slots de horários criados')

  // Criar reservas de exemplo para os proximos fins de semana
  const today = new Date()
  const formatDate = (date: Date) => date.toISOString().split('T')[0]

  // Encontrar próximo sábado
  const getNextSaturday = (from: Date) => {
    const date = new Date(from)
    const dayOfWeek = date.getDay()
    const daysUntilSaturday = dayOfWeek === 6 ? 0 : (6 - dayOfWeek + 7) % 7
    date.setDate(date.getDate() + daysUntilSaturday)
    return date
  }

  const saturday = getNextSaturday(today)

  // Reservas de exemplo - usando horários reais das quadras
  const sampleBookings = [
    { userId: players[0].id, courtId: courts[0].id, date: formatDate(saturday), startTime: '09:30', endTime: '11:00', notes: 'Treino matinal' },
    { userId: players[1].id, courtId: courts[0].id, date: formatDate(saturday), startTime: '09:30', endTime: '11:00', notes: 'Treino matinal' },
    { userId: players[2].id, courtId: courts[1].id, date: formatDate(saturday), startTime: '10:00', endTime: '11:30', notes: 'Aula' },
  ]

  for (const booking of sampleBookings) {
    await prisma.booking.create({
      data: {
        ...booking,
        status: BookingStatus.CONFIRMED,
        totalPrice: 60
      }
    })
  }

  console.log('Reservas de exemplo criadas')
  console.log('Seed concluido com sucesso!')

  console.log('\nDados de acesso (login / senha):')
  console.log('   Admin: admin / 123456')
  console.log('   Jogador A (Avancado): joao.silva / 123456')
  console.log('   Jogador B (Intermediario): maria.santos / 123456')
  console.log('   Jogador C (Iniciante): ana.oliveira / 123456')

  console.log('\nQuadras criadas:')
  console.log('   - Tennis Center (Coberta/Saibro) - R$ 60/hora')
  console.log('   - Tennis Point (Aberta/Saibro) - R$ 60/hora')
  console.log('   - Top Spin Quadra 1 (Aberta/Saibro) - R$ 60/hora')
  console.log('   - Top Spin Quadra 2 (Aberta/Saibro) - R$ 60/hora')
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
