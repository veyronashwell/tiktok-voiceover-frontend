import { useState, useRef, useCallback } from "react";

// ── Replace this with your HuggingFace Space URL ──────────────────────────
// e.g. "https://YOUR-USERNAME-tiktok-voiceover-api.hf.space"
const API_BASE = import.meta.env.VITE_API_URL || "https://YOUR-HF-SPACE.hf.space";

const STEPS = {
  queued: { label: "Queued", pct: 5 },
  extracting_audio: { label: "Extracting audio…", pct: 20 },
  transcribing: { label: "Transcribing speech…", pct: 40 },
  translating: { label: "Translating to English…", pct: 60 },
  generating_voiceover: { label: "Generating UK voiceover…", pct: 80 },
  merging_video: { label: "Merging video…", pct: 90 },
  done: { label: "Done!", pct: 100 },
  error: { label: "Error", pct: 0 },
};

const UK_VOICES = [
  { value: "en-GB-SoniaNeural", label: "Sonia (Female, warm)" },
  { value: "en-GB-RyanNeural", label: "Ryan (Male, professional)" },
  { value: "en-GB-LibbyNeural", label: "Libby (Female, friendly)" },
  { value: "en-GB-AbbiNeural", label: "Abbi (Female, energetic)" },
  { value: "en-GB-OliverNeural", label: "Oliver (Male, authoritative)" },
];

export default function App() {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [voice, setVoice] = useState("en-GB-SoniaNeural");
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [transcript, setTranscript] = useState(null);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const pollRef = useRef(null);
  const fileInputRef = useRef(null);

  const reset = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setFile(null);
    setJobId(null);
    setJobStatus(null);
    setTranscript(null);
    setError(null);
    setUploading(false);
    setDownloadUrl(null);
  };

  const handleFile = (f) => {
    if (!f) return;
    const allowed = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/webm", "video/x-matroska"];
    if (!allowed.includes(f.type) && !f.name.match(/\.(mp4|mov|avi|mkv|webm)$/i)) {
      setError("Please upload a video file (MP4, MOV, AVI, MKV, WebM)");
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      setError("File too large. Maximum 50MB.");
      return;
    }
    setError(null);
    setFile(f);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    handleFile(f);
  }, []);

  const startPolling = (id) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/status/${id}`);
        const data = await res.json();
        setJobStatus(data.status);

        if (data.english_text) setTranscript(data.english_text);

        if (data.status === "done") {
          clearInterval(pollRef.current);
          setDownloadUrl(`${API_BASE}/download/${id}`);
        } else if (data.status === "error") {
          clearInterval(pollRef.current);
          setError(data.error || "Processing failed");
        }
      } catch (e) {
        console.error("Poll error:", e);
      }
    }, 3000);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    setJobStatus("uploading");

    const form = new FormData();
    form.append("file", file);
    form.append("voice", voice);

    try {
      const res = await fetch(`${API_BASE}/upload?voice=${encodeURIComponent(voice)}`, {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Upload failed");
      }

      const data = await res.json();
      setJobId(data.job_id);
      setJobStatus("queued");
      setUploading(false);
      startPolling(data.job_id);
    } catch (e) {
      setError(e.message);
      setUploading(false);
      setJobStatus(null);
    }
  };

  const step = STEPS[jobStatus] || null;
  const isProcessing = jobStatus && jobStatus !== "done" && jobStatus !== "error";

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
      fontFamily: "'Inter', -apple-system, sans-serif",
      color: "#fff",
      padding: "0",
    }}>
      {/* Header */}
      <header style={{
        background: "rgba(255,255,255,0.05)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        padding: "16px 24px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}>
        <span style={{ fontSize: "28px" }}>🎙️</span>
        <div>
          <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 700 }}>TikTok Voiceover</h1>
          <p style={{ margin: 0, fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>
            Any language → UK English voiceover
          </p>
        </div>
      </header>

      <main style={{ maxWidth: "680px", margin: "0 auto", padding: "40px 24px" }}>

        {/* Upload Card */}
        {!jobId && (
          <div style={{
            background: "rgba(255,255,255,0.07)",
            borderRadius: "20px",
            padding: "32px",
            border: "1px solid rgba(255,255,255,0.1)",
          }}>
            <h2 style={{ margin: "0 0 24px", fontSize: "18px", fontWeight: 600 }}>
              Upload your TikTok video
            </h2>

            {/* Drop Zone */}
            <div
              onDrop={onDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? "#a78bfa" : "rgba(255,255,255,0.2)"}`,
                borderRadius: "12px",
                padding: "48px 24px",
                textAlign: "center",
                cursor: "pointer",
                background: dragOver ? "rgba(167,139,250,0.1)" : "rgba(255,255,255,0.03)",
                transition: "all 0.2s",
                marginBottom: "24px",
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                style={{ display: "none" }}
                onChange={(e) => handleFile(e.target.files[0])}
              />
              {file ? (
                <div>
                  <div style={{ fontSize: "40px", marginBottom: "8px" }}>🎬</div>
                  <p style={{ margin: "0 0 4px", fontWeight: 600 }}>{file.name}</p>
                  <p style={{ margin: 0, fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>
                    {(file.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: "40px", marginBottom: "12px" }}>📱</div>
                  <p style={{ margin: "0 0 8px", fontWeight: 600 }}>Drop your video here</p>
                  <p style={{ margin: 0, fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>
                    MP4, MOV, AVI, MKV, WebM · Max 50MB
                  </p>
                </div>
              )}
            </div>

            {/* Voice selector */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", display: "block", marginBottom: "8px" }}>
                🇬🇧 UK English Voice
              </label>
              <select
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "14px",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                {UK_VOICES.map((v) => (
                  <option key={v.value} value={v.value} style={{ background: "#302b63" }}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div style={{
                background: "rgba(239,68,68,0.15)",
                border: "1px solid rgba(239,68,68,0.4)",
                borderRadius: "8px",
                padding: "12px 16px",
                fontSize: "14px",
                color: "#fca5a5",
                marginBottom: "20px",
              }}>
                ⚠️ {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!file || uploading}
              style={{
                width: "100%",
                padding: "14px",
                background: file && !uploading
                  ? "linear-gradient(135deg, #7c3aed, #4f46e5)"
                  : "rgba(255,255,255,0.1)",
                border: "none",
                borderRadius: "10px",
                color: "#fff",
                fontSize: "16px",
                fontWeight: 600,
                cursor: file && !uploading ? "pointer" : "not-allowed",
                transition: "all 0.2s",
              }}
            >
              {uploading ? "Uploading…" : "🚀 Convert to UK English"}
            </button>

            <p style={{ margin: "16px 0 0", fontSize: "12px", color: "rgba(255,255,255,0.35)", textAlign: "center" }}>
              Supports 16+ languages · Powered by Whisper + Helsinki-NLP + edge-tts
            </p>
          </div>
        )}

        {/* Progress Card */}
        {jobId && !downloadUrl && (
          <div style={{
            background: "rgba(255,255,255,0.07)",
            borderRadius: "20px",
            padding: "32px",
            border: "1px solid rgba(255,255,255,0.1)",
          }}>
            <h2 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 600 }}>
              Processing your video
            </h2>
            <p style={{ margin: "0 0 32px", fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>
              Job ID: {jobId}
            </p>

            {/* Progress bar */}
            <div style={{
              background: "rgba(255,255,255,0.1)",
              borderRadius: "999px",
              height: "8px",
              marginBottom: "12px",
              overflow: "hidden",
            }}>
              <div style={{
                height: "100%",
                width: `${step?.pct || 5}%`,
                background: "linear-gradient(90deg, #7c3aed, #818cf8)",
                borderRadius: "999px",
                transition: "width 0.6s ease",
              }} />
            </div>
            <p style={{ margin: "0 0 32px", fontSize: "14px", color: "rgba(255,255,255,0.7)" }}>
              {step?.label || "Processing…"}
            </p>

            {/* Steps list */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {Object.entries(STEPS).filter(([k]) => k !== "error").map(([key, val]) => {
                const pct = step?.pct || 0;
                const isDone = pct >= val.pct && key !== "done";
                const isCurrent = jobStatus === key;
                return (
                  <div key={key} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    opacity: pct >= val.pct ? 1 : 0.35,
                  }}>
                    <div style={{
                      width: "20px", height: "20px",
                      borderRadius: "50%",
                      background: isDone || isCurrent ? "linear-gradient(135deg, #7c3aed, #4f46e5)" : "rgba(255,255,255,0.15)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "11px", flexShrink: 0,
                    }}>
                      {isDone ? "✓" : ""}
                    </div>
                    <span style={{ fontSize: "14px" }}>{val.label}</span>
                  </div>
                );
              })}
            </div>

            {error && (
              <div style={{
                marginTop: "24px",
                background: "rgba(239,68,68,0.15)",
                border: "1px solid rgba(239,68,68,0.4)",
                borderRadius: "8px",
                padding: "12px 16px",
                fontSize: "14px",
                color: "#fca5a5",
              }}>
                ❌ Error: {error}
                <button onClick={reset} style={{
                  marginLeft: "12px", background: "none", border: "none",
                  color: "#fca5a5", cursor: "pointer", textDecoration: "underline",
                }}>Try again</button>
              </div>
            )}
          </div>
        )}

        {/* Done Card */}
        {downloadUrl && (
          <div style={{
            background: "rgba(255,255,255,0.07)",
            borderRadius: "20px",
            padding: "32px",
            border: "1px solid rgba(255,255,255,0.1)",
            textAlign: "center",
          }}>
            <div style={{ fontSize: "56px", marginBottom: "16px" }}>🎉</div>
            <h2 style={{ margin: "0 0 8px", fontSize: "22px", fontWeight: 700 }}>
              Your video is ready!
            </h2>
            <p style={{ margin: "0 0 32px", color: "rgba(255,255,255,0.5)", fontSize: "14px" }}>
              UK English voiceover has been added successfully
            </p>

            {transcript && (
              <div style={{
                background: "rgba(255,255,255,0.05)",
                borderRadius: "10px",
                padding: "16px",
                marginBottom: "24px",
                textAlign: "left",
              }}>
                <p style={{ margin: "0 0 8px", fontSize: "12px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  English transcript
                </p>
                <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.6, color: "rgba(255,255,255,0.8)" }}>
                  {transcript}
                </p>
              </div>
            )}

            <a
              href={downloadUrl}
              download
              style={{
                display: "inline-block",
                padding: "14px 32px",
                background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                borderRadius: "10px",
                color: "#fff",
                textDecoration: "none",
                fontSize: "16px",
                fontWeight: 600,
                marginBottom: "16px",
              }}
            >
              ⬇️ Download Video
            </a>

            <br />
            <button
              onClick={reset}
              style={{
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.4)",
                cursor: "pointer",
                fontSize: "14px",
                textDecoration: "underline",
              }}
            >
              Convert another video
            </button>
          </div>
        )}

        {/* Info cards */}
        {!jobId && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "16px",
            marginTop: "24px",
          }}>
            {[
              { icon: "🌍", title: "16+ Languages", desc: "Chinese, Spanish, French, Japanese, Korean & more" },
              { icon: "🇬🇧", title: "UK English", desc: "Natural neural voices via Microsoft edge-tts" },
              { icon: "⚡", title: "Auto-detect", desc: "No need to specify the source language" },
            ].map((card) => (
              <div key={card.title} style={{
                background: "rgba(255,255,255,0.05)",
                borderRadius: "12px",
                padding: "20px",
                border: "1px solid rgba(255,255,255,0.08)",
                textAlign: "center",
              }}>
                <div style={{ fontSize: "28px", marginBottom: "8px" }}>{card.icon}</div>
                <p style={{ margin: "0 0 6px", fontWeight: 600, fontSize: "14px" }}>{card.title}</p>
                <p style={{ margin: 0, fontSize: "12px", color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>{card.desc}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
