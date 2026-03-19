'use client'
import { createClient } from '@/lib/supabase'
import { useEffect, useState, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useDarkMode } from '@/lib/useDarkMode'

const uid = () => Math.random().toString(36).slice(2,10)
const fmtDist = (d: number) => d >= 1000 ? (d/1000).toFixed(1)+'km' : d+'m'
const CATS = ["Warm Up","Drill","Kick","Main","Easy","Pull","Swim"]
const STRKS = ["자유형","배영","평영","접영","개인혼영"]
const CCOL: Record<string,string> = {
  "Warm Up":"#F59E0B","Drill":"#A78BFA","Kick":"#F472B6",
  "Main":"#1D9BF0","Easy":"#10B981","Pull":"#00D4FF","Swim":"#818CF8"
}

type SetItem = { id:string; cat:string; stroke:string; dist:number; count:number; note:string }

export default function SessionPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const supabase = createClient()
  const { dark } = useDarkMode()

  const [mode, setMode] = useState<'view'|'edit'>('view')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [date, setDate] = useState('')
  const [pool, setPool] = useState(25)
  const [sets, setSets] = useState<SetItem[]>([])
  const [note, setNote] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string|null>(null)
  const [uploading, setUploading] = useState(false)

  const c = {
    bg: dark?'#040D1A':'#F0F4F8',
    card: dark?'rgba(12,31,53,.85)':'#fff',
    border: dark?'rgba(0,212,255,.1)':'#E2E8F0',
    header: dark?'rgba(4,13,26,.97)':'rgba(255,255,255,.97)',
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

      const { data: sess } = await supabase
        .from('sessions')
        .select('*, sets(*)')
        .eq('id', id)
        .single()

      if (!sess) { router.push('/history'); return }

      setDate(sess.date)
      setPool(sess.pool)
      setNote(sess.note || '')
      setPhotoUrl(sess.photo_url || null)
      setSets(sess.sets.map((s: any) => ({
        id: s.id, cat: s.cat, stroke: s.stroke,
        dist: s.dist, count: s.count, note: s.note || ''
      })))
      setLoading(false)
    }
    load()
  }, [id])

  const total = useMemo(() => sets.reduce((s,x) => s+(x.dist*x.count), 0), [sets])

  const addSet = () => setSets(p => [...p, {id:uid(),cat:'Main',stroke:'자유형',dist:100,count:4,note:''}])
  const removeSet = (sid:string) => setSets(p => p.filter(s => s.id!==sid))
  const updateSet = (sid:string, f:string, v:any) => setSets(p => p.map(s => s.id===sid ? {...s,[f]:v} : s))

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)

    const { data: { user } } = await supabase.auth.getUser()
    const path = `${user?.id}/${id}_${Date.now()}`

    const { error } = await supabase.storage
      .from('session-photos')
      .upload(path, file, { upsert: true })

    if (!error) {
      const { data: { publicUrl } } = supabase.storage
        .from('session-photos')
        .getPublicUrl(path)
      setPhotoUrl(publicUrl)
    }
    setUploading(false)
  }

  const save = async () => {
    setSaving(true)
    await supabase.from('sessions').update({
      date, pool, note, total_dist: total, photo_url: photoUrl
    }).eq('id', id)

    await supabase.from('sets').delete().eq('session_id', id)
    await supabase.from('sets').insert(
      sets.map(s => ({
        session_id: id, cat: s.cat, stroke: s.stroke,
        dist: s.dist, count: s.count, note: s.note
      }))
    )

    setSaving(false)
    setMode('view')
  }

  if (loading) return (
    <div style={{minHeight:'100vh',background:c.bg,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <p style={{color:c.t2}}>로딩 중...</p>
    </div>
  )

  return (
    <div style={{maxWidth:430,margin:'0 auto',minHeight:'100vh',background:c.bg,paddingBottom:40,fontFamily:'sans-serif'}}>
      <header style={{background:c.header,borderBottom:'1px solid '+c.border,padding:'12px 16px',position:'sticky',top:0,zIndex:100}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <button onClick={()=>router.back()} style={{background:'none',border:'none',color:c.t2,cursor:'pointer',fontSize:15,display:'flex',alignItems:'center',gap:4}}>
            ‹ 뒤로
          </button>
          <h2 style={{color:c.t1,fontWeight:800,fontSize:18,margin:0}}>
            {mode==='view'?'세션 상세':'세션 수정'}
          </h2>
          <button onClick={()=>setMode(mode==='view'?'edit':'view')}
            style={{background:mode==='edit'?'rgba(125,125,125,.1)':'linear-gradient(135deg,#1D9BF0,#00D4FF)',border:'none',borderRadius:8,padding:'6px 12px',color:mode==='edit'?'#7BA7C9':'#fff',fontSize:12,fontWeight:600,cursor:'pointer'}}>
            {mode==='view'?'✏️ 수정':'취소'}
          </button>
        </div>
      </header>

      <div style={{padding:'16px'}}>

        {/* 사진 */}
        <div style={{marginBottom:14}}>
          {photoUrl ? (
            <div style={{position:'relative',borderRadius:16,overflow:'hidden'}}>
              <img src={photoUrl} alt="세션 사진" style={{width:'100%',height:220,objectFit:'cover',display:'block'}}/>
              {mode==='edit' && (
                <label style={{position:'absolute',bottom:10,right:10,background:'rgba(0,0,0,.6)',borderRadius:10,padding:'6px 12px',color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer'}}>
                  📷 변경
                  <input type="file" accept="image/*" onChange={handlePhoto} style={{display:'none'}}/>
                </label>
              )}
            </div>
          ) : mode==='edit' ? (
            <label style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:140,background:c.card,border:'2px dashed '+c.inpBorder,borderRadius:16,cursor:'pointer',gap:8}}>
              <span style={{fontSize:32}}>📷</span>
              <span style={{color:c.t2,fontSize:13}}>{uploading?'업로드 중...':'사진 추가하기'}</span>
              <input type="file" accept="image/*" onChange={handlePhoto} style={{display:'none'}}/>
            </label>
          ) : null}
        </div>

        {/* 날짜 + 풀 */}
        <div style={{background:c.card,border:'1px solid '+c.border,borderRadius:16,padding:16,marginBottom:14}}>
          <div style={{marginBottom:12}}>
            <label style={{display:'block',color:c.t3,fontSize:10,fontWeight:600,letterSpacing:'.07em',textTransform:'uppercase' as const,marginBottom:4}}>날짜</label>
            {mode==='edit' ? (
              <input type="date" value={date} onChange={e=>setDate(e.target.value)}
                style={{width:'100%',background:c.inp,border:'1px solid '+c.inpBorder,borderRadius:10,padding:'10px 13px',color:c.t1,fontSize:15,outline:'none'}}/>
            ) : (
              <div style={{color:c.t1,fontSize:16,fontWeight:600}}>{date}</div>
            )}
          </div>
          <div>
            <label style={{display:'block',color:c.t3,fontSize:10,fontWeight:600,letterSpacing:'.07em',textTransform:'uppercase' as const,marginBottom:4}}>풀 길이</label>
            {mode==='edit' ? (
              <div style={{display:'flex',gap:6}}>
                {[25,50,100,200,400].map(m => (
                  <button key={m} onClick={()=>setPool(m)} style={{flex:1,padding:'8px 0',borderRadius:10,border:'1px solid '+(pool===m?'#1D9BF0':c.inpBorder),background:pool===m?'linear-gradient(135deg,#1D9BF0,#00D4FF)':c.inp,color:pool===m?'#fff':c.t2,fontSize:12,fontWeight:pool===m?700:400,cursor:'pointer'}}>
                    {m}m
                  </button>
                ))}
              </div>
            ) : (
              <div style={{display:'inline-block',background:'rgba(0,212,255,.1)',color:'#00D4FF',fontSize:13,padding:'3px 10px',borderRadius:20,fontWeight:600}}>{pool}m풀</div>
            )}
          </div>
        </div>

        {/* 총 거리 */}
        <div style={{background:'linear-gradient(135deg,rgba(29,155,240,.15),rgba(0,212,255,.08))',border:'1px solid rgba(0,212,255,.2)',borderRadius:14,padding:'14px 16px',marginBottom:14,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{color:c.t2,fontSize:13}}>총 거리</span>
          <span style={{fontWeight:800,fontSize:24,color:'#00D4FF'}}>{fmtDist(total)}</span>
        </div>

        {/* 세트 */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
          <span style={{color:c.t2,fontSize:11,fontWeight:600,letterSpacing:'.06em',textTransform:'uppercase' as const}}>세트 구성</span>
          <span style={{color:c.t3,fontSize:11}}>{sets.length}세트</span>
        </div>

        {sets.map((set,i) => {
          const cc = CCOL[set.cat]||'#1D9BF0'
          return (
            <div key={set.id} style={{background:c.card,border:`1px solid ${cc}28`,borderRadius:16,marginBottom:10,overflow:'hidden'}}>
              <div style={{background:`linear-gradient(90deg,${cc}18,${cc}06)`,borderBottom:`1px solid ${cc}22`,padding:'9px 12px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <div style={{width:20,height:20,borderRadius:6,background:cc,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'#fff'}}>{i+1}</div>
                  {mode==='edit' ? (
                    <select value={set.cat} onChange={e=>updateSet(set.id,'cat',e.target.value)}
                      style={{background:'transparent',border:'none',color:cc,fontSize:13,fontWeight:700,outline:'none',cursor:'pointer'}}>
                      {CATS.map(c2=><option key={c2} value={c2}>{c2}</option>)}
                    </select>
                  ) : (
                    <span style={{color:cc,fontSize:13,fontWeight:700}}>{set.cat}</span>
                  )}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <div style={{background:`${cc}20`,border:`1px solid ${cc}35`,borderRadius:20,padding:'2px 10px',fontSize:12,fontWeight:700,color:cc}}>{fmtDist(set.dist*set.count)}</div>
                  {mode==='edit' && sets.length>1 && (
                    <button onClick={()=>removeSet(set.id)} style={{width:24,height:24,background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.2)',borderRadius:6,color:'#EF4444',cursor:'pointer',fontSize:13}}>×</button>
                  )}
                </div>
              </div>
              <div style={{padding:'11px 12px',display:'flex',flexDirection:'column',gap:9}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{color:c.t3,fontSize:11,fontWeight:500,width:28}}>영법</span>
                  {mode==='edit' ? (
                    <div style={{display:'flex',gap:5,flex:1,flexWrap:'wrap' as const}}>
                      {STRKS.map(s=>(
                        <button key={s} onClick={()=>updateSet(set.id,'stroke',s)} style={{padding:'4px 10px',borderRadius:20,border:`1px solid ${set.stroke===s?cc:c.inpBorder}`,background:set.stroke===s?cc:'transparent',color:set.stroke===s?'#fff':c.t2,fontSize:11,cursor:'pointer'}}>
                          {s}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span style={{color:c.t1,fontSize:13,fontWeight:600}}>{set.stroke}</span>
                  )}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{color:c.t3,fontSize:11,fontWeight:500,width:28}}>거리</span>
                  {mode==='edit' ? (
                    <>
                      <select value={set.dist} onChange={e=>updateSet(set.id,'dist',+e.target.value)}
                        style={{flex:1,background:c.inp,border:'1px solid '+c.inpBorder,borderRadius:9,padding:'7px 10px',color:c.t1,fontSize:13,outline:'none'}}>
                        {[25,50,75,100,150,200,250,300,400,500,800,1000].map(d=><option key={d} value={d}>{d}m</option>)}
                      </select>
                      <div style={{display:'flex',alignItems:'center',background:c.inp,border:'1px solid '+c.inpBorder,borderRadius:9,overflow:'hidden',flexShrink:0}}>
                        <button onClick={()=>updateSet(set.id,'count',Math.max(1,set.count-1))} style={{width:30,height:34,border:'none',background:'transparent',color:c.t2,fontSize:16,cursor:'pointer'}}>-</button>
                        <span style={{minWidth:28,textAlign:'center',color:c.t1,fontSize:13,fontWeight:600}}>{set.count}</span>
                        <button onClick={()=>updateSet(set.id,'count',Math.min(50,set.count+1))} style={{width:30,height:34,border:'none',background:'transparent',color:c.t2,fontSize:16,cursor:'pointer'}}>+</button>
                      </div>
                      <span style={{color:c.t3,fontSize:11}}>회</span>
                    </>
                  ) : (
                    <span style={{color:c.t1,fontSize:13}}>{set.dist}m × {set.count}회 = <span style={{color:cc,fontWeight:700}}>{fmtDist(set.dist*set.count)}</span></span>
                  )}
                </div>
                {mode==='edit' ? (
                  <input value={set.note} placeholder="메모 (선택)" onChange={e=>updateSet(set.id,'note',e.target.value)}
                    style={{width:'100%',background:'transparent',border:'none',borderTop:'1px solid '+c.border,paddingTop:8,color:c.t2,fontSize:12,outline:'none'}}/>
                ) : set.note ? (
                  <div style={{borderTop:'1px solid '+c.border,paddingTop:8,color:c.t2,fontSize:12}}>💬 {set.note}</div>
                ) : null}
              </div>
            </div>
          )
        })}

        {mode==='edit' && (
          <button onClick={addSet} style={{width:'100%',padding:'11px',marginBottom:14,background:'transparent',border:'1.5px dashed '+c.inpBorder,borderRadius:14,color:'#1D9BF0',fontSize:13,fontWeight:600,cursor:'pointer'}}>
            ＋ 세트 추가
          </button>
        )}

        {/* 메모 */}
        <div style={{background:c.card,border:'1px solid '+c.border,borderRadius:14,padding:'12px 14px',marginBottom:14}}>
          <label style={{display:'block',color:c.t3,fontSize:10,fontWeight:600,letterSpacing:'.07em',textTransform:'uppercase' as const,marginBottom:6}}>세션 메모</label>
          {mode==='edit' ? (
            <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="세션 메모를 입력하세요" rows={3}
              style={{width:'100%',background:'transparent',border:'none',color:c.t1,fontSize:13,outline:'none',resize:'none' as const,lineHeight:1.5}}/>
          ) : (
            <p style={{color:note?c.t1:c.t3,fontSize:13,margin:0,lineHeight:1.6}}>{note||'메모 없음'}</p>
          )}
        </div>

        {mode==='edit' && (
          <button onClick={save} disabled={saving} style={{width:'100%',padding:'15px',border:'none',borderRadius:14,color:'#fff',fontSize:15,fontWeight:700,cursor:'pointer',background:saving?'rgba(29,155,240,.4)':'linear-gradient(135deg,#1D9BF0,#00D4FF)',boxShadow:'0 4px 20px rgba(0,212,255,.25)'}}>
            {saving?'저장 중...':'✓ 수정 저장'}
          </button>
        )}
      </div>
    </div>
  )
}
