import { useState, useRef, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "https://YOUR-HF-SPACE.hf.space";

const STEPS = {
  queued:               { label: "Queued",                    pct: 5  },
  extracting_audio:     { label: "Extracting audio…",         pct: 20 },
  transcribing:         { label: "Transcribing speech…",      pct: 40 },
  translating:          { label: "Translating to English…",   pct: 60 },
  generating_voiceover: { label: "Generating voiceover…",     pct: 80 },
  merging_video:        { label: "Merging output…",           pct: 90 },
  done:                 { label: "Done!",                     pct: 100 },
  error:                { label: "Error",                     pct: 0  },
};

const LANGUAGES = {
  b: { name: "British English 🇬🇧", voices: { bf_emma: "Emma (Female)", bf_isabella: "Isabella (Female)", bm_george: "George (Male)", bm_lewis: "Lewis (Male)" }, default: "bf_emma" },
  a: { name: "American English 🇺🇸", voices: { af_heart: "Heart (Female)", af_sarah: "Sarah (Female)", am_adam: "Adam (Male)", am_michael: "Michael (Male)" }, default: "af_heart" },
  j: { name: "Japanese 🇯🇵",         voices: { jf_alpha: "Alpha (Female)", jm_kumo: "Kumo (Male)" }, default: "jf_alpha" },
  z: { name: "Mandarin 🇨🇳",         voices: { zf_xiaobei: "Xiaobei (Female)", zm_yunxi: "Yunxi (Male)" }, default: "zf_xiaobei" },
  e: { name: "Spanish 🇪🇸",          voices: { ef_dora: "Dora (Female)", em_alex: "Alex (Male)" }, default: "ef_dora" },
  f: { name: "French 🇫🇷",           voices: { ff_siwis: "Siwis (Female)" }, default: "ff_siwis" },
  h: { name: "Hindi 🇮🇳",            voices: { hf_alpha: "Alpha (Female)", hm_omega: "Omega (Male)" }, default: "hf_alpha" },
  i: { name: "Italian 🇮🇹",          voices: { if_sara: "Sara (Female)", im_nicola: "Nicola (Male)" }, default: "if_sara" },
  p: { name: "Portuguese 🇧🇷",       voices: { pf_dora: "Dora (Female)", pm_alex: "Alex (Male)" }, default: "pf_dora" },
};

const ACCEPT = ".mp4,.mov,.avi,.mkv,.webm,.m4v,.3gp,.flv,.mp3,.wav,.m4a,.aac,.ogg,.flac";

export default function App() {
  const [file, setFile]           = useState(null);
  const [dragOver, setDragOver]   = useState(false);
  const [langCode, setLangCode]   = useState("b");
  const [voice, setVoice]         = useState("bf_emma");
  const [jobId, setJobId]         = useState(null);
  const [jobData, setJobData]     = useState(null);
  const [error, setError]         = useState(null);
  const [uploading, setUploading] = useState(false);
  const pollRef    = useRef(null);
  const fileInput  = useRef(null);

  const reset = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setFile(null); setJobId(null); setJobData(null);
    setError(null); setUploading(false);
  };

  const handleLangChange = (code) => {
    setLangCode(code);
    setVoice(LANGUAGES[code].default);
  };

  const handleFile = (f) => {
    if (!f) return;
    if (f.size > 100 * 1024 * 1024) { setError("Max 100MB"); return; }
    setError(null);
    setFile(f);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }, []);

  const startPolling = (id) => {
    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`${API_BASE}/status/${id}`);
        const data = await res.json();
        setJobData(data);
        if (data.status === "done" || data.status === "error") {
          clearInterval(pollRef.current);
          if (data.status === "error") setError(data.error || "Processing failed");
        }
      } catch (e) { console.error(e); }
    }, 3000);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setUploading(true); setError(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch(`${API_BASE}/upload?voice=${voice}&lang_code=${langCode}`, {
        method: "POST", body: form,
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Upload failed"); }
      const data = await res.json();
      setJobId(data.job_id);
      setJobData({ status: "queued" });
      setUploading(false);
      startPolling(data.job_id);
    } catch (e) { setError(e.message); setUploading(false); }
  };

  const step        = STEPS[jobData?.status] || null;
  const isDone      = jobData?.status === "done";
  const isError     = jobData?.status === "error";
  const processing  = jobId && !isDone && !isError;
  const downloadUrl = isDone ? `${API_BASE}/download/${jobId}` : null;
  const isAudio     = file && [".mp3",".wav",".m4a",".aac",".ogg",".flac",".wma"].some(e => file.name.toLowerCase().endsWith(e));

  const S = {
    page:    { minHeight:"100vh", background:"linear-gradient(135deg,#0f0c29,#302b63,#24243e)", fontFamily:"'Inter',-apple-system,sans-serif", color:"#fff" },
    header:  { background:"rgba(255,255,255,0.05)", backdropFilter:"blur(10px)", borderBottom:"1px solid rgba(255,255,255,0.1)", padding:"16px 24px", display:"flex", alignItems:"center", gap:"12px" },
    main:    { maxWidth:"700px", margin:"0 auto", padding:"40px 24px" },
    card:    { background:"rgba(255,255,255,0.07)", borderRadius:"20px", padding:"32px", border:"1px solid rgba(255,255,255,0.1)", marginBottom:"20px" },
    btn:     (active) => ({ width:"100%", padding:"14px", background: active ? "linear-gradient(135deg,#7c3aed,#4f46e5)" : "rgba(255,255,255,0.1)", border:"none", borderRadius:"10px", color:"#fff", fontSize:"16px", fontWeight:600, cursor: active ? "pointer" : "not-allowed", transition:"all 0.2s" }),
    select:  { width:"100%", padding:"10px 14px", background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:"8px", color:"#fff", fontSize:"14px", outline:"none", cursor:"pointer" },
    label:   { fontSize:"13px", color:"rgba(255,255,255,0.7)", display:"block", marginBottom:"8px" },
    drop:    (over) => ({ border:`2px dashed ${over?"#a78bfa":"rgba(255,255,255,0.2)"}`, borderRadius:"12px", padding:"40px 24px", textAlign:"center", cursor:"pointer", background: over?"rgba(167,139,250,0.1)":"rgba(255,255,255,0.03)", transition:"all 0.2s", marginBottom:"20px" }),
    error:   { background:"rgba(239,68,68,0.15)", border:"1px solid rgba(239,68,68,0.4)", borderRadius:"8px", padding:"12px 16px", fontSize:"14px", color:"#fca5a5", marginBottom:"16px" },
    bar:     { background:"rgba(255,255,255,0.1)", borderRadius:"999px", height:"8px", marginBottom:"12px", overflow:"hidden" },
    fill:    (pct) => ({ height:"100%", width:`${pct}%`, background:"linear-gradient(90deg,#7c3aed,#818cf8)", borderRadius:"999px", transition:"width 0.6s ease" }),
    transcript: { background:"rgba(255,255,255,0.05)", borderRadius:"10px", padding:"16px", marginBottom:"24px", textAlign:"left" },
    grid3:   { display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"16px", marginTop:"20px" },
    infoCard:{ background:"rgba(255,255,255,0.05)", borderRadius:"12px", padding:"20px", border:"1px solid rgba(255,255,255,0.08)", textAlign:"center" },
  };

  return (
    <div style={S.page}>
      <header style={S.header}>
        <span style={{fontSize:"28px"}}>🎙️</span>
        <div>
          <h1 style={{margin:0,fontSize:"20px",fontWeight:700}}>TikTok Voiceover</h1>
          <p style={{margin:0,fontSize:"12px",color:"rgba(255,255,255,0.5)"}}>Any language video/audio → voiceover in 9 languages</p>
        </div>
      </header>

      <main style={S.main}>

        {/* ── Upload form ── */}
        {!jobId && (
          <div style={S.card}>
            {/* Drop zone */}
            <div style={S.drop(dragOver)}
              onDrop={onDrop}
              onDragOver={(e)=>{e.preventDefault();setDragOver(true);}}
              onDragLeave={()=>setDragOver(false)}
              onClick={()=>fileInput.current?.click()}>
              <input ref={fileInput} type="file" accept={ACCEPT} style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])} />
              {file ? (
                <div>
                  <div style={{fontSize:"40px",marginBottom:"8px"}}>{isAudio ? "🎵" : "🎬"}</div>
                  <p style={{margin:"0 0 4px",fontWeight:600}}>{file.name}</p>
                  <p style={{margin:0,fontSize:"13px",color:"rgba(255,255,255,0.5)"}}>{(file.size/1024/1024).toFixed(1)} MB · {isAudio ? "Audio file" : "Video file"}</p>
                </div>
              ) : (
                <div>
                  <div style={{fontSize:"40px",marginBottom:"12px"}}>📁</div>
                  <p style={{margin:"0 0 8px",fontWeight:600}}>Drop video or audio file here</p>
                  <p style={{margin:0,fontSize:"12px",color:"rgba(255,255,255,0.45)"}}>Video: MP4 MOV AVI MKV WebM · Audio: MP3 WAV M4A AAC OGG FLAC · Max 100MB</p>
                </div>
              )}
            </div>

            {/* Output language */}
            <div style={{marginBottom:"16px"}}>
              <label style={S.label}>🌍 Output Language</label>
              <select value={langCode} onChange={e=>handleLangChange(e.target.value)} style={S.select}>
                {Object.entries(LANGUAGES).map(([code,lang])=>(
                  <option key={code} value={code} style={{background:"#302b63"}}>{lang.name}</option>
                ))}
              </select>
            </div>

            {/* Voice */}
            <div style={{marginBottom:"20px"}}>
              <label style={S.label}>🗣️ Voice</label>
              <select value={voice} onChange={e=>setVoice(e.target.value)} style={S.select}>
                {Object.entries(LANGUAGES[langCode].voices).map(([v,label])=>(
                  <option key={v} value={v} style={{background:"#302b63"}}>{label}</option>
                ))}
              </select>
            </div>

            {error && <div style={S.error}>⚠️ {error}</div>}

            <button onClick={handleSubmit} disabled={!file||uploading} style={S.btn(file&&!uploading)}>
              {uploading ? "Uploading…" : "🚀 Generate Voiceover"}
            </button>

            <p style={{margin:"16px 0 0",fontSize:"12px",color:"rgba(255,255,255,0.3)",textAlign:"center"}}>
              Powered by Whisper (transcribe) + Kokoro (voice) · No computer vision · Audio only processing
            </p>

            {/* Info cards */}
            <div style={S.grid3}>
              {[
                {icon:"🌐", title:"99+ Input Langs",  desc:"Whisper detects and translates any language automatically"},
                {icon:"🗣️", title:"9 Output Langs",   desc:"British English, American, Japanese, Mandarin, Spanish & more"},
                {icon:"⚡", title:"Video & Audio",    desc:"MP4, MOV, AVI, MKV, MP3, WAV, M4A and more"},
              ].map(c=>(
                <div key={c.title} style={S.infoCard}>
                  <div style={{fontSize:"26px",marginBottom:"8px"}}>{c.icon}</div>
                  <p style={{margin:"0 0 4px",fontWeight:600,fontSize:"13px"}}>{c.title}</p>
                  <p style={{margin:0,fontSize:"11px",color:"rgba(255,255,255,0.4)",lineHeight:1.5}}>{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Progress ── */}
        {jobId && !isDone && (
          <div style={S.card}>
            <h2 style={{margin:"0 0 6px",fontSize:"18px"}}>Processing your file</h2>
            <p style={{margin:"0 0 28px",fontSize:"13px",color:"rgba(255,255,255,0.4)"}}>Job: {jobId}</p>
            <div style={S.bar}><div style={S.fill(step?.pct||5)} /></div>
            <p style={{margin:"0 0 28px",fontSize:"14px",color:"rgba(255,255,255,0.7)"}}>{step?.label||"Working…"}</p>
            {Object.entries(STEPS).filter(([k])=>k!=="error").map(([key,val])=>(
              <div key={key} style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"8px",opacity:(step?.pct||0)>=val.pct?1:0.3}}>
                <div style={{width:"18px",height:"18px",borderRadius:"50%",background:(step?.pct||0)>=val.pct?"linear-gradient(135deg,#7c3aed,#4f46e5)":"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"10px",flexShrink:0}}>
                  {(step?.pct||0)>val.pct?"✓":""}
                </div>
                <span style={{fontSize:"13px"}}>{val.label}</span>
              </div>
            ))}
            {isError && (
              <div style={{...S.error,marginTop:"20px"}}>
                ❌ {error}
                <button onClick={reset} style={{marginLeft:"12px",background:"none",border:"none",color:"#fca5a5",cursor:"pointer",textDecoration:"underline"}}>Try again</button>
              </div>
            )}
          </div>
        )}

        {/* ── Done ── */}
        {isDone && (
          <div style={{...S.card,textAlign:"center"}}>
            <div style={{fontSize:"56px",marginBottom:"16px"}}>🎉</div>
            <h2 style={{margin:"0 0 6px",fontSize:"22px",fontWeight:700}}>Your file is ready!</h2>
            <p style={{margin:"0 0 8px",fontSize:"14px",color:"rgba(255,255,255,0.5)"}}>
              {jobData?.detected_language && `Detected: ${jobData.detected_language.toUpperCase()} → ${jobData.output_language || LANGUAGES[langCode]?.name}`}
            </p>
            {jobData?.english_text && (
              <div style={S.transcript}>
                <p style={{margin:"0 0 6px",fontSize:"11px",color:"rgba(255,255,255,0.4)",textTransform:"uppercase",letterSpacing:"0.05em"}}>English transcript</p>
                <p style={{margin:0,fontSize:"13px",lineHeight:1.7,color:"rgba(255,255,255,0.8)"}}>{jobData.english_text}</p>
              </div>
            )}
            <a href={downloadUrl} download style={{display:"inline-block",padding:"14px 32px",background:"linear-gradient(135deg,#7c3aed,#4f46e5)",borderRadius:"10px",color:"#fff",textDecoration:"none",fontSize:"16px",fontWeight:600,marginBottom:"16px"}}>
              ⬇️ Download {jobData?.output_type === "audio" ? "Audio" : "Video"}
            </a>
            <br/>
            <button onClick={reset} style={{background:"none",border:"none",color:"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:"14px",textDecoration:"underline"}}>
              Convert another file
            </button>
          </div>
        )}

      </main>
    </div>
  );
}
