import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { PlayerLevel } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const { username, name, email, password, phone, level } = await request.json()

    if (!username || !name || !password) {
      return NextResponse.json(
        { error: 'Usuário, nome e senha são obrigatórios' },
        { status: 400 }
      )
    }

    if (username.length < 3) {
      return NextResponse.json(
        { error: 'O usuário deve ter pelo menos 3 caracteres' },
        { status: 400 }
      )
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
      return NextResponse.json(
        { error: 'O usuário pode conter apenas letras, números, ponto, hífen e underline' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      )
    }

    const existingUser = await db.user.findUnique({
      where: { username: username.toLowerCase().trim() }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Este nome de usuário já está em uso' },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    // Validar nível
    const validLevels = ['A', 'B', 'C']
    const playerLevel: PlayerLevel = validLevels.includes(level)
      ? level as PlayerLevel
      : PlayerLevel.C

    const user = await db.user.create({
      data: {
        username: username.toLowerCase().trim(),
        name,
        email: email?.toLowerCase().trim() || null,
        password: hashedPassword,
        phone: phone || null,
        level: playerLevel
      }
    })

    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json({
      user: userWithoutPassword,
      message: 'Cadastro realizado com sucesso'
    })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
