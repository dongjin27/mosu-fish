'use client'
import { createClient } from '@/lib/supabase'
import { Session } from '@/lib/types'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDarkMode } from '@/lib/useDarkMode'

const fmtDist = (d: number) => d >= 1000 ? (d/1000).toFixed(1)+'km' : d+'m'
const MNAMES = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']
const CCOL: Record<string,string> = {"Warm Up":"#F59E0B","Drill":"#A78BFA","Kick":"#F472B6","Main":"#1D9BF0","Easy":"#10B981","Pull":"#00D4FF","Swim":"#818CF8"}
const GRADS = [["#1D9BF0","#00D4FF"],["#A78BFA","#818CF8"],["#F472B6","#F59E0B"],["#10B981","#0FF5C0"]]
const BADGES = [
  {id:'first',icon:'🌊',name:'첫 수영',desc:'첫 세션 기록',color:'#1D9BF0',check:(s:Session[])=>s.length>=1},
  {id:'km1',icon:'🏅',name:'1km 돌파',desc:'누적 1km',color:'#F59E0B',check:(s:Session[])=>s.reduce((a,x)=>a+x.total_dist,0)>=1000},
  {id:'km10',icon:'🥈',name:'10km 돌파',desc:'누적 10km',color:'#94A3B8',check:(s:Session[])=>s.reduce((a,x)=>a+x.total_dist,0)>=10000},
  {id:'km50',icon:'🥇',name:'50km 돌파',desc:'누적 50km',color:'#F59E0B',check:(s:Session[])=>s.reduce((a,x)=>a+x.total_dist,0)>=50000},
  {id:'km100',icon:'💎',name:'100km 돌파',desc:'누적 100km',color:'#00D4FF',check:(s:Session[])=>s.reduce((a,x)=>a+x.total_dist,0)>=100000},
  {id:'str3',icon:'🔥',name:'3일 연속',desc:'3일 연속 수영',color:'#F472B6',check:(s:Session[])=>s.length>=3},
  {id:'str7',icon:'⚡',name:'7일 연속',desc:'7일 연속 수영',color:'#A78BFA',check:(s:Session[])=>s.length>=7},
  {id:'str30',icon:'👑',name:'30일 연속',desc:'30일 연속 수영',color:'#F59E0B',check:(s:Session[])=>s.length>=30},
  {id:'s10',icon:'📈',name:'10회 세션',desc:'세션 10회',color:'#10B981',check:(s:Session[])=>s.length>=10},
  {id:'s50',icon:'🏆',name:'50회 세션',desc:'세션 50회',color:'#F59E0B',check:(s:Session[])=>s.length>=50},
  {id:'long3k',icon:'🦈',name:'단일 3km',desc:'한 세션 3km 이상',color:'#00D4FF',check:(s:Session[])=>s.some(x=>x.total_dist>=3000)},
  {id:'fly5',icon:'🦋',name:'접영 마스터',desc:'접영 세션 5회',color:'#F472B6',check:(s:Session[])=>s.filter(x=>x.sets?.some((st:any)=>st.stroke==='접영')).length>=5},
]

function curStreak(sessions: Session[]) {
  if (!sessions.length) return 0
  const dates = [...new Set(sessions.map(x => x.date))].sort().reverse()
  const today = new Date().toISOString().slice(0,10)
  const yest = new Date(); yest.setDate(yest.getDate()-1)
  const yestStr = yest.toISOString().slice(0,10)
  if (dates[0] !== today && dates[0] !== yestStr) return 0
  let streak = 1
  for (let i = 1; i < dates.length; i++) {
    const diff = (new Date(dates[i-1]).getTime() - new Date(dates[i]).getTime()) / 86400000
    if (diff === 1) streak++; else break
  }
  return streak
}

export default function StatsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [user, setUser] = useState<any>(null)
  const [nickname, setNickname] = useState("")
  const [loading, setLoading] = useState(true)
  const { dark, toggle } = useDarkMode()
  const [showModal, setShowModal] = useState(false)
  const [defaultPool, setDefaultPool] = useState(25)
  const [distUnit, setDistUnit] = useState('m/km')
  const [weekStart, setWeekStart] = useState('일')
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const now = new Date()
  const [ym, setYm] = useState(now.getFullYear()*100+now.getMonth())
  const [selDay, setSelDay] = useState<number|null>(null)
  const [draft, setDraft] = useState({weekDist:0,weekSess:0,monthDist:0,monthSess:0})
  const [savedGoal, setSavedGoal] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const year = Math.floor(ym/100), month = ym%100
  const prevMo = () => setYm(month===0?(year-1)*100+11:year*100+month-1)
  const nextMo = () => setYm(month===11?(year+1)*100+0:year*100+month+1)

  const c = {
    bg: dark?'#040D1A':'#F0F4F8',
    card: dark?'rgba(12,31,53,.85)':'#fff',
    border: dark?'rgba(0,212,255,.1)':'#E2E8F0',
    t1: dark?'#EFF6FF':'#1E293B',
    t2: dark?'#7BA7C9':'#64748B',
    t3: dark?'#3D6B8A':'#94A3B8',
    inp: dark?'rgba(255,255,255,.05)':'#F8FAFC',
    inpBorder: dark?'rgba(0,212,255,.2)':'#CBD5E1',
  }

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      const { data: profile } = await supabase.from("profiles").select("nickname").eq("id", user.id).single()
      if (profile?.nickname) setNickname(profile.nickname)
      const { data } = await supabase.from('sessions').select('*, sets(*)').order('date', { ascending: false })
      setSessions(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const totalDist = sessions.reduce((s,x) => s+x.total_dist, 0)
  const streak = curStreak(sessions)
  const earned = BADGES.filter(b => b.check(sessions))
  const earnedIds = earned.map(b => b.id)
  const joinDate = sessions.length ? [...sessions].sort((a,b) => new Date(a.date).getTime()-new Date(b.date).getTime())[0].date : ''
  const g = GRADS[0]

  const sessMap: Record<number, Session[]> = {}
  sessions.forEach(s => {
    const d = new Date(s.date)
    if (d.getFullYear()===year && d.getMonth()===month) {
      const k = d.getDate()
      if (!sessMap[k]) sessMap[k] = []
      sessMap[k].push(s)
    }
  })
  const firstDay = new Date(year,month,1).getDay()
  const daysInMonth = new Date(year,month+1,0).getDate()
  const todayKey = now.getFullYear()===year && now.getMonth()===month ? now.getDate() : null
  const cells: (number|null)[] = []
  for (let i=0;i<firstDay;i++) cells.push(null)
  for (let d=1;d<=daysInMonth;d++) cells.push(d)
  const monthSessCount = Object.keys(sessMap).reduce((a,k) => a+sessMap[+k].length, 0)
  const monthDistSum = sessions.filter(s => { const d=new Date(s.date); return d.getFullYear()===year && d.getMonth()===month }).reduce((a,x) => a+x.total_dist, 0)
  const DAYS = ['일','월','화','수','목','금','토']

  const ws = new Date(now); ws.setDate(now.getDate()-now.getDay())
  const ms2 = new Date(now.getFullYear(),now.getMonth(),1)
  const weekD = sessions.filter(s => new Date(s.date)>=ws).reduce((a,x) => a+x.total_dist, 0)
  const monthD = sessions.filter(s => new Date(s.date)>=ms2).reduce((a,x) => a+x.total_dist, 0)
  const weekS = sessions.filter(s => new Date(s.date)>=ws).length
  const monthS = sessions.filter(s => new Date(s.date)>=ms2).length

  const catMap: Record<string,number> = {}
  sessions.forEach(sess => sess.sets?.forEach((st:any) => { catMap[st.cat]=(catMap[st.cat]||0)+st.dist*st.count }))
  const catData = Object.entries(catMap).map(([name,value]) => ({name,value,color:CCOL[name]||c.t2})).sort((a,b) => b.value-a.value)

  const SL = ({text,mt=0}:{text:string,mt?:number}) => (
    <p style={{color:c.t2,fontSize:11,fontWeight:600,letterSpacing:'.07em',textTransform:'uppercase' as const,marginBottom:10,marginTop:mt}}>{text}</p>
  )

  function GoalRow({cur,target,label,unit,color}:{cur:number,target:number,label:string,unit:string,color:string}) {
    const pct = target>0 ? Math.min(1,cur/target) : 0
    const done = pct>=1
    return (
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid '+c.border}}>
        <div style={{position:'relative',flexShrink:0,width:46,height:46}}>
          <svg width={46} height={46} viewBox="0 0 48 48">
            <circle cx={24} cy={24} r={20} fill="none" stroke="rgba(125,125,125,.12)" strokeWidth={5}/>
            <circle cx={24} cy={24} r={20} fill="none" stroke={done?color:'rgba(0,212,255,.35)'} strokeWidth={5}
              strokeDasharray={`${2*Math.PI*20*pct} ${2*Math.PI*20*(1-pct)}`} strokeLinecap="round" transform="rotate(-90 24 24)"/>
          </svg>
          {done && <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',fontSize:12,color,fontWeight:700}}>✓</div>}
        </div>
        <div style={{flex:1}}>
          <div style={{color:c.t2,fontSize:11,marginBottom:2}}>{label}</div>
          <div style={{display:'flex',alignItems:'baseline',gap:3}}>
            <span style={{fontWeight:700,fontSize:16,color:done?color:c.t1}}>{unit==='km'?fmtDist(cur):cur}</span>
            <span style={{color:c.t3,fontSize:11}}> / {unit==='km'?fmtDist(target):target+unit}</span>
          </div>
          <div style={{height:3,background:'rgba(125,125,125,.12)',borderRadius:2,marginTop:4,overflow:'hidden'}}>
            <div style={{height:'100%',width:(pct*100)+'%',background:`linear-gradient(90deg,${color},${color}bb)`,borderRadius:2,transition:'width .6s ease'}}/>
          </div>
        </div>
      </div>
    )
  }

  const handleReset = async () => {
    if (!confirmReset) { setConfirmReset(true); setTimeout(()=>setConfirmReset(false),3000); return }
    await supabase.from('sessions').delete().eq('user_id', user?.id)
    setSessions([])
    setConfirmReset(false)
  }

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); setTimeout(()=>setConfirmDelete(false),3000); return }
    await supabase.rpc('delete_user')
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <div style={{minHeight:'100vh',background:c.bg,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <p style={{color:c.t2}}>로딩 중...</p>
    </div>
  )

  return (
    <div style={{maxWidth:430,margin:'0 auto',minHeight:'100vh',background:c.bg,paddingBottom:80,fontFamily:'sans-serif'}}>
      <header style={{background:dark?'rgba(4,13,26,.97)':'rgba(255,255,255,.97)',borderBottom:'1px solid '+c.border,padding:'12px 16px',position:'sticky',top:0,zIndex:100}}>
        <h2 style={{color:c.t1,fontWeight:800,fontSize:20,margin:0}}>정보</h2>
      </header>

      <div style={{padding:'12px 16px 20px'}}>

        {/* 프로필 카드 */}
        <div style={{background:c.card,border:'1px solid '+c.border,borderRadius:18,padding:'18px 16px',marginBottom:14}}>
          <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:14}}>
            <div style={{width:56,height:56,borderRadius:18,background:`linear-gradient(135deg,${g[0]},${g[1]})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,fontWeight:800,color:'#fff',flexShrink:0,boxShadow:`0 4px 16px ${g[0]}44`}}>
              {nickname[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{fontWeight:800,fontSize:18,color:c.t1,letterSpacing:'-.3px'}}>{nickname}</div>
              {joinDate && <div style={{color:c.t3,fontSize:11,marginTop:2}}>시작일: {joinDate}</div>}
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>
            {[
              {label:'총 거리',value:fmtDist(totalDist),color:'#1D9BF0'},
              {label:'세션',value:sessions.length+'회',color:'#A78BFA'},
              {label:'연속',value:streak+'일',color:'#F472B6'},
            ].map((s,i) => (
              <div key={i} style={{background:dark?'rgba(255,255,255,.04)':'rgba(0,0,0,.03)',borderRadius:11,padding:'10px 8px',textAlign:'center'}}>
                <div style={{fontWeight:700,fontSize:15,color:s.color}}>{s.value}</div>
                <div style={{color:c.t3,fontSize:10,marginTop:2}}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 뱃지 */}
        <SL text="뱃지"/>
        <div style={{background:c.card,border:'1px solid '+c.border,borderRadius:16,padding:14,marginBottom:14}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <div style={{display:'flex',gap:4}}>
              {[0,1,2].map(i => {
                const b = earned[i]
                return (
                  <div key={i} style={{width:44,height:44,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,background:b?b.color+'18':dark?'rgba(255,255,255,.04)':'rgba(0,0,0,.04)',border:'1px solid '+(b?b.color+'35':c.border),position:'relative'}}>
                    {b ? b.icon : <span style={{color:c.t3,fontSize:16}}>?</span>}
                    {b && <div style={{position:'absolute',bottom:-2,right:-2,width:14,height:14,borderRadius:'50%',background:'#10B981',border:'2px solid '+c.card,display:'flex',alignItems:'center',justifyContent:'center',fontSize:7,color:'#fff'}}>✓</div>}
                  </div>
                )
              })}
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontWeight:700,fontSize:16,color:'#F59E0B'}}>{earned.length} / {BADGES.length}</div>
              <div style={{color:c.t3,fontSize:10,marginTop:1}}>획득</div>
            </div>
          </div>
          <div style={{height:5,background:'rgba(125,125,125,.1)',borderRadius:3,overflow:'hidden',marginBottom:12}}>
            <div style={{height:'100%',width:(earned.length/BADGES.length*100)+'%',background:'linear-gradient(90deg,#F59E0B,#F472B6)',borderRadius:3}}/>
          </div>
          <button onClick={()=>setShowModal(true)} style={{width:'100%',padding:'10px',background:'rgba(245,158,11,.08)',border:'1px solid rgba(245,158,11,.25)',borderRadius:10,color:'#F59E0B',fontSize:13,fontWeight:600,cursor:'pointer'}}>
            🏅 전체 뱃지 보기
          </button>
        </div>

        {/* 캘린더 */}
        <SL text="캘린더"/>
        <div style={{background:c.card,border:'1px solid '+c.border,borderRadius:16,padding:14,marginBottom:14}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
            <button onClick={prevMo} style={{width:30,height:30,background:dark?'rgba(255,255,255,.06)':'#F1F5F9',border:'none',borderRadius:8,color:c.t2,cursor:'pointer',fontSize:14}}>‹</button>
            <div style={{textAlign:'center'}}>
              <div style={{fontWeight:700,fontSize:15,color:c.t1}}>{year}년 {MNAMES[month]}</div>
              <div style={{color:c.t3,fontSize:10,marginTop:1}}>{monthSessCount}회 · {fmtDist(monthDistSum)}</div>
            </div>
            <button onClick={nextMo} style={{width:30,height:30,background:dark?'rgba(255,255,255,.06)':'#F1F5F9',border:'none',borderRadius:8,color:c.t2,cursor:'pointer',fontSize:14}}>›</button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:3}}>
            {DAYS.map((d,i) => <div key={d} style={{textAlign:'center',color:i===0?'#F472B6':i===6?'#1D9BF0':c.t3,fontSize:10,fontWeight:500,padding:'3px 0'}}>{d}</div>)}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2}}>
            {cells.map((day,ci) => {
              if (!day) return <div key={'e'+ci}/>
              const hasSess = !!sessMap[day]
              const isToday = day===todayKey, isSel = day===selDay
              const intensity = hasSess ? Math.min(1, sessMap[day].reduce((a,s)=>a+s.total_dist,0)/4000) : 0
              return (
                <div key={day} onClick={()=>setSelDay(isSel?null:day)} style={{
                  aspectRatio:'1',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                  borderRadius:8,cursor:'pointer',
                  background:isSel?'rgba(29,155,240,.25)':hasSess?`rgba(0,212,255,${0.07+intensity*0.18})`:dark?'rgba(255,255,255,.02)':'rgba(0,0,0,.02)',
                  border:isSel?'1px solid rgba(0,212,255,.55)':isToday?'1px solid rgba(0,212,255,.35)':'1px solid transparent',
                }}>
                  <span style={{fontSize:11,fontWeight:isToday?700:400,color:isToday?'#00D4FF':hasSess?c.t1:c.t3}}>{day}</span>
                  {hasSess && <div style={{width:3,height:3,borderRadius:'50%',background:'#00D4FF',marginTop:1}}/>}
                </div>
              )
            })}
          </div>
          {selDay && sessMap[selDay] && (
            <div style={{marginTop:10,padding:10,background:dark?'rgba(0,212,255,.05)':'rgba(29,155,240,.05)',borderRadius:10,border:'1px solid rgba(0,212,255,.12)'}}>
              <p style={{color:c.t2,fontSize:11,marginBottom:6,fontWeight:600}}>{month+1}월 {selDay}일</p>
              {sessMap[selDay].map((s,i) => (
                <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:i<sessMap[selDay].length-1?'1px solid '+c.border:'none'}}>
                  <span style={{fontWeight:700,fontSize:14,color:'#1D9BF0'}}>{fmtDist(s.total_dist)}</span>
                  <span style={{background:'rgba(0,212,255,.1)',color:'#00D4FF',fontSize:10,padding:'2px 6px',borderRadius:20}}>{s.pool}m풀</span>
                  <span style={{color:c.t3,fontSize:11,marginLeft:'auto'}}>{s.sets?.length}세트</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 목표 설정 */}
        <SL text="목표 설정"/>
        <div style={{background:c.card,border:'1px solid '+c.border,borderRadius:16,padding:14,marginBottom:14}}>
          <p style={{color:c.t2,fontSize:11,fontWeight:600,letterSpacing:'.06em',textTransform:'uppercase' as const,marginBottom:8,marginTop:0}}>이번 주</p>
          <GoalRow label="거리" cur={weekD} target={draft.weekDist*1000} unit="km" color="#1D9BF0"/>
          <GoalRow label="세션" cur={weekS} target={draft.weekSess} unit="회" color="#0FF5C0"/>
          <p style={{color:c.t2,fontSize:11,fontWeight:600,letterSpacing:'.06em',textTransform:'uppercase' as const,marginBottom:8,marginTop:10}}>이번 달</p>
          <GoalRow label="거리" cur={monthD} target={draft.monthDist*1000} unit="km" color="#A78BFA"/>
          <GoalRow label="세션" cur={monthS} target={draft.monthSess} unit="회" color="#F59E0B"/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:12}}>
            {[{key:'weekDist',label:'주간 거리(km)'},{key:'weekSess',label:'주간 세션(회)'},{key:'monthDist',label:'월간 거리(km)'},{key:'monthSess',label:'월간 세션(회)'}].map(item => (
              <div key={item.key}>
                <label style={{display:'block',color:c.t2,fontSize:10,marginBottom:3}}>{item.label}</label>
                <input type="number" value={(draft as any)[item.key]||''} min={0}
                  onChange={e => setDraft(p => ({...p,[item.key]:+e.target.value}))}
                  style={{width:'100%',background:c.inp,border:'1px solid '+c.inpBorder,borderRadius:8,padding:'7px 9px',color:c.t1,fontSize:13,outline:'none'}}/>
              </div>
            ))}
          </div>
          <button onClick={()=>setSavedGoal(true)} style={{width:'100%',padding:'11px',marginTop:10,border:'none',borderRadius:10,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',background:savedGoal?'linear-gradient(135deg,#10B981,#0FF5C0)':'linear-gradient(135deg,#1D9BF0,#00D4FF)'}}>
            {savedGoal?'✓ 저장됨':'목표 저장'}
          </button>
        </div>

        {/* 환경 설정 */}
        <SL text="환경 설정"/>
        <div style={{background:c.card,border:'1px solid '+c.border,borderRadius:16,overflow:'hidden',marginBottom:14}}>

          {/* 다크 모드 */}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 16px',borderBottom:'1px solid '+c.border}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:32,height:32,borderRadius:9,background:'rgba(29,155,240,.12)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15}}>{dark?'🌙':'☀️'}</div>
              <div>
                <div style={{color:c.t1,fontSize:13,fontWeight:500}}>다크 모드</div>
                <div style={{color:c.t3,fontSize:11,marginTop:1}}>{dark?'어두운 테마 사용 중':'밝은 테마 사용 중'}</div>
              </div>
            </div>
            <div onClick={toggle} style={{width:46,height:26,borderRadius:13,position:'relative',cursor:'pointer',background:dark?'linear-gradient(135deg,#1D9BF0,#00D4FF)':'#CBD5E1',transition:'background .3s',flexShrink:0}}>
              <div style={{position:'absolute',top:4,left:dark?22:4,width:18,height:18,borderRadius:'50%',background:'#fff',boxShadow:'0 1px 4px rgba(0,0,0,.2)',transition:'left .25s ease'}}/>
            </div>
          </div>

          {/* 기본 풀 길이 */}
          <div style={{padding:'14px 16px',borderBottom:'1px solid '+c.border}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
              <div style={{width:32,height:32,borderRadius:9,background:'rgba(0,212,255,.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15}}>🏊</div>
              <div>
                <div style={{color:c.t1,fontSize:13,fontWeight:500}}>기본 풀 길이</div>
                <div style={{color:c.t3,fontSize:11,marginTop:1}}>세션 추가 시 기본값</div>
              </div>
            </div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap' as const}}>
              {[25,50,100,200,400].map(m => (
                <button key={m} onClick={()=>setDefaultPool(m)} style={{padding:'6px 12px',borderRadius:8,border:'1px solid '+(defaultPool===m?'#1D9BF0':c.inpBorder),background:defaultPool===m?'linear-gradient(135deg,#1D9BF0,#00D4FF)':c.inp,color:defaultPool===m?'#fff':c.t2,fontSize:12,fontWeight:600,cursor:'pointer'}}>{m}m</button>
              ))}
              <button onClick={()=>setDefaultPool(-1)} style={{padding:'6px 12px',borderRadius:8,border:'1px solid '+(![25,50,100,200,400].includes(defaultPool)?'#A78BFA':c.inpBorder),background:![25,50,100,200,400].includes(defaultPool)?'linear-gradient(135deg,#A78BFA,#818CF8)':c.inp,color:![25,50,100,200,400].includes(defaultPool)?'#fff':c.t2,fontSize:12,fontWeight:600,cursor:'pointer'}}>직접 입력</button>
            </div>
            {![25,50,100,200,400].includes(defaultPool) && (
              <div style={{display:'flex',alignItems:'center',gap:8,marginTop:10}}>
                <input type="number" min={1} max={5000} placeholder="예: 33" onChange={e=>setDefaultPool(+e.target.value)}
                  style={{flex:1,background:c.inp,border:'1px solid #A78BFA',borderRadius:8,padding:'8px 10px',color:c.t1,fontSize:14,outline:'none'}}/>
                <span style={{color:c.t2,fontSize:13,fontWeight:500}}>m</span>
              </div>
            )}
          </div>

          {/* 거리 단위 */}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 16px',borderBottom:'1px solid '+c.border}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:32,height:32,borderRadius:9,background:'rgba(167,139,250,.12)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15}}>📏</div>
              <div>
                <div style={{color:c.t1,fontSize:13,fontWeight:500}}>거리 단위</div>
                <div style={{color:c.t3,fontSize:11,marginTop:1}}>통계 표시 기준</div>
              </div>
            </div>
            <div style={{display:'flex',borderRadius:8,overflow:'hidden',border:'1px solid '+c.border}}>
              {['m/km','야드'].map(u => (
                <button key={u} onClick={()=>setDistUnit(u)} style={{padding:'6px 12px',border:'none',fontSize:12,fontWeight:600,cursor:'pointer',background:distUnit===u?'linear-gradient(135deg,#1D9BF0,#00D4FF)':c.inp,color:distUnit===u?'#fff':c.t2}}>{u}</button>
              ))}
            </div>
          </div>

          {/* 주 시작 요일 */}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 16px',borderBottom:'1px solid '+c.border}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:32,height:32,borderRadius:9,background:'rgba(245,158,11,.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15}}>📅</div>
              <div>
                <div style={{color:c.t1,fontSize:13,fontWeight:500}}>주 시작 요일</div>
                <div style={{color:c.t3,fontSize:11,marginTop:1}}>주간 목표 계산 기준</div>
              </div>
            </div>
            <div style={{display:'flex',borderRadius:8,overflow:'hidden',border:'1px solid '+c.border}}>
              {['일','월'].map(d => (
                <button key={d} onClick={()=>setWeekStart(d)} style={{padding:'6px 12px',border:'none',fontSize:12,fontWeight:600,cursor:'pointer',background:weekStart===d?'linear-gradient(135deg,#1D9BF0,#00D4FF)':c.inp,color:weekStart===d?'#fff':c.t2}}>{d}요일</button>
              ))}
            </div>
          </div>

          {/* 데이터 초기화 */}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 16px',borderBottom:'1px solid '+c.border}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:32,height:32,borderRadius:9,background:'rgba(239,68,68,.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15}}>🗑️</div>
              <div>
                <div style={{color:'#EF4444',fontSize:13,fontWeight:500}}>내 데이터 초기화</div>
                <div style={{color:c.t3,fontSize:11,marginTop:1}}>모든 세션 기록 삭제</div>
              </div>
            </div>
            <button onClick={handleReset} style={{padding:'6px 14px',background:confirmReset?'rgba(239,68,68,.25)':'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.35)',borderRadius:8,color:'#EF4444',fontSize:12,fontWeight:600,cursor:'pointer'}}>
              {confirmReset?'정말 삭제':'초기화'}
            </button>
          </div>

          {/* 회원 탈퇴 */}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 16px'}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:32,height:32,borderRadius:9,background:'rgba(239,68,68,.08)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15}}>👋</div>
              <div>
                <div style={{color:'#EF4444',fontSize:13,fontWeight:500}}>회원 탈퇴</div>
                <div style={{color:c.t3,fontSize:11,marginTop:1}}>계정 및 모든 데이터 삭제</div>
              </div>
            </div>
            <button onClick={handleDelete} style={{padding:'6px 14px',background:confirmDelete?'rgba(239,68,68,.25)':'rgba(239,68,68,.06)',border:'1px solid rgba(239,68,68,.25)',borderRadius:8,color:'#EF4444',fontSize:12,fontWeight:600,cursor:'pointer'}}>
              {confirmDelete?'정말 탈퇴':'탈퇴'}
            </button>
          </div>

        </div>
      </div>

      {/* 뱃지 모달 */}
      {showModal && (
        <div onClick={()=>setShowModal(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.65)',zIndex:999,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
          <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxWidth:430,background:dark?'#0C1F35':'#fff',borderRadius:'20px 20px 0 0',padding:'20px 16px 32px'}}>
            <div style={{width:36,height:4,borderRadius:2,background:dark?'rgba(255,255,255,.15)':'#E2E8F0',margin:'0 auto 16px'}}/>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <span style={{fontWeight:700,fontSize:16,color:c.t1}}>전체 뱃지</span>
              <div style={{background:'linear-gradient(135deg,#F59E0B,#F472B6)',borderRadius:20,padding:'3px 11px',fontSize:12,fontWeight:700,color:'#fff'}}>{earned.length} / {BADGES.length}</div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,maxHeight:'60vh',overflowY:'auto'}}>
              {BADGES.map(b => {
                const isE = earnedIds.includes(b.id)
                return (
                  <div key={b.id} style={{background:isE?c.card:dark?'rgba(12,31,53,.4)':'#F1F5F9',border:`1px solid ${isE?b.color+'40':c.border}`,borderRadius:13,padding:'12px 10px',opacity:isE?1:0.4}}>
                    <div style={{fontSize:24,marginBottom:5}}>{b.icon}</div>
                    <div style={{fontWeight:700,fontSize:12,color:isE?b.color:c.t3,marginBottom:2}}>{b.name}</div>
                    <div style={{fontSize:10,color:c.t3}}>{b.desc}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <nav style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',maxWidth:430,width:'100%',background:dark?'rgba(4,13,26,.97)':'rgba(255,255,255,.97)',borderTop:'1px solid '+c.border,display:'flex',padding:'7px 0 10px'}}>
        {[{label:'홈',icon:'◈',href:'/dashboard'},{label:'추가',icon:'＋',href:'/add'},{label:'기록',icon:'≡',href:'/history'},{label:'통계',icon:'◉',href:'/stats'}].map(n=>(
          <button key={n.label} onClick={()=>router.push(n.href)} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2,background:'none',border:'none',cursor:'pointer',padding:'3px 0'}}>
            <div style={{width:34,height:34,borderRadius:10,background:n.href==='/stats'?'linear-gradient(135deg,#1D9BF0,#00D4FF)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,color:n.href==='/stats'?'#fff':c.t3}}>{n.icon}</div>
            <span style={{fontSize:10,color:n.href==='/stats'?'#1D9BF0':c.t3}}>{n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
