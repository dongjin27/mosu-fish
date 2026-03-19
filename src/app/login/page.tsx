'use client'
import { createClient } from '@/lib/supabase'
import { useState } from 'react'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const loginWithGoogle = async () => {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    setLoading(false)
  }

  const loginWithKakao = async () => {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#040D1A',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'sans-serif',
    }}>
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <div style={{ fontSize: '64px', marginBottom: '12px' }}>🏊</div>
        <h1 style={{ color: '#00D4FF', fontSize: '32px', fontWeight: 800, margin: 0 }}>MOSU</h1>
        <p style={{ color: '#7BA7C9', marginTop: '8px' }}>당신의 수영을 기록하세요</p>
      </div>

      <div style={{ width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <button
          onClick={loginWithGoogle}
          disabled={loading}
          style={{
            width: '100%', padding: '14px',
            background: '#fff', border: 'none',
            borderRadius: '12px', fontSize: '15px',
            fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
          }}
        >
          <img src="https://www.google.com/favicon.ico" width={20} height={20} alt="Google" />
          Google로 시작하기
        </button>

        <button
          onClick={loginWithKakao}
          disabled={loading}
          style={{
            width: '100%', padding: '14px',
            background: '#FEE500', border: 'none',
            borderRadius: '12px', fontSize: '15px',
            fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
          }}
        >
          💬 카카오로 시작하기
        </button>
      </div>
    </div>
  )
}
