'use client'
import { createClient } from '@/lib/supabase'
import { Session } from '@/lib/types'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDarkMode } from '@/lib/useDarkMode'

const fmtDist = (d: number) => d >= 1000 ? (d/1000).toFixed(1)+'km' : d+'m'
const CCOL: Record<string, string> = {
  "Warm Up":"#F59E0B","Drill":"#A78BFA","Kick":"#F472B6",
  "Main":"#1D9BF0","Easy":"#10B981","Pull":"#00D4FF","Swim":"#818CF8"
}

export default function Dashboard() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [user, setUser] = useState<any>(null)
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()
  const { dark } = useDarkMode()

  const c = {
    bg: dark?'#040D1A':'#F0F4F8',
    card: dark?'rgba(12,31,53,.85)':'#fff',
    border: dark?'rgba(0,212,255,.1)':'#E2E8F0',
    header: dark?'rgba(4,13,26,.97)':'rgba(255,255,255,.97)',
    t1: dark?'#EFF6FF':'#1E293B',
    t2: dark?'#7BA7C9':'#64748B',
    t3: dark?'#3D6B8A':'#94A3B8',
  }

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      // 닉네임 체크 — 없으면 설정 페이지로
      const { data: profile } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('id', user.id)
        .single()

      if (!profile?.nickname) { router.push('/setup'); return }
      setNickname(profile.nickname)

      const { data: sessions } = await supabase
        .from('sessions')
        .select('*, sets(*)')
        .order('date', { ascending: false })

      setSessions(sessions || [])
      setLoading(false)
    }
    load()
  }, [])

  const totalDist = sessions.reduce((s, x) => s + x.total_dist, 0)
  const avgDist = sessions.length ? Math.round(totalDist / sessions.length) : 0
  const best = sessions.length ? Math.max(...sessions.map(s => s.total_dist)) : 0

  if (loading) return (
    <div style={{minHeight:'100vh',background:c.bg,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <p style={{color:c.t2}}>로딩 중...</p>
    </div>
  )

  return (
    <div style={{maxWidth:430,margin:'0 auto',minHeight:'100vh',background:c.bg,paddingBottom:80,fontFamily:'sans-serif'}}>
      <header style={{background:c.header,borderBottom:'1px solid '+c.border,padding:'12px 16px',position:'sticky',top:0,zIndex:100}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{display:'flex',alignItems:'center',gap:9}}>
            <div style={{width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,#1D9BF0,#00D4FF)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700,color:'#fff'}}>
              {nickname[0]?.toUpperCase()}
            </div>
            <div>
              <p style={{color:c.t1,fontWeight:700,fontSize:14,margin:0}}>{nickname}</p>
              <p style={{color:c.t3,fontSize:10,margin:0}}>{sessions.length}회 · {fmtDist(totalDist)}</p>
            </div>
          </div>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
            style={{background:'rgba(125,125,125,.08)',border:'1px solid rgba(125,125,125,.15)',borderRadius:7,padding:'5px 10px',color:c.t2,fontSize:12,cursor:'pointer'}}>
            로그아웃
          </button>
        </div>
      </header>

      <div style={{padding:'12px 16px 0'}}>
        <h2 style={{color:c.t1,fontWeight:800,fontSize:20,margin:'0 0 12px'}}>대시보드</h2>

        {/* 통계 카드 */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9,marginBottom:13}}>
          {[
            {label:'총 거리',value:fmtDist(totalDist),icon:'🌊',color:'#1D9BF0'},
            {label:'세션 수',value:sessions.length+'회',icon:'📅',color:'#A78BFA'},
            {label:'평균/세션',value:fmtDist(avgDist),icon:'📊',color:'#0FF5C0'},
            {label:'최고 기록',value:fmtDist(best),icon:'🏆',color:'#F59E0B'},
          ].map((c2,i) => (
            <div key={i} style={{background:c.card,border:`1px solid ${c2.color}22`,borderRadius:14,padding:12,borderBottom:`2px solid ${c2.color}`}}>
              <div style={{fontSize:19,marginBottom:3}}>{c2.icon}</div>
              <div style={{fontWeight:700,fontSize:19,color:c2.color}}>{c2.value}</div>
              <div style={{color:c.t2,fontSize:11,marginTop:1}}>{c2.label}</div>
            </div>
          ))}
        </div>

        {/* 최근 세션 */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <h3 style={{color:c.t2,fontSize:11,fontWeight:500,letterSpacing:".06em",textTransform:"uppercase",margin:0}}>최근 세션</h3>
          <button onClick={()=>router.push("/charts")} style={{background:"linear-gradient(135deg,#1D9BF0,#00D4FF)",border:"none",borderRadius:20,padding:"5px 12px",color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer"}}>📊 차트 보기</button>
        </div>
        {sessions.length === 0 ? (
          <div style={{textAlign:'center',padding:'40px 0',color:c.t3}}>
            <div style={{fontSize:48,marginBottom:8}}>🏊</div>
            <p style={{color:c.t2}}>아직 기록이 없어요</p>
          </div>
        ) : sessions.slice(0,5).map(sess => (
          <div key={sess.id} style={{background:c.card,border:'1px solid rgba(0,212,255,.1)',borderRadius:14,padding:12,marginBottom:8}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{color:'#1D9BF0',fontWeight:700,fontSize:15}}>{fmtDist(sess.total_dist)}</span>
              <span style={{color:c.t3,fontSize:11}}>{sess.date}</span>
            </div>
            <div style={{color:c.t2,fontSize:11,marginTop:4}}>{sess.pool}m풀 · {sess.sets?.length}세트</div>
          </div>
        ))}
      </div>

      <nav style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',maxWidth:430,width:'100%',background:c.header,borderTop:'1px solid '+c.border,display:'flex',padding:'7px 0 10px'}}>
        {[
          {label:'홈',icon:'◈',href:'/dashboard'},
          {label:'추가',icon:'＋',href:'/add'},
          {label:'기록',icon:'≡',href:'/history'},
          {label:'통계',icon:'◉',href:'/stats'},
        ].map(n => (
          <button key={n.label} onClick={() => router.push(n.href)}
            style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2,background:'none',border:'none',cursor:'pointer',padding:'3px 0'}}>
            <div style={{width:34,height:34,borderRadius:10,background:n.href==='/dashboard'?'linear-gradient(135deg,#1D9BF0,#00D4FF)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,color:n.href==='/dashboard'?'#fff':c.t3}}>
              {n.icon}
            </div>
            <span style={{fontSize:10,color:n.href==='/dashboard'?'#1D9BF0':c.t3}}>{n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
