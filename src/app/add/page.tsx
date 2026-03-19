'use client'
import { createClient } from '@/lib/supabase'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
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

export default function AddPage() {
  const router = useRouter()
  const supabase = createClient()
  const { dark } = useDarkMode()
  const today = new Date().toISOString().slice(0,10)
  const [date, setDate] = useState(today)
  const [pool, setPool] = useState(25)
  const [sets, setSets] = useState<SetItem[]>([{id:uid(),cat:'Warm Up',stroke:'자유형',dist:200,count:4,note:''}])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string|null>(null)
  const [uploading, setUploading] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string|null>(null)
  const [photoFile, setPhotoFile] = useState<File|null>(null)

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

  const total = useMemo(() => sets.reduce((s,x) => s+(x.dist*x.count), 0), [sets])
  const addSet = () => setSets(p => [...p, {id:uid(),cat:'Main',stroke:'자유형',dist:100,count:4,note:''}])
  const removeSet = (id:string) => setSets(p => p.filter(s => s.id!==id))
  const updateSet = (id:string, f:string, v:any) => setSets(p => p.map(s => s.id===id ? {...s,[f]:v} : s))

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    // 미리보기
    const reader = new FileReader()
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const save = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // 사진 업로드
    let uploadedPhotoUrl = null
    if (photoFile) {
      setUploading(true)
      const tempId = uid()
      const path = `${user.id}/${tempId}_${Date.now()}`
      const { error } = await supabase.storage
        .from('session-photos')
        .upload(path, photoFile, { upsert: true })
      if (!error) {
        const { data: { publicUrl } } = supabase.storage
          .from('session-photos')
          .getPublicUrl(path)
        uploadedPhotoUrl = publicUrl
      }
      setUploading(false)
    }

    // 세션 저장
    const { data: session } = await supabase.from('sessions').insert({
      user_id: user.id, date, pool, note,
      total_dist: total,
      photo_url: uploadedPhotoUrl
    }).select().single()

    if (session) {
      await supabase.from('sets').insert(
        sets.map(s => ({
          session_id: session.id, cat: s.cat, stroke: s.stroke,
          dist: s.dist, count: s.count, note: s.note
        }))
      )
    }

    setSaved(true)
    setTimeout(() => {
      setSaved(false)
      router.push('/dashboard')
    }, 1500)
    setSaving(false)
  }

  return (
    <div style={{maxWidth:430,margin:'0 auto',minHeight:'100vh',background:c.bg,paddingBottom:80,fontFamily:'sans-serif'}}>
      <header style={{background:c.header,borderBottom:'1px solid '+c.border,padding:'12px 16px',position:'sticky',top:0,zIndex:100}}>
        <h2 style={{color:c.t1,fontWeight:800,fontSize:20,margin:0}}>세션 추가</h2>
      </header>

      <div style={{padding:'16px'}}>

        {/* 날짜 + 풀 */}
        <div style={{background:c.card,borderRadius:16,padding:16,marginBottom:14,border:'1px solid '+c.border}}>
          <div style={{marginBottom:14}}>
            <label style={{display:'block',color:c.t2,fontSize:11,fontWeight:600,letterSpacing:'.07em',textTransform:'uppercase' as const,marginBottom:6}}>날짜</label>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)}
              style={{width:'100%',background:c.inp,border:'1px solid '+c.inpBorder,borderRadius:10,padding:'10px 13px',color:c.t1,fontSize:15,outline:'none'}}/>
          </div>
          <div>
            <label style={{display:'block',color:c.t2,fontSize:11,fontWeight:600,letterSpacing:'.07em',textTransform:'uppercase' as const,marginBottom:6}}>풀 길이</label>
            <div style={{display:'flex',gap:6}}>
              {[25,50,100,200,400].map(m => (
                <button key={m} onClick={()=>setPool(m)} style={{flex:1,padding:'8px 0',borderRadius:10,border:'1px solid '+(pool===m?'#1D9BF0':c.inpBorder),background:pool===m?'linear-gradient(135deg,#1D9BF0,#00D4FF)':c.inp,color:pool===m?'#fff':c.t2,fontSize:12,fontWeight:pool===m?700:400,cursor:'pointer'}}>
                  {m}m
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 세트 */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
          <span style={{color:c.t2,fontSize:12,fontWeight:600,letterSpacing:'.06em',textTransform:'uppercase' as const}}>세트 구성</span>
          <span style={{background:'linear-gradient(135deg,#1D9BF0,#00D4FF)',borderRadius:20,padding:'3px 12px',fontSize:13,fontWeight:700,color:'#fff'}}>{fmtDist(total)}</span>
        </div>

        {sets.map((set,i) => {
          const cc = CCOL[set.cat]||'#1D9BF0'
          return (
            <div key={set.id} style={{background:c.card,border:`1px solid ${cc}28`,borderRadius:16,marginBottom:10,overflow:'hidden'}}>
              <div style={{background:`linear-gradient(90deg,${cc}18,${cc}06)`,borderBottom:`1px solid ${cc}22`,padding:'9px 12px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <div style={{width:20,height:20,borderRadius:6,background:cc,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'#fff'}}>{i+1}</div>
                  <select value={set.cat} onChange={e=>updateSet(set.id,'cat',e.target.value)}
                    style={{background:'transparent',border:'none',color:cc,fontSize:13,fontWeight:700,outline:'none',cursor:'pointer'}}>
                    {CATS.map(c2=><option key={c2} value={c2}>{c2}</option>)}
                  </select>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <div style={{background:`${cc}20`,border:`1px solid ${cc}35`,borderRadius:20,padding:'2px 10px',fontSize:12,fontWeight:700,color:cc}}>{fmtDist(set.dist*set.count)}</div>
                  {sets.length>1&&<button onClick={()=>removeSet(set.id)} style={{width:24,height:24,background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.2)',borderRadius:6,color:'#EF4444',cursor:'pointer',fontSize:13}}>×</button>}
                </div>
              </div>
              <div style={{padding:'11px 12px',display:'flex',flexDirection:'column',gap:9}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{color:c.t3,fontSize:11,fontWeight:500,width:28}}>영법</span>
                  <div style={{display:'flex',gap:5,flex:1,flexWrap:'wrap' as const}}>
                    {STRKS.map(s=>(
                      <button key={s} onClick={()=>updateSet(set.id,'stroke',s)} style={{padding:'4px 10px',borderRadius:20,border:`1px solid ${set.stroke===s?cc:c.inpBorder}`,background:set.stroke===s?cc:'transparent',color:set.stroke===s?'#fff':c.t2,fontSize:11,fontWeight:set.stroke===s?700:400,cursor:'pointer'}}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{color:c.t3,fontSize:11,fontWeight:500,width:28}}>거리</span>
                  <select value={set.dist} onChange={e=>updateSet(set.id,'dist',+e.target.value)}
                    style={{flex:1,background:c.inp,border:'1px solid '+c.inpBorder,borderRadius:9,padding:'7px 10px',color:c.t1,fontSize:13,outline:'none'}}>
                    {[25,50,75,100,150,200,250,300,400,500,800,1000].map(d=><option key={d} value={d}>{d}m</option>)}
                  </select>
                  <div style={{display:'flex',alignItems:'center',background:c.inp,border:'1px solid '+c.inpBorder,borderRadius:9,overflow:'hidden',flexShrink:0}}>
                    <button onClick={()=>updateSet(set.id,'count',Math.max(1,set.count-1))} style={{width:30,height:34,border:'none',background:'transparent',color:c.t2,fontSize:16,cursor:'pointer'}}>-</button>
                    <span style={{minWidth:28,textAlign:'center',color:c.t1,fontSize:13,fontWeight:600}}>{set.count}</span>
                    <button onClick={()=>updateSet(set.id,'count',Math.min(50,set.count+1))} style={{width:30,height:34,border:'none',background:'transparent',color:c.t2,fontSize:16,cursor:'pointer'}}>+</button>
                  </div>
                  <span style={{color:c.t3,fontSize:11,flexShrink:0}}>회</span>
                </div>
                <input value={set.note} placeholder="메모 (선택)" onChange={e=>updateSet(set.id,'note',e.target.value)}
                  style={{width:'100%',background:'transparent',border:'none',borderTop:'1px solid '+c.border,paddingTop:8,color:c.t2,fontSize:12,outline:'none'}}/>
              </div>
            </div>
          )
        })}

        <button onClick={addSet} style={{width:'100%',padding:'11px',marginBottom:14,background:'transparent',border:'1.5px dashed '+c.inpBorder,borderRadius:14,color:'#1D9BF0',fontSize:13,fontWeight:600,cursor:'pointer'}}>
          ＋ 세트 추가
        </button>

        {/* 메모 */}
        <div style={{background:c.card,border:'1px solid '+c.border,borderRadius:14,padding:'4px 13px',marginBottom:14,display:'flex',alignItems:'flex-start',gap:8}}>
          <span style={{fontSize:16,marginTop:10,flexShrink:0}}>💬</span>
          <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="세션 메모를 입력하세요" rows={2}
            style={{flex:1,background:'transparent',border:'none',padding:'10px 0',color:c.t1,fontSize:13,outline:'none',resize:'none' as const,lineHeight:1.5}}/>
        </div>

        {/* 사진 업로드 */}
        <div style={{marginBottom:14}}>
          <label style={{display:'block',color:c.t2,fontSize:11,fontWeight:600,letterSpacing:'.07em',textTransform:'uppercase' as const,marginBottom:8}}>사진 (선택)</label>
          {photoPreview ? (
            <div style={{position:'relative',borderRadius:16,overflow:'hidden'}}>
              <img src={photoPreview} alt="미리보기" style={{width:'100%',height:200,objectFit:'cover',display:'block'}}/>
              <div style={{position:'absolute',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,.3)',display:'flex',alignItems:'center',justifyContent:'center',gap:10}}>
                <label style={{background:'rgba(255,255,255,.9)',borderRadius:10,padding:'8px 16px',color:'#1E293B',fontSize:13,fontWeight:600,cursor:'pointer'}}>
                  📷 변경
                  <input type="file" accept="image/*" onChange={handlePhoto} style={{display:'none'}}/>
                </label>
                <button onClick={()=>{setPhotoPreview(null);setPhotoFile(null)}} style={{background:'rgba(239,68,68,.8)',border:'none',borderRadius:10,padding:'8px 16px',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer'}}>
                  🗑️ 삭제
                </button>
              </div>
            </div>
          ) : (
            <label style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:130,background:c.card,border:'2px dashed '+c.inpBorder,borderRadius:16,cursor:'pointer',gap:8}}>
              <span style={{fontSize:32}}>📷</span>
              <span style={{color:c.t2,fontSize:13}}>사진 추가하기</span>
              <span style={{color:c.t3,fontSize:11}}>탭해서 사진 선택</span>
              <input type="file" accept="image/*" onChange={handlePhoto} style={{display:'none'}}/>
            </label>
          )}
        </div>

        {/* 저장 버튼 */}
        <button onClick={save} disabled={saving||uploading} style={{width:'100%',padding:'15px',border:'none',borderRadius:14,color:'#fff',fontSize:15,fontWeight:700,cursor:'pointer',background:saved?'linear-gradient(135deg,#10B981,#0FF5C0)':saving?'rgba(29,155,240,.4)':'linear-gradient(135deg,#1D9BF0,#00D4FF)',transition:'all .3s'}}>
          {saved?'✓ 저장 완료!':uploading?'사진 업로드 중...':saving?'저장 중...':'세션 저장'}
        </button>
      </div>

      <nav style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',maxWidth:430,width:'100%',background:c.header,borderTop:'1px solid '+c.border,display:'flex',padding:'7px 0 10px'}}>
        {[{label:'홈',icon:'◈',href:'/dashboard'},{label:'추가',icon:'＋',href:'/add'},{label:'기록',icon:'≡',href:'/history'},{label:'통계',icon:'◉',href:'/stats'}].map(n=>(
          <button key={n.label} onClick={()=>router.push(n.href)} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2,background:'none',border:'none',cursor:'pointer',padding:'3px 0'}}>
            <div style={{width:34,height:34,borderRadius:10,background:n.href==='/add'?'linear-gradient(135deg,#1D9BF0,#00D4FF)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,color:n.href==='/add'?'#fff':c.t3}}>{n.icon}</div>
            <span style={{fontSize:10,color:n.href==='/add'?'#1D9BF0':c.t3}}>{n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
