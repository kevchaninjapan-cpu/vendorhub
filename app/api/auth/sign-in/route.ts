import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { email, password, otpType } = body as {
      email?: string
      password?: string
      otpType?: 'magic_link'
    }

    // Next 15 + @supabase/ssr: await the client
    const supabase = await supabaseServer()

    if (email && password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 401 })
      }

      // (Optional) Create profile on first sign-in
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('profiles')
          .upsert({ id: user.id, email: user.email ?? null })
          .select()
      }

      return NextResponse.json({ ok: true }, { status: 200 })
    }

    if (email && otpType === 'magic_link') {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo:
            `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/dashboard`,
        },
      })
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
      }
      return NextResponse.json(
        { ok: true, message: 'Magic link sent. Check your email.' },
        { status: 200 }
      )
    }

    return NextResponse.json(
      { ok: false, error: 'Invalid payload. Provide {email,password} or {email, otpType:"magic_link"}.' },
      { status: 400 }
    )
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'Unexpected error during sign-in.' },
      { status: 500 }
    )
  }
}
``