'use client'
import { createClient } from '@/lib/supabase'
import { Session } from '@/lib/types'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useDarkMode } from '@/lib/useDarkMode'

const fmtDist = (d: number) => d >= 1000 ? (d/1000).toFixed(1)+'km' : d+'m'

function getLevel(totalDist: number) {
  const thresholds = [0,1000,3000,6000,10000,15000,21000,30000,42000,60000,100000]
  const titles = ['수영 입문자','자유형 초보자','물에 익숙해진 자','영법 탐험가','레인 수호자','스트로크 마스터','수영 전사','엘리트 수영인','철인 수영가','수영의 신','전설의 수영인']
  let level = 1
  for (let i = 0; i < thresholds.length; i++) {
    if (totalDist >= thresholds[i]) level = i + 1
  }
  level = Math.min(level, 11)
  const currentThreshold = thresholds[level-1] || 0
  const nextThreshold = thresholds[level] || thresholds[thresholds.length-1]
  const progress = nextThreshold > currentThreshold
    ? Math.min(100, ((totalDist - currentThreshold) / (nextThreshold - currentThreshold)) * 100)
    : 100
  return { level, title: titles[level-1], progress, nextThreshold }
}

function getCharacter(level: number) {
  if (level <= 3) return '🏊'
  if (level <= 6) return '🏊‍♂️'
  if (level <= 9) return '🥇'
  return '👑'
}

function getStats(sessions: Session[]) {
  const catMap: Record<string,number> = {}
  sessions.forEach(sess => {
    sess.sets?.forEach((st: any) => {
      catMap[st.cat] = (catMap[st.cat]||0) + st.dist * st.count
    })
  })
  const total = sessions.reduce((s,x) => s+x.total_dist, 0) || 1
  return {
    endurance: Math.min(100, Math.round(((catMap['Easy']||0) + (catMap['Main']||0) * 0.5) / total * 200)),
    speed: Math.min(100, Math.round((catMap['Main']||0) / total * 150)),
    power: Math.min(100, Math.round((catMap['Kick']||0) / total * 300)),
    technique: Math.min(100, Math.round((catMap['Drill']||0) / total * 300)),
  }
}

function getFeedback(sessions: Session[], stats: any) {
  if (!sessions.length) return '첫 훈련을 기록해보세요! 🏊'
  const recent = sessions.slice(0, 3)
  const recentAvg = recent.reduce((s,x) => s+x.total_dist, 0) / recent.length
  const avg = sessions.reduce((s,x) => s+x.total_dist, 0) / sessions.length
  if (recentAvg > avg * 1.2) return '최근 훈련 강도가 높아졌어요! 지구력이 성장 중 💪'
  if (stats.technique > 60) return '드릴 훈련으로 테크닉이 향상되고 있어요 🎯'
  if (stats.power > 60) return '킥 파워가 좋아지고 있어요! 계속 유지해요 🦵'
  if (stats.speed > 60) return '스피드 훈련이 효과를 내고 있어요 ⚡'
  return '균형 잡힌 훈련을 이어가고 있어요 👍'
}

function getWeeklyMission(sessions: Session[]) {
  const now = new Date()
  const ws = new Date(now); ws.setDate(now.getDate() - now.getDay())
  const weekSessions = sessions.filter(s => new Date(s.date) >= ws)
  const weekDist = weekSessions.reduce((s,x) => s+x.total_dist, 0)
  const goal = 5000
  return { current: weekDist, goal, progress: Math.min(100, weekDist/goal*100), count: weekSessions.length }
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
    bg: dark ? '#040D1A' : '#F8FBFF',
    card: dark ? 'rgba(12,31,53,.9)' : '#fff',
    border: dark ? 'rgba(0,212,255,.1)' : '#EFF6FF',
    header: dark ? 'rgba(4,13,26,.97)' : '#fff',
    t1: dark ? '#EFF6FF' : '#1E293B',
    t2: dark ? '#7BA7C9' : '#64748B',
    t3: dark ? '#3D6B8A' : '#94A3B8',
    statBg: dark ? 'rgba(255,255,255,.06)' : '#EFF6FF',
    cardShadow: dark ? 'none' : '0 2px 12px rgba(0,0,0,.04)',
    navShadow: dark ? 'none' : '0 -4px 12px rgba(0,0,0,.04)',
  }

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const { data: profile } = await supabase.from('profiles').select('nickname').eq('id', user.id).single()
      if (!profile?.nickname) { router.push('/setup'); return }
      setNickname(profile.nickname)
      const { data } = await supabase.from('sessions').select('*, sets(*)').order('date', { ascending: false })
      setSessions(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const totalDist = sessions.reduce((s,x) => s+x.total_dist, 0)
  const levelInfo = getLevel(totalDist)
  const stats = useMemo(() => getStats(sessions), [sessions])
  const feedback = useMemo(() => getFeedback(sessions, stats), [sessions, stats])
  const mission = useMemo(() => getWeeklyMission(sessions), [sessions])
  const character = getCharacter(levelInfo.level)
  const today = new Date().toISOString().slice(0,10)
  const todaySessions = sessions.filter(s => s.date === today)
  const todayDist = todaySessions.reduce((s,x) => s+x.total_dist, 0)

  if (loading) return (
    <div style={{minHeight:'100vh',background:c.bg,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:48,marginBottom:12}}>🏊</div>
        <p style={{color:c.t2,fontSize:14}}>로딩 중...</p>
      </div>
    </div>
  )

  const StatBar = ({label, value, color}: {label:string, value:number, color:string}) => (
    <div style={{marginBottom:10}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
        <span style={{color:c.t2,fontSize:12,fontWeight:500}}>{label}</span>
        <span style={{color,fontSize:12,fontWeight:700}}>{value}</span>
      </div>
      <div style={{height:8,background:c.statBg,borderRadius:4,overflow:'hidden'}}>
        <div style={{height:'100%',width:value+'%',background:`linear-gradient(90deg,${color}88,${color})`,borderRadius:4,transition:'width 1s ease'}}/>
      </div>
    </div>
  )

  return (
    <div style={{maxWidth:430,margin:'0 auto',minHeight:'100vh',background:c.bg,paddingBottom:100,fontFamily:'sans-serif'}}>

      {/* 헤더 */}
      <header style={{background:c.header,borderBottom:'1px solid '+c.border,padding:'12px 16px',position:'sticky',top:0,zIndex:100,boxShadow:dark?'none':'0 1px 8px rgba(29,155,240,.06)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <Image src="/logo.png" alt="MOSU" width={40} height={40}/>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{color:c.t2,fontSize:13}}>안녕하세요, <strong style={{color:'#1D9BF0'}}>{nickname}</strong>님!</span>
            <button onClick={async()=>{await supabase.auth.signOut();router.push('/login')}}
              style={{width:32,height:32,borderRadius:'50%',background:c.statBg,border:'none',cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center'}}>
              👤
            </button>
          </div>
        </div>
      </header>

      <div style={{padding:'16px'}}>

        {/* 캐릭터 & 레벨 카드 */}
        <div style={{
          background:'linear-gradient(135deg,#1D9BF0,#00D4FF)',
          borderRadius:24,padding:'20px 20px 16px',
          marginBottom:14,position:'relative',overflow:'hidden',
          boxShadow:'0 8px 32px rgba(29,155,240,.3)'
        }}>
          <div style={{position:'absolute',top:-30,right:-30,width:120,height:120,borderRadius:'50%',background:'rgba(255,255,255,.1)'}}/>
          <div style={{position:'absolute',bottom:-20,left:-20,width:80,height:80,borderRadius:'50%',background:'rgba(255,255,255,.08)'}}/>

          <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:14,position:'relative'}}>
            <div style={{width:72,height:72,borderRadius:20,background:'rgba(255,255,255,.25)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:36,border:'2px solid rgba(255,255,255,.4)'}}>
              {character}
            </div>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                <span style={{background:'rgba(255,255,255,.3)',borderRadius:20,padding:'2px 10px',fontSize:12,fontWeight:700,color:'#fff'}}>
                  Lv.{levelInfo.level}
                </span>
                <span style={{color:'rgba(255,255,255,.85)',fontSize:12}}>{levelInfo.title}</span>
              </div>
              <div style={{color:'#fff',fontWeight:800,fontSize:20,letterSpacing:'-.3px'}}>{nickname}</div>
              <div style={{color:'rgba(255,255,255,.7)',fontSize:11,marginTop:2}}>총 거리 {fmtDist(totalDist)}</div>
            </div>
          </div>

          <div>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
              <span style={{color:'rgba(255,255,255,.8)',fontSize:11}}>경험치</span>
              <span style={{color:'rgba(255,255,255,.8)',fontSize:11}}>{Math.round(levelInfo.progress)}% · 다음까지 {fmtDist(Math.max(0,levelInfo.nextThreshold-totalDist))}</span>
            </div>
            <div style={{height:10,background:'rgba(255,255,255,.25)',borderRadius:5,overflow:'hidden'}}>
              <div style={{height:'100%',width:levelInfo.progress+'%',background:'rgba(255,255,255,.9)',borderRadius:5,transition:'width 1s ease',boxShadow:'0 0 8px rgba(255,255,255,.6)'}}/>
            </div>
          </div>
        </div>

        {/* 오늘의 훈련 */}
        <div style={{background:c.card,borderRadius:20,padding:16,marginBottom:14,boxShadow:c.cardShadow,border:'1px solid '+c.border}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <p style={{color:c.t1,fontSize:14,fontWeight:700,margin:0}}>오늘의 훈련</p>
            <span style={{color:c.t3,fontSize:11}}>{today}</span>
          </div>
          {todaySessions.length > 0 ? (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <div style={{background:dark?'rgba(29,155,240,.15)':'#EFF6FF',borderRadius:14,padding:'12px 10px',textAlign:'center'}}>
                <div style={{fontWeight:800,fontSize:20,color:'#1D9BF0'}}>{fmtDist(todayDist)}</div>
                <div style={{color:c.t2,fontSize:11,marginTop:2}}>총 거리</div>
              </div>
              <div style={{background:dark?'rgba(16,185,129,.15)':'#F0FFF4',borderRadius:14,padding:'12px 10px',textAlign:'center'}}>
                <div style={{fontWeight:800,fontSize:20,color:'#10B981'}}>{todaySessions.reduce((s,x)=>s+(x.sets?.length||0),0)}</div>
                <div style={{color:c.t2,fontSize:11,marginTop:2}}>총 세트</div>
              </div>
            </div>
          ) : (
            <div style={{textAlign:'center',padding:'16px 0',color:c.t3}}>
              <div style={{fontSize:32,marginBottom:6}}>🏊</div>
              <p style={{fontSize:13,margin:0,color:c.t2}}>오늘 아직 훈련 기록이 없어요</p>
            </div>
          )}
        </div>

        {/* 능력치 */}
        <div style={{background:c.card,borderRadius:20,padding:16,marginBottom:14,boxShadow:c.cardShadow,border:'1px solid '+c.border}}>
          <p style={{color:c.t1,fontSize:14,fontWeight:700,margin:'0 0 14px'}}>⚡ 능력치</p>
          <StatBar label="지구력" value={stats.endurance} color="#1D9BF0"/>
          <StatBar label="스피드" value={stats.speed} color="#F472B6"/>
          <StatBar label="파워" value={stats.power} color="#F59E0B"/>
          <StatBar label="테크닉" value={stats.technique} color="#10B981"/>
        </div>

        {/* 피드백 */}
        <div style={{
          background:dark?'rgba(29,155,240,.1)':'linear-gradient(135deg,#F0F9FF,#E0F2FE)',
          borderRadius:20,padding:16,marginBottom:14,
          border:'1px solid '+(dark?'rgba(29,155,240,.2)':'#BAE6FD'),
          display:'flex',alignItems:'flex-start',gap:10
        }}>
          <span style={{fontSize:24,flexShrink:0}}>💬</span>
          <div>
            <p style={{color:'#1D9BF0',fontSize:12,fontWeight:600,margin:'0 0 4px'}}>코치 피드백</p>
            <p style={{color:c.t1,fontSize:14,fontWeight:500,margin:0,lineHeight:1.5}}>{feedback}</p>
          </div>
        </div>

        {/* 주간 미션 */}
        <div style={{background:c.card,borderRadius:20,padding:16,marginBottom:14,boxShadow:c.cardShadow,border:'1px solid '+c.border}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <p style={{color:c.t1,fontSize:14,fontWeight:700,margin:0}}>🎯 주간 미션</p>
            <span style={{background:dark?'rgba(29,155,240,.15)':'#EFF6FF',borderRadius:20,padding:'3px 10px',fontSize:11,fontWeight:600,color:'#1D9BF0'}}>
              {mission.count}회 완료
            </span>
          </div>
          <p style={{color:c.t2,fontSize:12,margin:'0 0 8px'}}>이번 주 5,000m 달성하기</p>
          <div style={{height:10,background:c.statBg,borderRadius:5,overflow:'hidden',marginBottom:6}}>
            <div style={{height:'100%',width:mission.progress+'%',background:'linear-gradient(90deg,#1D9BF0,#00D4FF)',borderRadius:5,transition:'width 1s ease'}}/>
          </div>
          <div style={{display:'flex',justifyContent:'space-between'}}>
            <span style={{color:c.t2,fontSize:11}}>{fmtDist(mission.current)}</span>
            <span style={{color:'#1D9BF0',fontSize:11,fontWeight:600}}>{Math.round(mission.progress)}%</span>
            <span style={{color:c.t2,fontSize:11}}>5km</span>
          </div>
        </div>

        {/* CTA 버튼 */}
        <div style={{display:'flex',gap:10}}>
          <button onClick={()=>router.push('/history')} style={{
            flex:1,padding:'14px',border:'1.5px solid #1D9BF0',borderRadius:16,
            background:'transparent',color:'#1D9BF0',fontSize:14,fontWeight:600,cursor:'pointer'
          }}>
            📋 전체 기록
          </button>
          <button onClick={()=>router.push('/add')} style={{
            flex:1,padding:'14px',border:'none',borderRadius:16,
            background:'linear-gradient(135deg,#1D9BF0,#00D4FF)',
            color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer',
            boxShadow:'0 4px 16px rgba(29,155,240,.35)'
          }}>
            ➕ 훈련 추가
          </button>
        </div>

      </div>

      {/* 하단 네비 */}
      <nav style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',maxWidth:430,width:'100%',background:c.header,borderTop:'1px solid '+c.border,display:'flex',padding:'8px 0 12px',boxShadow:c.navShadow}}>
        {[
          {label:'홈',icon:'◈',href:'/dashboard'},
          {label:'추가',icon:'＋',href:'/add'},
          {label:'기록',icon:'≡',href:'/history'},
          {label:'정보',icon:'◉',href:'/stats'},
        ].map(n=>(
          <button key={n.label} onClick={()=>router.push(n.href)}
            style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2,background:'none',border:'none',cursor:'pointer',padding:'3px 0'}}>
            <div style={{
              width:36,height:36,borderRadius:12,
              background:n.href==='/dashboard'?'linear-gradient(135deg,#1D9BF0,#00D4FF)':'transparent',
              display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:16,color:n.href==='/dashboard'?'#fff':c.t3,
              boxShadow:n.href==='/dashboard'?'0 4px 12px rgba(29,155,240,.35)':'none'
            }}>{n.icon}</div>
            <span style={{fontSize:10,color:n.href==='/dashboard'?'#1D9BF0':c.t3,fontWeight:n.href==='/dashboard'?600:400}}>{n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
