'use client'
import { createClient } from '@/lib/supabase'
import { Session } from '@/lib/types'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useDarkMode } from '@/lib/useDarkMode'

const fmtDist = (d: number) => d >= 1000 ? (d/1000).toFixed(1)+'km' : d+'m'
const CCOL: Record<string,string> = {
  "Warm Up":"#F59E0B","Drill":"#A78BFA","Kick":"#F472B6",
  "Main":"#1D9BF0","Easy":"#10B981","Pull":"#00D4FF","Swim":"#818CF8"
}

type Filter = '오늘' | '이번 주' | '이번 달' | '직접 설정'

export default function HistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string|null>(null)
  const [confirm, setConfirm] = useState<string|null>(null)
  const [filter, setFilter] = useState<Filter>('이번 달')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
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
    rowItem: dark?'rgba(255,255,255,.02)':'#F8FAFC',
    inp: dark?'rgba(255,255,255,.05)':'#F8FAFC',
    inpBorder: dark?'rgba(0,212,255,.2)':'#CBD5E1',
  }

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('sessions').select('*, sets(*)').order('date', { ascending: false })
      setSessions(data || [])
      setLoading(false)
    }
    load()
  }, [])

  // 필터된 세션
  const filtered = useMemo(() => {
    const now = new Date()
    const today = now.toISOString().slice(0,10)

    let from: Date, to: Date = new Date(now)
    to.setHours(23,59,59)

    if (filter === '오늘') {
      from = new Date(today)
    } else if (filter === '이번 주') {
      from = new Date(now)
      from.setDate(now.getDate() - now.getDay())
      from.setHours(0,0,0)
    } else if (filter === '이번 달') {
      from = new Date(now.getFullYear(), now.getMonth(), 1)
    } else {
      // 직접 설정
      if (!startDate && !endDate) return sessions
      from = startDate ? new Date(startDate) : new Date('2000-01-01')
      to = endDate ? new Date(endDate) : new Date()
      to.setHours(23,59,59)
    }

    return sessions.filter(s => {
      const d = new Date(s.date)
      return d >= from && d <= to
    })
  }, [sessions, filter, startDate, endDate])

  // 통계 계산
  const stats = useMemo(() => {
    if (!filtered.length) return null
    const totalDist = filtered.reduce((s,x) => s+x.total_dist, 0)
    const avgDist = Math.round(totalDist / filtered.length)
    const best = Math.max(...filtered.map(s => s.total_dist))
    const totalSets = filtered.reduce((s,x) => s+(x.sets?.length||0), 0)

    // 영법별 거리
    const strokeMap: Record<string,number> = {}
    filtered.forEach(sess => sess.sets?.forEach((st:any) => {
      strokeMap[st.stroke] = (strokeMap[st.stroke]||0) + st.dist*st.count
    }))
    const topStroke = Object.entries(strokeMap).sort((a,b) => b[1]-a[1])[0]

    // 카테고리별
    const catMap: Record<string,number> = {}
    filtered.forEach(sess => sess.sets?.forEach((st:any) => {
      catMap[st.cat] = (catMap[st.cat]||0) + st.dist*st.count
    }))
    const catData = Object.entries(catMap).map(([name,value]) => ({name,value})).sort((a,b) => b.value-a.value)

    return { totalDist, avgDist, best, totalSets, topStroke, catData }
  }, [filtered])

  const deleteSession = async (id: string) => {
    await supabase.from('sessions').delete().eq('id', id)
    setSessions(p => p.filter(s => s.id !== id))
    setConfirm(null)
    setExpanded(null)
  }

  if (loading) return (
    <div style={{minHeight:'100vh',background:c.bg,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <p style={{color:c.t2}}>로딩 중...</p>
    </div>
  )

  const FILTERS: Filter[] = ['오늘', '이번 주', '이번 달', '직접 설정']

  return (
    <div style={{maxWidth:430,margin:'0 auto',minHeight:'100vh',background:c.bg,paddingBottom:80,fontFamily:'sans-serif'}}>
      <header style={{background:c.header,borderBottom:'1px solid '+c.border,padding:'12px 16px',position:'sticky',top:0,zIndex:100}}>
        <h2 style={{color:c.t1,fontWeight:800,fontSize:20,margin:0}}>기록</h2>
      </header>

      <div style={{padding:'12px 16px'}}>

        {/* 필터 탭 */}
        <div style={{display:'flex',gap:6,marginBottom:12,overflowX:'auto'}}>
          {FILTERS.map(f => (
            <button key={f} onClick={()=>setFilter(f)} style={{
              flexShrink:0, padding:'7px 14px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer',
              border:'none',
              background: filter===f ? 'linear-gradient(135deg,#1D9BF0,#00D4FF)' : c.card,
              color: filter===f ? '#fff' : c.t2,
              boxShadow: filter===f ? '0 3px 12px rgba(0,212,255,.3)' : 'none',
              outline: filter!==f ? '1px solid '+c.border : 'none',
            }}>{f}</button>
          ))}
        </div>

        {/* 직접 설정 날짜 입력 */}
        {filter === '직접 설정' && (
          <div style={{display:'flex',gap:8,marginBottom:12,alignItems:'center'}}>
            <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}
              style={{flex:1,background:c.inp,border:'1px solid '+c.inpBorder,borderRadius:10,padding:'8px 10px',color:c.t1,fontSize:13,outline:'none'}}/>
            <span style={{color:c.t3,fontSize:13}}>~</span>
            <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)}
              style={{flex:1,background:c.inp,border:'1px solid '+c.inpBorder,borderRadius:10,padding:'8px 10px',color:c.t1,fontSize:13,outline:'none'}}/>
          </div>
        )}

        {/* 통계 카드 */}
        {stats ? (
          <div style={{background:c.card,border:'1px solid rgba(0,212,255,.15)',borderRadius:18,padding:16,marginBottom:14}}>
            <p style={{color:c.t2,fontSize:11,fontWeight:600,letterSpacing:'.07em',textTransform:'uppercase' as const,marginBottom:12,margin:'0 0 12px'}}>
              {filter} 통계 · {filtered.length}회
            </p>

            {/* 메인 수치 */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
              {[
                {label:'총 거리',value:fmtDist(stats.totalDist),color:'#1D9BF0',icon:'🌊'},
                {label:'평균 거리',value:fmtDist(stats.avgDist),color:'#A78BFA',icon:'📊'},
                {label:'최고 기록',value:fmtDist(stats.best),color:'#F59E0B',icon:'🏆'},
                {label:'총 세트',value:stats.totalSets+'세트',color:'#10B981',icon:'📋'},
              ].map((s,i) => (
                <div key={i} style={{background:dark?'rgba(255,255,255,.04)':'rgba(0,0,0,.03)',borderRadius:12,padding:'12px 10px',borderBottom:`2px solid ${s.color}`}}>
                  <div style={{fontSize:18,marginBottom:3}}>{s.icon}</div>
                  <div style={{fontWeight:700,fontSize:17,color:s.color}}>{s.value}</div>
                  <div style={{color:c.t3,fontSize:10,marginTop:1}}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* 가장 많이 한 영법 */}
            {stats.topStroke && (
              <div style={{background:dark?'rgba(29,155,240,.08)':'rgba(29,155,240,.05)',borderRadius:12,padding:'10px 12px',marginBottom:10,display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:24}}>🥇</span>
                <div>
                  <div style={{color:c.t3,fontSize:10,marginBottom:2}}>가장 많이 수영한 영법</div>
                  <div style={{color:c.t1,fontWeight:700,fontSize:14}}>{stats.topStroke[0]} <span style={{color:'#1D9BF0'}}>{fmtDist(stats.topStroke[1])}</span></div>
                </div>
              </div>
            )}

            {/* 카테고리 바 차트 */}
            {stats.catData.length > 0 && (
              <div>
                <p style={{color:c.t3,fontSize:10,fontWeight:600,letterSpacing:'.06em',textTransform:'uppercase' as const,marginBottom:8,margin:'0 0 8px'}}>카테고리 분포</p>
                {stats.catData.map(cat => (
                  <div key={cat.name} style={{marginBottom:7}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                      <span style={{color:c.t2,fontSize:11,fontWeight:500}}>{cat.name}</span>
                      <span style={{color:c.t1,fontSize:11,fontWeight:600}}>{fmtDist(cat.value)}</span>
                    </div>
                    <div style={{height:6,background:dark?'rgba(255,255,255,.06)':'rgba(0,0,0,.06)',borderRadius:3,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${(cat.value/stats.catData[0].value)*100}%`,background:CCOL[cat.name]||'#1D9BF0',borderRadius:3,transition:'width .6s ease'}}/>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{background:c.card,border:'1px solid '+c.border,borderRadius:18,padding:20,marginBottom:14,textAlign:'center'}}>
            <div style={{fontSize:36,marginBottom:8}}>📭</div>
            <p style={{color:c.t2,fontSize:13}}>{filter} 기록이 없어요</p>
          </div>
        )}

        {/* 세션 목록 */}
        <p style={{color:c.t2,fontSize:11,fontWeight:500,letterSpacing:'.06em',textTransform:'uppercase' as const,marginBottom:10}}>
          세션 목록 · {filtered.length}회
        </p>

        {filtered.length === 0 ? (
          <div style={{textAlign:'center',padding:'30px 0',color:c.t3}}>
            <p style={{color:c.t2}}>해당 기간에 기록이 없어요</p>
          </div>
        ) : filtered.map(sess => {
          const isExp = expanded === sess.id
          const dt = new Date(sess.date)
          const strokes = [...new Set(sess.sets?.map((s:any) => s.stroke))].join(' · ')
          return (
            <div key={sess.id} style={{background:c.card,border:`1px solid ${isExp?'rgba(0,212,255,.25)':c.border}`,borderRadius:14,marginBottom:8,overflow:'hidden'}}>
              <div onClick={()=>router.push(`/session/${sess.id}`)} style={{padding:'12px',cursor:'pointer',display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:40,height:40,borderRadius:10,background:'rgba(0,212,255,.08)',border:'1px solid rgba(0,212,255,.15)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <div style={{color:'#00D4FF',fontSize:12,fontWeight:700,lineHeight:1}}>{dt.getDate()}</div>
                  <div style={{color:c.t3,fontSize:9,marginTop:1}}>{dt.toLocaleString('ko',{month:'short'})}</div>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:7}}>
                    <span style={{fontWeight:700,fontSize:15,color:'#1D9BF0'}}>{fmtDist(sess.total_dist)}</span>
                    <span style={{background:'rgba(0,212,255,.1)',color:'#00D4FF',fontSize:10,padding:'2px 6px',borderRadius:20,fontWeight:600}}>{sess.pool}m풀</span>
                  </div>
                  <div style={{color:c.t2,fontSize:11,marginTop:2}}>{sess.sets?.length}세트 · {strokes}</div>
                </div>
                <span style={{color:c.t3,fontSize:16,display:'inline-block',transform:isExp?'rotate(90deg)':'none'}}>›</span>
              </div>

              {isExp && (
                <div style={{borderTop:'1px solid '+c.border,padding:'10px 12px'}}>
                  {sess.sets?.map((s:any,j:number) => (
                    <div key={j} style={{display:'flex',alignItems:'center',gap:7,marginBottom:6,padding:'6px 8px',background:c.rowItem,borderRadius:8,borderLeft:`2px solid ${CCOL[s.cat]||'#1D9BF0'}`}}>
                      <span style={{color:CCOL[s.cat],fontSize:11,fontWeight:600,minWidth:48}}>{s.cat}</span>
                      <span style={{color:c.t1,fontSize:12}}>{s.dist}m × {s.count}</span>
                      <span style={{color:c.t3,fontSize:11,marginLeft:'auto'}}>{s.stroke}</span>
                      <span style={{color:'#1D9BF0',fontSize:12,fontWeight:700}}>{fmtDist(s.dist*s.count)}</span>
                    </div>
                  ))}
                  {sess.note && <p style={{color:c.t2,fontSize:12,marginTop:6,padding:'6px 8px',background:c.rowItem,borderRadius:7}}>💬 {sess.note}</p>}
                  {confirm === sess.id ? (
                    <div style={{display:'flex',gap:7,marginTop:8}}>
                      <button onClick={()=>setConfirm(null)} style={{flex:1,padding:'8px',background:'rgba(125,125,125,.1)',border:'none',borderRadius:8,color:c.t2,cursor:'pointer',fontSize:12}}>취소</button>
                      <button onClick={()=>deleteSession(sess.id)} style={{flex:1,padding:'8px',background:'rgba(239,68,68,.14)',border:'1px solid rgba(239,68,68,.25)',borderRadius:8,color:'#EF4444',cursor:'pointer',fontSize:12,fontWeight:600}}>삭제 확인</button>
                    </div>
                  ) : (
                    <button onClick={()=>setConfirm(sess.id)} style={{width:'100%',marginTop:8,padding:'8px',background:'rgba(239,68,68,.06)',border:'1px solid rgba(239,68,68,.16)',borderRadius:8,color:'#EF4444',cursor:'pointer',fontSize:12}}>삭제</button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <nav style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',maxWidth:430,width:'100%',background:c.header,borderTop:'1px solid '+c.border,display:'flex',padding:'7px 0 10px'}}>
        {[{label:'홈',icon:'◈',href:'/dashboard'},{label:'추가',icon:'＋',href:'/add'},{label:'기록',icon:'≡',href:'/history'},{label:'통계',icon:'◉',href:'/stats'}].map(n=>(
          <button key={n.label} onClick={()=>router.push(n.href)} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2,background:'none',border:'none',cursor:'pointer',padding:'3px 0'}}>
            <div style={{width:34,height:34,borderRadius:10,background:n.href==='/history'?'linear-gradient(135deg,#1D9BF0,#00D4FF)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,color:n.href==='/history'?'#fff':c.t3}}>{n.icon}</div>
            <span style={{fontSize:10,color:n.href==='/history'?'#1D9BF0':c.t3}}>{n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
