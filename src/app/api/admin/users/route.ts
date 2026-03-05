import { NextRequest, NextResponse } from 'next/server'
import { Role, PlayerLevel } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

// GET - Listar todos os usuários
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const adminId = searchParams.get('adminId')
    const role = searchParams.get('role')
    const level = searchParams.get('level')
    const search = searchParams.get('search')

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
    if (role && ['ADMIN', 'COURT_ADMIN', 'PLAYER'].includes(role)) {
      where.role = role
    }
    if (level && ['A', 'B', 'C'].includes(level)) {
      where.level = level
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ]
    }

    const users = await db.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        level: true,
        createdAt: true,
        adminCourts: {
          select: { courtId: true }
        },
        _count: {
          select: { bookings: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const usersWithCourtIds = users.map(u => ({
      ...u,
      adminCourtIds: u.adminCourts.map(ac => ac.courtId),
      adminCourts: undefined
    }))

    return NextResponse.json(usersWithCourtIds)

  } catch (error) {
    console.error('Erro ao listar usuários:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// POST - Criar novo usuário
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { adminId, username, name, password, email, phone, role, level, courtIds } = body

    if (!adminId || !username || !name || !password) {
      return NextResponse.json({ error: 'Campos obrigatórios: username, nome, senha' }, { status: 400 })
    }

    // Apenas ADMIN pode criar usuários
    const admin = await db.user.findUnique({ where: { id: adminId } })
    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Apenas administradores podem criar usuários' }, { status: 403 })
    }

    // Validar username
    if (username.length < 3 || !/^[a-zA-Z0-9._-]+$/.test(username)) {
      return NextResponse.json({ error: 'Username deve ter pelo menos 3 caracteres (letras, números, .-_)' }, { status: 400 })
    }

    // Validar senha
    if (password.length < 6) {
      return NextResponse.json({ error: 'Senha deve ter pelo menos 6 caracteres' }, { status: 400 })
    }

    // Verificar username único
    const existing = await db.user.findUnique({ where: { username } })
    if (existing) {
      return NextResponse.json({ error: 'Username já está em uso' }, { status: 400 })
    }

    // Validar role
    const userRole = (role && ['ADMIN', 'COURT_ADMIN', 'PLAYER'].includes(role)) ? role as Role : 'PLAYER'
    const userLevel = (userRole === 'PLAYER' && level && ['A', 'B', 'C'].includes(level)) ? level as PlayerLevel : (userRole === 'PLAYER' ? 'C' as PlayerLevel : null)

    const hashedPassword = await bcrypt.hash(password, 10)

    const newUser = await db.user.create({
      data: {
        username,
        name,
        password: hashedPassword,
        email: email || null,
        phone: phone || null,
        role: userRole,
        level: userLevel
      },
      select: {
        id: true, username: true, name: true, email: true, phone: true,
        role: true, level: true, createdAt: true
      }
    })

    // Se COURT_ADMIN, criar associações com quadras
    if (userRole === 'COURT_ADMIN' && Array.isArray(courtIds) && courtIds.length > 0) {
      await db.courtAdmin.createMany({
        data: courtIds.map((courtId: string) => ({ userId: newUser.id, courtId }))
      })
    }

    return NextResponse.json(newUser)
  } catch (error) {
    console.error('Erro ao criar usuário:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// PUT - Atualizar usuário
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { adminId, userId, username, name, email, phone, role, level, password, courtIds } = body

    if (!adminId || !userId) {
      return NextResponse.json({ error: 'IDs são obrigatórios' }, { status: 400 })
    }

    // Verificar se é admin
    const admin = await db.user.findUnique({
      where: { id: adminId }
    })

    if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'COURT_ADMIN')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Proteger @admin: só ele mesmo pode se editar
    const targetUser = await db.user.findUnique({ where: { id: userId }, select: { username: true } })
    if (targetUser?.username === 'admin' && adminId !== userId) {
      return NextResponse.json({ error: 'O usuário @admin só pode ser editado por ele mesmo' }, { status: 403 })
    }

    // COURT_ADMIN nao pode alterar roles
    if (admin.role === 'COURT_ADMIN' && role) {
      return NextResponse.json({ error: 'Você não tem permissão para alterar funções de usuários' }, { status: 403 })
    }

    // Verificar se o email já existe (se estiver mudando)
    if (email) {
      const existingUser = await db.user.findFirst({
        where: {
          email,
          id: { not: userId }
        }
      })
      if (existingUser) {
        return NextResponse.json({ error: 'Email já cadastrado' }, { status: 400 })
      }
    }

    // Verificar se o username já existe (se estiver mudando)
    if (username) {
      if (username.length < 3 || !/^[a-zA-Z0-9._-]+$/.test(username)) {
        return NextResponse.json({ error: 'Username deve ter pelo menos 3 caracteres (letras, números, .-_)' }, { status: 400 })
      }
      const existingUsername = await db.user.findFirst({
        where: { username, id: { not: userId } }
      })
      if (existingUsername) {
        return NextResponse.json({ error: 'Username já está em uso' }, { status: 400 })
      }
    }

    // Preparar dados para atualização
    const updateData: any = {}
    if (username) updateData.username = username
    if (name) updateData.name = name
    if (email) updateData.email = email
    if (phone !== undefined) updateData.phone = phone
    if (role && ['ADMIN', 'COURT_ADMIN', 'PLAYER'].includes(role)) {
      updateData.role = role as Role
      // Admin e COURT_ADMIN nao tem nivel
      if (role === 'ADMIN' || role === 'COURT_ADMIN') {
        updateData.level = null
      }
    }
    if (level && ['A', 'B', 'C'].includes(level)) updateData.level = level as PlayerLevel
    if (password) {
      updateData.password = await bcrypt.hash(password, 10)
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        level: true,
        createdAt: true
      }
    })

    // Gerenciar associacoes de quadras para COURT_ADMIN
    const finalRole = updateData.role || (await db.user.findUnique({ where: { id: userId }, select: { role: true } }))?.role
    if (finalRole === 'COURT_ADMIN' && Array.isArray(courtIds)) {
      await db.courtAdmin.deleteMany({ where: { userId } })
      if (courtIds.length > 0) {
        await db.courtAdmin.createMany({
          data: courtIds.map((courtId: string) => ({ userId, courtId }))
        })
      }
    } else if (finalRole !== 'COURT_ADMIN') {
      // Se mudou de COURT_ADMIN para outro role, limpar associacoes
      await db.courtAdmin.deleteMany({ where: { userId } })
    }

    return NextResponse.json(updatedUser)

  } catch (error) {
    console.error('Erro ao atualizar usuário:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// DELETE - Excluir usuário
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const adminId = searchParams.get('adminId')
    const userId = searchParams.get('userId')

    if (!adminId || !userId) {
      return NextResponse.json({ error: 'IDs são obrigatórios' }, { status: 400 })
    }

    // Verificar se é admin
    const admin = await db.user.findUnique({
      where: { id: adminId }
    })

    if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'COURT_ADMIN')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Não permitir excluir a si mesmo
    if (adminId === userId) {
      return NextResponse.json({ error: 'Não é possível excluir sua própria conta' }, { status: 400 })
    }

    // Proteger @admin: ninguém pode excluí-lo exceto ele mesmo
    const targetUser = await db.user.findUnique({ where: { id: userId }, select: { username: true } })
    if (targetUser?.username === 'admin') {
      return NextResponse.json({ error: 'O usuário @admin não pode ser excluído' }, { status: 403 })
    }

    // Excluir reservas do usuário primeiro
    await db.booking.deleteMany({
      where: { userId }
    })

    // Excluir usuário
    await db.user.delete({
      where: { id: userId }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Erro ao excluir usuário:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
