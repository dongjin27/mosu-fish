'use client'
import { createClient } from '@/lib/supabase'
import { Session } from '@/lib/types'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useDarkMode } from '@/lib/useDarkMode'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell
} from 'recharts'

const fmtDist = (d: number) => d >= 1000 ? (d/1000).toFixed(1)+'km' : d+'m'
const CCOL: Record<string,string> = {
  "Warm Up":"#F59E0B","Drill":"#A78BFA","Kick":"#F472B6",
  "Main":"#1D9BF0","Easy":"#10B981","Pull":"#00D4FF","Swim":"#818CF8"
}
const STROKE_COLORS: Record<string,string> = {
  "자유형":"#1D9BF0","배영":"#A78BFA","평영":"#10B981","접영":"#F472B6","개인혼영":"#F59E0B"
}

export default function ChartsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'week'|'month'|'year'>('month')
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
    grid: dark?'rgba(255,255,255,.04)':'rgba(0,0,0,.06)',
    tooltip: dark?'rgba(7,22,40,.95)':'#fff',
  }

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('sessions').select('*, sets(*)').order('date', { ascending: true })
      setSessions(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    const now = new Date()
    let from: Date
    if (period === 'week') {
      from = new Date(now); from.setDate(now.getDate() - 7)
    } else if (period === 'month') {
      from = new Date(now); from.setMonth(now.getMonth() - 1)
    } else {
      from = new Date(now); from.setFullYear(now.getFullYear() - 1)
    }
    return sessions.filter(s => new Date(s.date) >= from)
  }, [sessions, period])

  const distTrend = useMemo(() => {
    return filtered.map(s => ({ date: s.date.slice(5), dist: s.total_dist }))
  }, [filtered])

  const barData = useMemo(() => {
    const map: Record<string, number> = {}
    filtered.forEach(s => {
      const key = s.date.slice(5)
      map[key] = (map[key]||0) + s.total_dist
    })
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [filtered])

  const strokeData = useMemo(() => {
    const map: Record<string, number> = {}
    filtered.forEach(sess => sess.sets?.forEach((st: any) => {
      map[st.stroke] = (map[st.stroke]||0) + st.dist * st.count
    }))
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a,b) => b.value-a.value)
  }, [filtered])

  const catData = useMemo(() => {
    const map: Record<string, number> = {}
    filtered.forEach(sess => sess.sets?.forEach((st: any) => {
      map[st.cat] = (map[st.cat]||0) + st.dist * st.count
    }))
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a,b) => b.value-a.value)
  }, [filtered])

  const totalDist = filtered.reduce((s,x) => s+x.total_dist, 0)
  const avgDist = filtered.length ? Math.round(totalDist/filtered.length) : 0
  const best = filtered.length ? Math.max(...filtered.map(s=>s.total_dist)) : 0

  const ttStyle = {
    contentStyle: { background: c.tooltip, border: '1px solid rgba(0,212,255,.3)', borderRadius: 10, fontSize: 12 },
    labelStyle: { color: c.t2 },
    itemStyle: { color: '#00D4FF' }
  }

  if (loading) return (
    <div style={{minHeight:'100vh',background:c.bg,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <p style={{color:c.t2}}>로딩 중...</p>
    </div>
  )

  return (
    <div style={{maxWidth:430,margin:'0 auto',minHeight:'100vh',background:c.bg,paddingBottom:80,fontFamily:'sans-serif'}}>
      <header style={{background:c.header,borderBottom:'1px solid '+c.border,padding:'12px 16px',position:'sticky',top:0,zIndex:100}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <button onClick={()=>router.back()} style={{background:'none',border:'none',color:c.t2,cursor:'pointer',fontSize:15}}>‹ 뒤로</button>
          <h2 style={{color:c.t1,fontWeight:800,fontSize:20,margin:0}}>차트</h2>
          <div style={{width:40}}/>
        </div>
      </header>

      <div style={{padding:'12px 16px'}}>

        {/* 기간 필터 */}
        <div style={{display:'flex',gap:6,marginBottom:14}}>
          {[{k:'week',l:'1주'},{k:'month',l:'1달'},{k:'year',l:'1년'}].map(p => (
            <button key={p.k} onClick={()=>setPeriod(p.k as any)} style={{
              flex:1,padding:'8px 0',borderRadius:20,fontSize:12,fontWeight:600,cursor:'pointer',border:'none',
              background:period===p.k?'linear-gradient(135deg,#1D9BF0,#00D4FF)':c.card,
              color:period===p.k?'#fff':c.t2,
              outline:period!==p.k?'1px solid '+c.border:'none',
              boxShadow:period===p.k?'0 3px 12px rgba(0,212,255,.3)':'none',
            }}>{p.l}</button>
          ))}
        </div>

        {/* 요약 */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:14}}>
          {[
            {label:'총 거리',value:fmtDist(totalDist),color:'#1D9BF0'},
            {label:'평균',value:fmtDist(avgDist),color:'#A78BFA'},
            {label:'최고',value:fmtDist(best),color:'#F59E0B'},
          ].map((s,i) => (
            <div key={i} style={{background:c.card,border:'1px solid '+c.border,borderRadius:13,padding:'12px 8px',textAlign:'center'}}>
              <div style={{fontWeight:700,fontSize:15,color:s.color}}>{s.value}</div>
              <div style={{color:c.t3,fontSize:10,marginTop:2}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* 거리 추이 라인 차트 */}
        <div style={{background:c.card,border:'1px solid '+c.border,borderRadius:16,padding:14,marginBottom:14}}>
          <p style={{color:c.t2,fontSize:11,fontWeight:600,letterSpacing:'.07em',textTransform:'uppercase' as const,margin:'0 0 12px'}}>📈 거리 추이</p>
          {distTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={distTrend} margin={{top:4,right:4,left:-28,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke={c.grid}/>
                <XAxis dataKey="date" tick={{fill:c.t3,fontSize:9}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:c.t3,fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>v>=1000?(v/1000)+'k':String(v)}/>
                <Tooltip {...ttStyle} formatter={(v:any)=>[fmtDist(v),'거리']}/>
                <Line type="monotone" dataKey="dist" stroke="#00D4FF" strokeWidth={2} dot={{fill:'#00D4FF',r:3}} activeDot={{r:5}}/>
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{textAlign:'center',padding:'30px 0',color:c.t3}}>데이터 없음</div>
          )}
        </div>

        {/* 날짜별 거리 바 차트 */}
        <div style={{background:c.card,border:'1px solid '+c.border,borderRadius:16,padding:14,marginBottom:14}}>
          <p style={{color:c.t2,fontSize:11,fontWeight:600,letterSpacing:'.07em',textTransform:'uppercase' as const,margin:'0 0 12px'}}>📊 날짜별 거리</p>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={barData} margin={{top:4,right:4,left:-28,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke={c.grid}/>
                <XAxis dataKey="name" tick={{fill:c.t3,fontSize:9}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:c.t3,fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>v>=1000?(v/1000)+'k':String(v)}/>
                <Tooltip {...ttStyle} formatter={(v:any)=>[fmtDist(v),'거리']}/>
                <Bar dataKey="value" radius={[6,6,0,0]}>
                  {barData.map((_,i) => (
                    <Cell key={i} fill={`rgba(0,212,255,${0.4+i*0.04})`}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{textAlign:'center',padding:'30px 0',color:c.t3}}>데이터 없음</div>
          )}
        </div>

        {/* 영법별 도넛 차트 */}
        <div style={{background:c.card,border:'1px solid '+c.border,borderRadius:16,padding:14,marginBottom:14}}>
          <p style={{color:c.t2,fontSize:11,fontWeight:600,letterSpacing:'.07em',textTransform:'uppercase' as const,margin:'0 0 12px'}}>🏊 영법별 분포</p>
          {strokeData.length > 0 ? (
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <PieChart width={130} height={130}>
                <Pie data={strokeData} cx={60} cy={60} innerRadius={35} outerRadius={58} dataKey="value" paddingAngle={3}>
                  {strokeData.map((_,i) => (
                    <Cell key={i} fill={STROKE_COLORS[strokeData[i].name]||'#7BA7C9'}/>
                  ))}
                </Pie>
              </PieChart>
              <div style={{flex:1}}>
                {strokeData.map(s => (
                  <div key={s.name} style={{display:'flex',alignItems:'center',gap:6,marginBottom:7}}>
                    <div style={{width:8,height:8,borderRadius:'50%',background:STROKE_COLORS[s.name]||'#7BA7C9',flexShrink:0}}/>
                    <span style={{color:c.t2,fontSize:12,flex:1}}>{s.name}</span>
                    <span style={{color:c.t1,fontSize:12,fontWeight:600}}>{fmtDist(s.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{textAlign:'center',padding:'30px 0',color:c.t3}}>데이터 없음</div>
          )}
        </div>

        {/* 카테고리별 분포 */}
        <div style={{background:c.card,border:'1px solid '+c.border,borderRadius:16,padding:14,marginBottom:14}}>
          <p style={{color:c.t2,fontSize:11,fontWeight:600,letterSpacing:'.07em',textTransform:'uppercase' as const,margin:'0 0 12px'}}>📋 카테고리별 분포</p>
          {catData.length > 0 ? (
            <div>
              {catData.map(cat => (
                <div key={cat.name} style={{marginBottom:10}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                    <span style={{color:c.t2,fontSize:12}}>{cat.name}</span>
                    <span style={{color:c.t1,fontSize:12,fontWeight:600}}>{fmtDist(cat.value)}</span>
                  </div>
                  <div style={{height:6,background:dark?'rgba(255,255,255,.06)':'rgba(0,0,0,.06)',borderRadius:3,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${(cat.value/catData[0].value)*100}%`,background:CCOL[cat.name]||'#1D9BF0',borderRadius:3,transition:'width .6s ease'}}/>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{textAlign:'center',padding:'30px 0',color:c.t3}}>데이터 없음</div>
          )}
        </div>

      </div>

      <nav style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',maxWidth:430,width:'100%',background:c.header,borderTop:'1px solid '+c.border,display:'flex',padding:'7px 0 10px'}}>
        {[
          {label:'홈',icon:'◈',href:'/dashboard'},
          {label:'추가',icon:'＋',href:'/add'},
          {label:'기록',icon:'≡',href:'/history'},
          {label:'통계',icon:'◉',href:'/stats'},
        ].map(n=>(
          <button key={n.label} onClick={()=>router.push(n.href)} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2,background:'none',border:'none',cursor:'pointer',padding:'3px 0'}}>
            <div style={{width:34,height:34,borderRadius:10,background:'transparent',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,color:c.t3}}>{n.icon}</div>
            <span style={{fontSize:10,color:c.t3}}>{n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
