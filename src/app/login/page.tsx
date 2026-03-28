'use client'
import { createClient } from '@/lib/supabase'
import { useState } from 'react'
import Image from 'next/image'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const loginWithGoogle = async () => {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    setLoading(false)
  }

  const loginWithKakao = async () => {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    setLoading(false)
  }

  return (
    <div style={{
      minHeight:'100vh',
      background:'linear-gradient(180deg, #EBF5FF 0%, #F8FBFF 100%)',
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      padding:'20px', fontFamily:'sans-serif',
    }}>
      {/* 배경 물결 효과 */}
      <div style={{
        position:'fixed', bottom:0, left:0, right:0, height:'200px',
        background:'linear-gradient(180deg, transparent, rgba(29,155,240,.08))',
        pointerEvents:'none'
      }}/>

      <div style={{textAlign:'center', marginBottom:'40px'}}>
        <Image
          src="/logo.png"
          alt="MOSU 로고"
          width={160}
          height={160}
          style={{marginBottom:'8px', filter:'drop-shadow(0 8px 24px rgba(29,155,240,.25))'}}
        />
        <p style={{color:'#64748B', marginTop:'8px', fontSize:'14px'}}>누구나 함께하는 수영 커뮤니티</p>
      </div>

      <div style={{width:'100%', maxWidth:'320px', display:'flex', flexDirection:'column', gap:'12px'}}>
        <button
          onClick={loginWithGoogle}
          disabled={loading}
          style={{
            width:'100%', padding:'15px',
            background:'#fff',
            border:'1.5px solid #E2E8F0',
            borderRadius:'16px', fontSize:'15px',
            fontWeight:600, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', gap:'10px',
            color:'#1E293B',
            boxShadow:'0 2px 8px rgba(0,0,0,.06)',
            transition:'all .2s'
          }}
        >
          <img src="https://www.google.com/favicon.ico" width={20} height={20} alt="Google"/>
          Google로 시작하기
        </button>

        <button
          onClick={loginWithKakao}
          disabled={loading}
          style={{
            width:'100%', padding:'15px',
            background:'#FEE500',
            border:'none',
            borderRadius:'16px', fontSize:'15px',
            fontWeight:600, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', gap:'10px',
            color:'#3C1E1E',
            boxShadow:'0 2px 8px rgba(254,229,0,.4)',
            transition:'all .2s'
          }}
        >
          💬 카카오로 시작하기
        </button>

        <p style={{textAlign:'center', color:'#94A3B8', fontSize:'12px', marginTop:'8px'}}>
          로그인 시 서비스 이용약관에 동의하게 됩니다
        </p>
      </div>
    </div>
  )
}
