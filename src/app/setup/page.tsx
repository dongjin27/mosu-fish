'use client'
import { createClient } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SetupPage() {
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('profiles').select('nickname').eq('id', user.id).single()
      if (data?.nickname) { router.push('/dashboard'); return }
      setChecking(false)
    }
    check()
  }, [])

  const handleSubmit = async () => {
    const n = nickname.trim()
    if (!n) { setError('닉네임을 입력해주세요'); return }
    if (n.length < 2) { setError('2글자 이상 입력해주세요'); return }
    if (n.length > 12) { setError('12글자 이하로 입력해주세요'); return }

    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error: err } = await supabase.from('profiles').insert({
      id: user.id,
      nickname: n,
    })

    if (err) {
      if (err.code === '23505') setError('이미 사용 중인 닉네임이에요')
      else setError('오류가 발생했어요. 다시 시도해주세요')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  if (checking) return (
    <div style={{minHeight:'100vh',background:'#040D1A',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <p style={{color:'#7BA7C9'}}>확인 중...</p>
    </div>
  )

  return (
    <div style={{
      minHeight:'100vh',background:'#040D1A',
      display:'flex',flexDirection:'column',
      alignItems:'center',justifyContent:'center',
      padding:'30px 20px',fontFamily:'sans-serif'
    }}>
      <div style={{textAlign:'center',marginBottom:48}}>
        <div style={{fontSize:64,marginBottom:12,filter:'drop-shadow(0 0 24px rgba(0,212,255,.6))'}}>🏊</div>
        <h1 style={{color:'#00D4FF',fontSize:28,fontWeight:800,margin:0}}>닉네임 설정</h1>
        <p style={{color:'#7BA7C9',marginTop:10,fontSize:14,lineHeight:1.6}}>
          닉네임은 <span style={{color:'#EF4444',fontWeight:700}}>딱 한 번만</span> 설정할 수 있어요.<br/>
          신중하게 골라주세요!
        </p>
      </div>

      <div style={{width:'100%',maxWidth:340}}>
        <div style={{background:'rgba(12,31,53,.9)',border:'1px solid rgba(0,212,255,.2)',borderRadius:16,padding:20,marginBottom:12}}>
          <label style={{display:'block',color:'#7BA7C9',fontSize:11,fontWeight:600,letterSpacing:'.07em',textTransform:'uppercase' as const,marginBottom:8}}>닉네임</label>
          <input
            autoFocus
            value={nickname}
            onChange={e => { setNickname(e.target.value); setError('') }}
            onKeyDown={e => e.key==='Enter' && handleSubmit()}
            placeholder="예: 수영왕동진"
            maxLength={12}
            style={{width:'100%',background:'rgba(255,255,255,.05)',border:'1px solid rgba(0,212,255,.25)',borderRadius:10,padding:'12px 14px',color:'#EFF6FF',fontSize:16,outline:'none',marginBottom:8,boxSizing:'border-box' as const}}
          />
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{color:error?'#EF4444':'#3D6B8A',fontSize:12}}>{error || '2~12글자'}</span>
            <span style={{color:nickname.length>10?'#F59E0B':'#3D6B8A',fontSize:12}}>{nickname.length}/12</span>
          </div>
        </div>

        <div style={{background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.2)',borderRadius:12,padding:'12px 14px',marginBottom:20,display:'flex',alignItems:'flex-start',gap:8}}>
          <span style={{fontSize:16,flexShrink:0}}>⚠️</span>
          <p style={{color:'#FCA5A5',fontSize:12,margin:0,lineHeight:1.5}}>
            한 번 설정한 닉네임은 변경할 수 없어요. 정말 이 닉네임으로 할까요?
          </p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !nickname.trim()}
          style={{
            width:'100%',padding:'15px',border:'none',borderRadius:14,
            color:'#fff',fontSize:15,fontWeight:700,cursor:'pointer',
            background:loading||!nickname.trim()?'rgba(29,155,240,.3)':'linear-gradient(135deg,#1D9BF0,#00D4FF)',
            boxShadow:nickname.trim()?'0 4px 20px rgba(0,212,255,.25)':'none',
            transition:'all .3s'
          }}
        >
          {loading ? '저장 중...' : '이 닉네임으로 시작하기 🚀'}
        </button>
      </div>
    </div>
  )
}
