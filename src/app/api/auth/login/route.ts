import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Usuário e senha são obrigatórios' },
        { status: 400 }
      )
    }

    const user = await db.user.findUnique({
      where: { username: username.toLowerCase().trim() },
      include: {
        adminCourts: {
          select: { courtId: true }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 401 }
      )
    }

    const isValidPassword = await bcrypt.compare(password, user.password)

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Senha incorreta' },
        { status: 401 }
      )
    }

    const { password: _, adminCourts, ...userWithoutPassword } = user

    return NextResponse.json({
      user: {
        ...userWithoutPassword,
        adminCourtIds: adminCourts.map(ac => ac.courtId)
      },
      message: 'Login realizado com sucesso'
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
