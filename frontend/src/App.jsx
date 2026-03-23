import { useState, useEffect, useRef, useCallback } from "react";

const API = "/api";

// ── Axios-like fetch wrapper ──
const api = {
  async get(url, token) {
    const r = await fetch(API + url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!r.ok) { const e = await r.json(); throw e; }
    return r.json();
  },
  async post(url, data, token) {
    const r = await fetch(API + url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(data)
    });
    if (!r.ok) { const e = await r.json(); throw e; }
    return r.json();
  },
  async put(url, data, token) {
    const r = await fetch(API + url, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(data)
    });
    if (!r.ok) { const e = await r.json(); throw e; }
    return r.json();
  },
  async delete(url, token) {
    const r = await fetch(API + url, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!r.ok) { const e = await r.json(); throw e; }
    return r.json();
  },
  async postForm(url, formData, token) {
    const r = await fetch(API + url, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData
    });
    if (!r.ok) { const e = await r.json(); throw e; }
    return r.json();
  },
  async putForm(url, formData, token) {
    const r = await fetch(API + url, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
    if (!r.ok) { const e = await r.json(); throw e; }
    return r.json();
  },
  getExportUrl(examId) {
    return `${API}/exams/${examId}/export`;
  }
};

// ── Color palette ──
const colors = {
  bg: "#0a0e1a",
  surface: "#111827",
  card: "#1a2236",
  border: "#1e2d47",
  accent: "#3b82f6",
  accentHover: "#2563eb",
  success: "#10b981",
  danger: "#ef4444",
  warning: "#f59e0b",
  text: "#e2e8f0",
  muted: "#64748b",
  highlight: "#1e3a5f"
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${colors.bg}; color: ${colors.text}; font-family: 'Space Grotesk', sans-serif; min-height: 100vh; }
  input, select, textarea { font-family: inherit; }
  button { cursor: pointer; font-family: inherit; }
  ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: ${colors.surface}; } ::-webkit-scrollbar-thumb { background: ${colors.border}; border-radius: 3px; }
  .fade-in { animation: fadeIn .35s ease; }
  @keyframes fadeIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
  @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.5; } }
  @keyframes timerDrain { from { width:100%; } to { width:0%; } }
`;

// ── Reusable UI components ──
function Btn({ children, onClick, variant = "primary", size = "md", disabled, style = {} }) {
  const base = {
    border: "none", borderRadius: 8, fontWeight: 600, transition: "all .2s", cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? .5 : 1,
    padding: size === "sm" ? "6px 14px" : size === "lg" ? "14px 32px" : "10px 22px",
    fontSize: size === "sm" ? 13 : size === "lg" ? 17 : 15,
  };
  const variants = {
    primary: { background: colors.accent, color: "#fff" },
    success: { background: colors.success, color: "#fff" },
    danger: { background: colors.danger, color: "#fff" },
    ghost: { background: "transparent", color: colors.muted, border: `1px solid ${colors.border}` },
    outline: { background: "transparent", color: colors.accent, border: `1px solid ${colors.accent}` },
  };
  return <button style={{ ...base, ...variants[variant], ...style }} onClick={disabled ? undefined : onClick} disabled={disabled}>{children}</button>;
}

function Input({ label, ...props }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: colors.muted, fontWeight: 500 }}>{label}</label>}
      <input style={{
        width: "100%", padding: "10px 14px", background: colors.surface, border: `1px solid ${colors.border}`,
        borderRadius: 8, color: colors.text, fontSize: 15, outline: "none"
      }} {...props} />
    </div>
  );
}

function Textarea({ label, ...props }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: colors.muted, fontWeight: 500 }}>{label}</label>}
      <textarea style={{
        width: "100%", padding: "10px 14px", background: colors.surface, border: `1px solid ${colors.border}`,
        borderRadius: 8, color: colors.text, fontSize: 15, outline: "none", minHeight: 90, resize: "vertical"
      }} {...props} />
    </div>
  );
}

function Card({ children, style = {} }) {
  return <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 24, ...style }}>{children}</div>;
}

function Badge({ children, color = colors.accent }) {
  return <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>{children}</span>;
}

function Alert({ msg, type = "error" }) {
  if (!msg) return null;
  const c = type === "error" ? colors.danger : type === "success" ? colors.success : colors.warning;
  return <div style={{ background: c + "18", border: `1px solid ${c}44`, borderRadius: 8, padding: "10px 16px", marginBottom: 16, color: c, fontSize: 14 }}>{msg}</div>;
}

// ── APP ROOT ──
export default function App() {
  const [page, setPage] = useState("home"); // home | login | register | dashboard | exam-take | exam-result
  const [token, setToken] = useState(localStorage.getItem("qcm_token") || null);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("qcm_user") || "null"));
  const [examToTake, setExamToTake] = useState(null);

  useEffect(() => {
    if (token) setPage("dashboard");
  }, []);

  function login(tok, usr) {
    localStorage.setItem("qcm_token", tok);
    localStorage.setItem("qcm_user", JSON.stringify(usr));
    setToken(tok); setUser(usr); setPage("dashboard");
  }
  function logout() {
    localStorage.removeItem("qcm_token");
    localStorage.removeItem("qcm_user");
    setToken(null); setUser(null); setPage("home");
  }
  function startExamTake(examId) { setExamToTake(examId); setPage("exam-take"); }
  function showResult(score) { setPage("exam-result"); }

  return (
    <>
      <style>{css}</style>
      <div style={{ minHeight: "100vh", background: colors.bg }}>
        {page === "home" && <HomePage onLogin={() => setPage("login")} onRegister={() => setPage("register")} onTakeExam={startExamTake} />}
        {page === "login" && <LoginPage onLogin={login} onBack={() => setPage("home")} onRegister={() => setPage("register")} />}
        {page === "register" && <RegisterPage onLogin={login} onBack={() => setPage("home")} />}
        {page === "dashboard" && <Dashboard token={token} user={user} onLogout={logout} />}
        {page === "exam-take" && <ExamTakePage examId={examToTake} onBack={() => setPage("home")} />}
      </div>
    </>
  );
}

// ── HOME PAGE ──
function HomePage({ onLogin, onRegister, onTakeExam }) {
  const [examId, setExamId] = useState("");
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ textAlign: "center", marginBottom: 60 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎓</div>
        <h1 style={{ fontSize: 42, fontWeight: 700, background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 12 }}>QCM Platform</h1>
        <p style={{ color: colors.muted, fontSize: 18 }}>Plateforme d'examens en ligne sécurisée</p>
      </div>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center", marginBottom: 48 }}>
        <Card style={{ width: 340, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📝</div>
          <h2 style={{ marginBottom: 8 }}>Passer un examen</h2>
          <p style={{ color: colors.muted, marginBottom: 20, fontSize: 14 }}>Entrez l'identifiant de l'examen fourni par votre professeur</p>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={examId} onChange={e => setExamId(e.target.value)} placeholder="ID de l'examen" style={{ flex: 1, padding: "10px 14px", background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.text, fontSize: 15 }} />
            <Btn onClick={() => examId && onTakeExam(examId)} disabled={!examId}>→</Btn>
          </div>
        </Card>
        <Card style={{ width: 340, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>👨‍🏫</div>
          <h2 style={{ marginBottom: 8 }}>Espace Professeur</h2>
          <p style={{ color: colors.muted, marginBottom: 20, fontSize: 14 }}>Gérez vos examens, questions et consultez les résultats</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <Btn onClick={onLogin}>Connexion</Btn>
            <Btn onClick={onRegister} variant="outline">S'inscrire</Btn>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── LOGIN ──
function LoginPage({ onLogin, onBack, onRegister }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function submit() {
    setLoading(true); setError("");
    try {
      const data = await api.post("/auth/login", form);
      onLogin(data.token, data.user);
    } catch (e) { setError(e.message || "Erreur de connexion"); }
    setLoading(false);
  }
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <Card style={{ width: "100%", maxWidth: 420 }} className="fade-in">
        <button onClick={onBack} style={{ background: "none", border: "none", color: colors.muted, marginBottom: 20, cursor: "pointer", fontSize: 14 }}>← Retour</button>
        <h2 style={{ marginBottom: 24, fontSize: 24 }}>Connexion Professeur</h2>
        <Alert msg={error} />
        <Input label="Email" type="email" value={form.email} onChange={set("email")} placeholder="prof@universite.ma" />
        <Input label="Mot de passe" type="password" value={form.password} onChange={set("password")} onKeyDown={e => e.key === "Enter" && submit()} />
        <Btn onClick={submit} disabled={loading} style={{ width: "100%", marginTop: 8 }} size="lg">{loading ? "Connexion..." : "Se connecter"}</Btn>
        <p style={{ textAlign: "center", marginTop: 16, color: colors.muted, fontSize: 14 }}>Pas de compte ? <span onClick={onRegister} style={{ color: colors.accent, cursor: "pointer" }}>S'inscrire</span></p>
      </Card>
    </div>
  );
}

// ── REGISTER ──
function RegisterPage({ onLogin, onBack }) {
  const [form, setForm] = useState({ email: "", password: "", first_name: "", last_name: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function submit() {
    setLoading(true); setError("");
    try {
      const data = await api.post("/auth/register", form);
      onLogin(data.token, data.user);
    } catch (e) { setError(e.message || "Erreur inscription"); }
    setLoading(false);
  }
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <Card style={{ width: "100%", maxWidth: 420 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: colors.muted, marginBottom: 20, cursor: "pointer", fontSize: 14 }}>← Retour</button>
        <h2 style={{ marginBottom: 24, fontSize: 24 }}>Créer un compte</h2>
        <Alert msg={error} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Prénom" value={form.first_name} onChange={set("first_name")} />
          <Input label="Nom" value={form.last_name} onChange={set("last_name")} />
        </div>
        <Input label="Email" type="email" value={form.email} onChange={set("email")} />
        <Input label="Mot de passe" type="password" value={form.password} onChange={set("password")} />
        <Btn onClick={submit} disabled={loading} style={{ width: "100%", marginTop: 8 }} size="lg">{loading ? "Inscription..." : "Créer le compte"}</Btn>
      </Card>
    </div>
  );
}

// ── DASHBOARD ──
function Dashboard({ token, user, onLogout }) {
  const [tab, setTab] = useState("exams");
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [showExamForm, setShowExamForm] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [loading, setLoading] = useState(false);

  async function loadExams() {
    setLoading(true);
    try { setExams(await api.get("/exams", token)); } catch {}
    setLoading(false);
  }
  useEffect(() => { loadExams(); }, []);

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Navbar */}
      <div style={{ background: colors.surface, borderBottom: `1px solid ${colors.border}`, padding: "0 24px", display: "flex", alignItems: "center", height: 60 }}>
        <span style={{ fontWeight: 700, fontSize: 18, color: colors.accent, marginRight: "auto" }}>🎓 QCM Platform</span>
        <span style={{ color: colors.muted, marginRight: 20, fontSize: 14 }}>{user?.first_name} {user?.last_name}</span>
        <Btn onClick={onLogout} variant="ghost" size="sm">Déconnexion</Btn>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {["exams", "questions", "results"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14,
              background: tab === t ? colors.accent : colors.card,
              color: tab === t ? "#fff" : colors.muted,
            }}>
              {t === "exams" ? "📋 Examens" : t === "questions" ? "❓ Questions" : "📊 Résultats"}
            </button>
          ))}
        </div>

        {tab === "exams" && (
          <ExamsTab exams={exams} loading={loading} token={token} onRefresh={loadExams}
            onSelectExam={e => { setSelectedExam(e); setTab("questions"); }}
            onViewResults={e => { setSelectedExam(e); setTab("results"); }} />
        )}
        {tab === "questions" && (
          <QuestionsTab exam={selectedExam} exams={exams} token={token}
            onSelectExam={setSelectedExam} />
        )}
        {tab === "results" && (
          <ResultsTab exam={selectedExam} exams={exams} token={token}
            onSelectExam={setSelectedExam} />
        )}
      </div>
    </div>
  );
}

// ── EXAMS TAB ──
function ExamsTab({ exams, loading, token, onRefresh, onSelectExam, onViewResults }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", duration_per_question: 30, instructions: "", is_active: true, require_location: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  function startCreate() { setEditing(null); setForm({ title: "", description: "", duration_per_question: 30, instructions: "", is_active: true, require_location: true }); setShowForm(true); }
  function startEdit(exam) { setEditing(exam); setForm({ title: exam.title, description: exam.description, duration_per_question: exam.duration_per_question, instructions: exam.instructions, is_active: exam.is_active, require_location: exam.require_location }); setShowForm(true); }

  async function save() {
    setSaving(true); setError("");
    try {
      if (editing) await api.put(`/exams/${editing.id}`, form, token);
      else await api.post("/exams", form, token);
      setShowForm(false); onRefresh();
    } catch (e) { setError(e.message || "Erreur"); }
    setSaving(false);
  }

  async function del(id) {
    if (!confirm("Supprimer cet examen et toutes ses questions ?")) return;
    try { await api.delete(`/exams/${id}`, token); onRefresh(); } catch {}
  }

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 22 }}>Mes Examens</h2>
        <Btn onClick={startCreate}>+ Nouvel examen</Btn>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16 }}>{editing ? "Modifier l'examen" : "Nouvel examen"}</h3>
          <Alert msg={error} />
          <Input label="Titre *" value={form.title} onChange={set("title")} />
          <Textarea label="Description" value={form.description} onChange={set("description")} />
          <Textarea label="Consignes affichées aux candidats" value={form.instructions} onChange={set("instructions")} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, color: colors.muted, display: "block", marginBottom: 6 }}>Durée par question (secondes)</label>
              <input type="number" value={form.duration_per_question} onChange={set("duration_per_question")} style={{ width: "100%", padding: "10px 14px", background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.text }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 22 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input type="checkbox" checked={form.is_active} onChange={set("is_active")} />
                <span style={{ fontSize: 14 }}>Examen actif</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input type="checkbox" checked={form.require_location} onChange={set("require_location")} />
                <span style={{ fontSize: 14 }}>Exiger la géolocalisation</span>
              </label>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <Btn onClick={save} disabled={saving}>{saving ? "Enregistrement..." : "Enregistrer"}</Btn>
            <Btn onClick={() => setShowForm(false)} variant="ghost">Annuler</Btn>
          </div>
        </Card>
      )}

      {loading ? <p style={{ color: colors.muted }}>Chargement...</p> : exams.length === 0 ? (
        <Card style={{ textAlign: "center", padding: 48 }}>
          <p style={{ color: colors.muted, fontSize: 16 }}>Aucun examen créé. Créez votre premier examen !</p>
        </Card>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {exams.map(exam => (
            <Card key={exam.id} style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <h3 style={{ fontSize: 17 }}>{exam.title}</h3>
                  <Badge color={exam.is_active ? colors.success : colors.muted}>{exam.is_active ? "Actif" : "Inactif"}</Badge>
                </div>
                <div style={{ display: "flex", gap: 20, fontSize: 13, color: colors.muted }}>
                  <span>🆔 ID : <strong style={{ color: colors.accent, fontFamily: "JetBrains Mono" }}>{exam.id}</strong></span>
                  <span>❓ {exam.question_count || 0} questions</span>
                  <span>👥 {exam.completed_count || 0} passages</span>
                  <span>⏱ {exam.duration_per_question}s / question</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn onClick={() => onSelectExam(exam)} size="sm" variant="outline">Questions</Btn>
                <Btn onClick={() => onViewResults(exam)} size="sm" variant="ghost">Résultats</Btn>
                <Btn onClick={() => startEdit(exam)} size="sm" variant="ghost">Modifier</Btn>
                <Btn onClick={() => del(exam.id)} size="sm" variant="danger">Supprimer</Btn>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── AI GENERATION MODAL ──
function AIGenerateModal({ exam, token, onClose, onGenerated }) {
  const storedKey = localStorage.getItem("gemini_api_key") || "";
  const [apiKey, setApiKey] = useState(storedKey);
  const [keyConfirmed, setKeyConfirmed] = useState(!!storedKey);
  const [showKey, setShowKey] = useState(false);
  const [form, setForm] = useState({ topic: "", count: 5, level: "intermédiaire", language: "français" });
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  function confirmKey() {
    const k = apiKey.trim();
    if (!k) return setError("Veuillez entrer votre clé API");
    localStorage.setItem("gemini_api_key", k);
    setKeyConfirmed(true);
    setError("");
  }
  function resetKey() {
    localStorage.removeItem("gemini_api_key");
    setApiKey(""); setKeyConfirmed(false); setPreview(null); setError("");
  }

  async function generate(saveDirectly = false) {
    if (!form.topic.trim()) return setError("Veuillez entrer un sujet");
    setLoading(true); setError(""); setPreview(null);
    try {
      const data = await api.post(`/exams/${exam.id}/generate-questions`, {
        ...form, count: parseInt(form.count), save: saveDirectly,
        geminiKey: localStorage.getItem("gemini_api_key")
      }, token);
      if (saveDirectly) { onGenerated(); onClose(); }
      else setPreview(data.questions);
    } catch (e) { setError(e.message || "Erreur lors de la génération"); }
    setLoading(false);
  }

  async function savePreview() {
    setLoading(true); setError("");
    try {
      await api.post(`/exams/${exam.id}/generate-questions`, {
        ...form, count: parseInt(form.count), save: true,
        geminiKey: localStorage.getItem("gemini_api_key")
      }, token);
      onGenerated(); onClose();
    } catch (e) { setError(e.message || "Erreur lors de la sauvegarde"); }
    setLoading(false);
  }

  const levels = ["débutant", "intermédiaire", "avancé", "expert"];
  const languages = ["français", "anglais", "arabe", "espagnol", "darija"];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 16, width: "100%", maxWidth: 700, maxHeight: "92vh", overflowY: "auto" }}>

        {/* Header */}
        <div style={{ padding: "20px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: 20, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ background: "linear-gradient(135deg,#4285f4,#34a853)", borderRadius: 8, padding: "4px 10px", fontSize: 13, fontWeight: 700 }}>✨ Gemini</span>
              Générer des questions par IA
            </h3>
            <p style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>Examen : <strong style={{ color: colors.text }}>{exam.title}</strong></p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: colors.muted, fontSize: 24, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: "0 24px 24px" }}>
          <Alert msg={error} />

          {/* ── ÉTAPE 1 : Clé API ── */}
          {!keyConfirmed ? (
            <div style={{ background: colors.surface, border: `1px solid #4285f444`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <p style={{ fontWeight: 600, marginBottom: 6, fontSize: 15 }}>🔑 Étape 1 — Clé API Google Gemini (gratuite)</p>
              <p style={{ color: colors.muted, fontSize: 13, marginBottom: 14, lineHeight: 1.6 }}>
                Obtenez votre clé gratuite sur{" "}
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer"
                  style={{ color: "#4285f4", textDecoration: "underline" }}>
                  aistudio.google.com/apikey
                </a>
                {" "}— 1 500 requêtes/jour gratuites. La clé est sauvegardée localement dans votre navigateur.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && confirmKey()}
                    placeholder="AIza..."
                    style={{ width: "100%", padding: "10px 44px 10px 14px", background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.text, fontSize: 14, fontFamily: "JetBrains Mono" }}
                  />
                  <button onClick={() => setShowKey(s => !s)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: colors.muted, fontSize: 16 }}>
                    {showKey ? "🙈" : "👁"}
                  </button>
                </div>
                <Btn onClick={confirmKey} style={{ background: "linear-gradient(135deg,#4285f4,#34a853)", border: "none" }}>Confirmer</Btn>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#34a85318", border: "1px solid #34a85344", borderRadius: 10, padding: "10px 16px", marginBottom: 20 }}>
              <span style={{ color: "#34a853", fontSize: 14, fontWeight: 600 }}>✅ Clé Google Gemini configurée</span>
              <button onClick={resetKey} style={{ background: "none", border: "none", color: colors.muted, fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>Changer</button>
            </div>
          )}

          {/* ── ÉTAPE 2 : Paramètres de génération ── */}
          <div style={{ opacity: keyConfirmed ? 1 : 0.4, pointerEvents: keyConfirmed ? "auto" : "none" }}>
            <Textarea
              label="📚 Sujet / Thème de l'examen *"
              value={form.topic}
              onChange={set("topic")}
              placeholder="Ex: La factorisation algébrique, La Révolution française, Les réseaux informatiques..."
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 13, color: colors.muted, display: "block", marginBottom: 6 }}>Nombre de questions</label>
                <input type="number" min="1" max="20" value={form.count} onChange={set("count")}
                  style={{ width: "100%", padding: "10px 14px", background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.text }} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: colors.muted, display: "block", marginBottom: 6 }}>Niveau</label>
                <select value={form.level} onChange={set("level")} style={{ width: "100%", padding: "10px 14px", background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.text }}>
                  {levels.map(l => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, color: colors.muted, display: "block", marginBottom: 6 }}>Langue</label>
                <select value={form.language} onChange={set("language")} style={{ width: "100%", padding: "10px 14px", background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.text }}>
                  {languages.map(l => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: preview ? 24 : 0 }}>
              <Btn onClick={() => generate(false)} disabled={loading} variant="outline" style={{ flex: 1 }}>
                {loading && !preview ? "⏳ Génération en cours..." : "👁 Prévisualiser"}
              </Btn>
              <Btn onClick={() => generate(true)} disabled={loading} style={{ flex: 1, background: "linear-gradient(135deg,#4285f4,#34a853)", border: "none" }}>
                {loading ? "⏳ Génération..." : `✨ Générer et ajouter (${form.count} questions)`}
              </Btn>
            </div>

            {/* Preview */}
            {preview && (
              <div className="fade-in" style={{ marginTop: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <h4 style={{ color: colors.success, fontSize: 15 }}>✅ {preview.length} questions générées — Aperçu</h4>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Btn onClick={() => generate(false)} disabled={loading} variant="ghost" size="sm">🔄 Regénérer</Btn>
                    <Btn onClick={savePreview} disabled={loading} variant="success" size="sm">💾 Sauvegarder tout</Btn>
                  </div>
                </div>
                <div style={{ display: "grid", gap: 12, maxHeight: 440, overflowY: "auto", paddingRight: 4 }}>
                  {preview.map((q, idx) => (
                    <div key={idx} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, padding: 16 }}>
                      <p style={{ fontWeight: 600, marginBottom: 10, fontSize: 14 }}>
                        <span style={{ color: colors.accent, marginRight: 8 }}>Q{idx + 1}.</span>{q.question_text}
                      </p>
                      <div style={{ display: "grid", gap: 6 }}>
                        {q.choices.map((c, ci) => (
                          <div key={ci} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 6, background: c.is_correct ? colors.success + "18" : "transparent", border: `1px solid ${c.is_correct ? colors.success + "44" : colors.border}` }}>
                            <span style={{ color: c.is_correct ? colors.success : colors.muted, fontSize: 12, fontWeight: 700, minWidth: 16 }}>{c.is_correct ? "✓" : "○"}</span>
                            <span style={{ fontSize: 13, color: c.is_correct ? colors.success : colors.text }}>{c.choice_text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── QUESTIONS TAB ──
function QuestionsTab({ exam, exams, token, onSelectExam }) {
  const [questions, setQuestions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ question_text: "", media_type: "none", points: 1, choices: [{ choice_text: "", is_correct: true }, { choice_text: "", is_correct: false }, { choice_text: "", is_correct: false }, { choice_text: "", is_correct: false }] });
  const [mediaFile, setMediaFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    if (!exam) return;
    setLoading(true);
    try { setQuestions(await api.get(`/exams/${exam.id}/questions`, token)); } catch {}
    setLoading(false);
  }
  useEffect(() => { load(); }, [exam]);

  function startCreate() {
    setEditing(null);
    setForm({ question_text: "", media_type: "none", points: 1, choices: [{ choice_text: "", is_correct: true }, { choice_text: "", is_correct: false }, { choice_text: "", is_correct: false }, { choice_text: "", is_correct: false }] });
    setMediaFile(null); setShowForm(true);
  }
  function startEdit(q) {
    setEditing(q);
    setForm({ question_text: q.question_text, media_type: q.media_type, points: q.points, choices: q.choices.map(c => ({ choice_text: c.choice_text, is_correct: c.is_correct })) });
    setMediaFile(null); setShowForm(true);
  }

  function setChoice(i, key, val) {
    setForm(f => {
      const choices = [...f.choices];
      if (key === "is_correct") choices.forEach((c, j) => c.is_correct = j === i);
      else choices[i] = { ...choices[i], [key]: val };
      return { ...f, choices };
    });
  }

  async function save() {
    setSaving(true); setError("");
    try {
      const fd = new FormData();
      fd.append("question_text", form.question_text);
      fd.append("media_type", form.media_type);
      fd.append("points", form.points);
      fd.append("choices", JSON.stringify(form.choices));
      if (mediaFile) fd.append("media", mediaFile);
      if (editing?.media_url && !mediaFile) fd.append("existing_media_url", editing.media_url);

      if (editing) await api.putForm(`/exams/${exam.id}/questions/${editing.id}`, fd, token);
      else await api.postForm(`/exams/${exam.id}/questions`, fd, token);
      setShowForm(false); load();
    } catch (e) { setError(e.message || "Erreur"); }
    setSaving(false);
  }

  async function del(id) {
    if (!confirm("Supprimer cette question ?")) return;
    try { await api.delete(`/exams/${exam.id}/questions/${id}`, token); load(); } catch {}
  }

  if (!exam) return (
    <div className="fade-in">
      <h2 style={{ marginBottom: 20 }}>Questions</h2>
      <Card style={{ textAlign: "center", padding: 48 }}>
        <p style={{ color: colors.muted }}>Sélectionnez un examen dans l'onglet Examens</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 20 }}>
          {exams.map(e => <Btn key={e.id} onClick={() => onSelectExam(e)} variant="outline" size="sm">{e.title}</Btn>)}
        </div>
      </Card>
    </div>
  );

  return (
    <div className="fade-in">
      {showAI && <AIGenerateModal exam={exam} token={token} onClose={() => setShowAI(false)} onGenerated={() => { setShowAI(false); load(); }} />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22 }}>{exam.title}</h2>
          <p style={{ color: colors.muted, fontSize: 13 }}>{questions.length} questions</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn onClick={() => onSelectExam(null)} variant="ghost" size="sm">← Changer d'examen</Btn>
          <Btn onClick={() => setShowAI(true)} variant="outline" size="sm" style={{ borderColor: "#8b5cf6", color: "#8b5cf6" }}>✨ Générer par IA</Btn>
          <Btn onClick={startCreate}>+ Ajouter une question</Btn>
        </div>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16 }}>{editing ? "Modifier la question" : "Nouvelle question"}</h3>
          <Alert msg={error} />
          <Textarea label="Texte de la question *" value={form.question_text} onChange={e => setForm(f => ({ ...f, question_text: e.target.value }))} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 13, color: colors.muted, display: "block", marginBottom: 6 }}>Type de média</label>
              <select value={form.media_type} onChange={e => setForm(f => ({ ...f, media_type: e.target.value }))} style={{ width: "100%", padding: "10px 14px", background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.text }}>
                <option value="none">Aucun</option>
                <option value="image">Image</option>
                <option value="video">Vidéo</option>
                <option value="audio">Audio</option>
              </select>
            </div>
            {form.media_type !== "none" && (
              <div>
                <label style={{ fontSize: 13, color: colors.muted, display: "block", marginBottom: 6 }}>Fichier média</label>
                <input type="file" onChange={e => setMediaFile(e.target.files[0])} accept={form.media_type === "image" ? "image/*" : form.media_type === "video" ? "video/*" : "audio/*"} style={{ color: colors.text, fontSize: 14 }} />
                {editing?.media_url && !mediaFile && <p style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>Fichier existant conservé</p>}
              </div>
            )}
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, color: colors.muted, display: "block", marginBottom: 10 }}>Choix de réponses (cochez la bonne réponse)</label>
            {form.choices.map((c, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <input type="radio" name="correct" checked={c.is_correct} onChange={() => setChoice(i, "is_correct", true)} style={{ accentColor: colors.success }} />
                <input value={c.choice_text} onChange={e => setChoice(i, "choice_text", e.target.value)} placeholder={`Choix ${i + 1}`} style={{ flex: 1, padding: "8px 12px", background: colors.surface, border: `1px solid ${c.is_correct ? colors.success + "66" : colors.border}`, borderRadius: 8, color: colors.text, fontSize: 14 }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={save} disabled={saving}>{saving ? "Enregistrement..." : "Enregistrer"}</Btn>
            <Btn onClick={() => setShowForm(false)} variant="ghost">Annuler</Btn>
          </div>
        </Card>
      )}

      {loading ? <p style={{ color: colors.muted }}>Chargement...</p> : questions.length === 0 ? (
        <Card style={{ textAlign: "center", padding: 48 }}>
          <p style={{ color: colors.muted }}>Aucune question. Ajoutez la première !</p>
        </Card>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {questions.map((q, idx) => (
            <Card key={q.id} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div style={{ background: colors.accent + "22", color: colors.accent, borderRadius: 8, padding: "6px 12px", fontWeight: 700, fontSize: 14, minWidth: 40, textAlign: "center" }}>{idx + 1}</div>
              <div style={{ flex: 1 }}>
                <p style={{ marginBottom: 10, fontSize: 15 }}>{q.question_text}</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {q.choices?.map((c, i) => (
                    <span key={i} style={{ background: c.is_correct ? colors.success + "22" : colors.surface, border: `1px solid ${c.is_correct ? colors.success : colors.border}`, borderRadius: 6, padding: "3px 10px", fontSize: 13, color: c.is_correct ? colors.success : colors.muted }}>
                      {c.is_correct ? "✓ " : ""}{c.choice_text}
                    </span>
                  ))}
                </div>
                {q.media_type !== "none" && <Badge color={colors.warning} style={{ marginTop: 8 }}>📎 {q.media_type}</Badge>}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn onClick={() => startEdit(q)} size="sm" variant="ghost">Modifier</Btn>
                <Btn onClick={() => del(q.id)} size="sm" variant="danger">Suppr.</Btn>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── RESULTS TAB ──
function ResultsTab({ exam, exams, token, onSelectExam }) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!exam) return;
    setLoading(true);
    try { setCandidates(await api.get(`/exams/${exam.id}/candidates`, token)); } catch {}
    setLoading(false);
  }
  useEffect(() => { load(); }, [exam]);

  if (!exam) return (
    <div className="fade-in">
      <h2 style={{ marginBottom: 20 }}>Résultats</h2>
      <Card style={{ textAlign: "center", padding: 48 }}>
        <p style={{ color: colors.muted }}>Sélectionnez un examen</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 20 }}>
          {exams.map(e => <Btn key={e.id} onClick={() => onSelectExam(e)} variant="outline" size="sm">{e.title}</Btn>)}
        </div>
      </Card>
    </div>
  );

  const avg = candidates.length ? Math.round(candidates.filter(c => c.score !== null).reduce((s, c) => s + (c.score || 0), 0) / candidates.filter(c => c.score !== null).length) : 0;
  const completed = candidates.filter(c => c.is_completed).length;

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22 }}>{exam.title}</h2>
          <p style={{ color: colors.muted, fontSize: 13 }}>{candidates.length} candidats</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn onClick={() => onSelectExam(null)} variant="ghost" size="sm">← Changer</Btn>
          <Btn onClick={() => window.open(api.getExportUrl(exam.id), "_blank")} variant="success" size="sm">⬇ Export Excel</Btn>
          <Btn onClick={load} variant="ghost" size="sm">↻ Actualiser</Btn>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Total candidats", value: candidates.length, icon: "👥" },
          { label: "Examens terminés", value: completed, icon: "✅" },
          { label: "Score moyen", value: `${avg}/100`, icon: "📊" },
        ].map(s => (
          <Card key={s.label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28 }}>{s.icon}</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: colors.accent, margin: "8px 0" }}>{s.value}</div>
            <div style={{ fontSize: 13, color: colors.muted }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {loading ? <p style={{ color: colors.muted }}>Chargement...</p> : candidates.length === 0 ? (
        <Card style={{ textAlign: "center", padding: 48 }}><p style={{ color: colors.muted }}>Aucun candidat pour cet examen.</p></Card>
      ) : (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: colors.surface }}>
                {["Nom", "Prénom", "Apogée", "Email", "Score", "Résultat", "Localisation", "Fin"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 13, color: colors.muted, fontWeight: 600, borderBottom: `1px solid ${colors.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {candidates.map((c, i) => (
                <tr key={c.id} style={{ background: i % 2 === 0 ? "transparent" : colors.surface + "88" }}>
                  <td style={{ padding: "12px 16px", fontSize: 14 }}>{c.last_name}</td>
                  <td style={{ padding: "12px 16px", fontSize: 14 }}>{c.first_name}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontFamily: "JetBrains Mono", color: colors.muted }}>{c.apogee_code}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: colors.muted }}>{c.email}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ fontWeight: 700, fontSize: 16, color: c.score >= 50 ? colors.success : colors.danger }}>{c.is_completed ? `${c.score}/100` : "—"}</span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <Badge color={c.is_completed ? colors.success : colors.warning}>{c.is_completed ? "Terminé" : "En cours"}</Badge>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: colors.muted, fontFamily: "JetBrains Mono" }}>
                    {c.latitude ? `${parseFloat(c.latitude).toFixed(4)}, ${parseFloat(c.longitude).toFixed(4)}` : "—"}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: colors.muted }}>{c.completed_at ? new Date(c.completed_at).toLocaleString("fr-FR") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

// ── EXAM TAKING FLOW ──
function ExamTakePage({ examId, onBack }) {
  const [step, setStep] = useState("register"); // register | instructions | exam | result
  const [exam, setExam] = useState(null);
  const [candidateId, setCandidateId] = useState(null);
  const [score, setScore] = useState(null);
  const [error, setError] = useState("");
  const [candidateInfo, setCandidateInfo] = useState(null);

  useEffect(() => {
    api.get(`/candidate/exam/${examId}`).then(setExam).catch(e => setError(e.message || "Examen introuvable"));
  }, [examId]);

  if (error) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Card style={{ textAlign: "center", maxWidth: 400 }}>
        <p style={{ fontSize: 48 }}>⚠️</p>
        <h2 style={{ margin: "12px 0" }}>Examen introuvable</h2>
        <p style={{ color: colors.muted, marginBottom: 20 }}>{error}</p>
        <Btn onClick={onBack} variant="ghost">← Retour</Btn>
      </Card>
    </div>
  );
  if (!exam) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: colors.muted }}>Chargement...</div>;

  return (
    <div style={{ minHeight: "100vh", background: colors.bg }}>
      {step === "register" && <CandidateRegister exam={exam} onNext={(cid, info) => { setCandidateId(cid); setCandidateInfo(info); setStep("instructions"); }} onBack={onBack} />}
      {step === "instructions" && <ExamInstructions exam={exam} onStart={() => setStep("exam")} />}
      {step === "exam" && <ExamRunner exam={exam} candidateId={candidateId} onFinish={s => { setScore(s); setStep("result"); }} />}
      {step === "result" && <ExamResult score={score} candidateInfo={candidateInfo} onBack={onBack} />}
    </div>
  );
}

// ── CANDIDATE REGISTER ──
function CandidateRegister({ exam, onNext, onBack }) {
  const [form, setForm] = useState({ email: "", first_name: "", last_name: "", apogee_code: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function submit() {
    if (!form.email || !form.first_name || !form.last_name || !form.apogee_code)
      return setError("Tous les champs sont requis");
    setLoading(true); setError("");

    let latitude = null, longitude = null;
    if (exam.require_location) {
      try {
        const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 10000 }));
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      } catch {
        setLoading(false);
        return setError("La géolocalisation est requise pour cet examen. Veuillez l'activer dans votre navigateur.");
      }
    }

    try {
      const data = await api.post("/candidate/register", { exam_id: exam.id, ...form, latitude, longitude });
      if (data.already_completed) return setError("Vous avez déjà passé cet examen. Il est impossible de le repasser.");
      onNext(data.candidate_id, form);
    } catch (e) {
      setError(e.message || "Erreur lors de l'inscription");
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 480 }} className="fade-in">
        <button onClick={onBack} style={{ background: "none", border: "none", color: colors.muted, marginBottom: 20, cursor: "pointer", fontSize: 14 }}>← Retour</button>
        <Card>
          <h2 style={{ marginBottom: 4, fontSize: 22 }}>{exam.title}</h2>
          <p style={{ color: colors.muted, marginBottom: 24, fontSize: 14 }}>Identifiez-vous pour accéder à l'examen</p>
          <Alert msg={error} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="Prénom" value={form.first_name} onChange={set("first_name")} />
            <Input label="Nom" value={form.last_name} onChange={set("last_name")} />
          </div>
          <Input label="Email" type="email" value={form.email} onChange={set("email")} />
          <Input label="Code Apogée" value={form.apogee_code} onChange={set("apogee_code")} placeholder="Ex: 12345678" />
          {exam.require_location && (
            <div style={{ background: colors.warning + "18", border: `1px solid ${colors.warning}44`, borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: colors.warning }}>
              📍 Cet examen requiert votre géolocalisation. Autorisez l'accès lorsque le navigateur le demande.
            </div>
          )}
          <Btn onClick={submit} disabled={loading} style={{ width: "100%" }} size="lg">{loading ? "Vérification..." : "Accéder à l'examen"}</Btn>
        </Card>
      </div>
    </div>
  );
}

// ── INSTRUCTIONS ──
function ExamInstructions({ exam, onStart }) {
  const defaultInstructions = [
    `Durée par question : ${exam.duration_per_question} secondes. La jauge de temps est visible en haut de chaque question.`,
    "Une seule réponse correcte par question. Sélectionnez votre réponse puis cliquez sur SUIVANT.",
    "Si vous quittez la page, réduisez la fenêtre ou changez d'onglet, la réponse en cours sera automatiquement comptée comme fausse.",
    "Il est impossible de revenir à une question précédente.",
    "L'examen ne peut être passé qu'une seule fois. Il sera définitivement soumis à la fin.",
  ];
  const customInstructions = exam.instructions ? exam.instructions.split("\n").filter(l => l.trim()) : [];
  const allInstructions = [...defaultInstructions, ...customInstructions];

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 600 }} className="fade-in">
        <Card>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 44 }}>📋</div>
            <h2 style={{ fontSize: 24, margin: "10px 0 4px" }}>Consignes de l'examen</h2>
            <p style={{ color: colors.muted }}>{exam.title}</p>
          </div>
          <div style={{ marginBottom: 28 }}>
            {allInstructions.map((ins, i) => (
              <div key={i} style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "flex-start" }}>
                <div style={{ background: colors.accent + "22", color: colors.accent, borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                <p style={{ fontSize: 15, lineHeight: 1.6 }}>{ins}</p>
              </div>
            ))}
          </div>
          <div style={{ background: colors.danger + "18", border: `1px solid ${colors.danger}44`, borderRadius: 8, padding: "12px 16px", marginBottom: 24, fontSize: 14, color: colors.danger }}>
            ⚠️ En cliquant sur START, vous acceptez les conditions. L'examen commence immédiatement.
          </div>
          <Btn onClick={onStart} style={{ width: "100%", fontSize: 18, padding: "16px" }} size="lg">🚀 START</Btn>
        </Card>
      </div>
    </div>
  );
}

// ── EXAM RUNNER ──
function ExamRunner({ exam, candidateId, onFinish }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [timeLeft, setTimeLeft] = useState(exam.duration_per_question);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef(null);
  const question = exam.questions[currentIndex];
  const total = exam.questions.length;

  // Focus/visibility loss handler
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden) autoSubmitWrong();
    }
    function handleBlur() { autoSubmitWrong(); }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [currentIndex]);

  useEffect(() => {
    setTimeLeft(exam.duration_per_question);
    setSelectedChoice(null);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); autoSubmitWrong(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [currentIndex]);

  async function autoSubmitWrong() {
    clearInterval(timerRef.current);
    await submitAnswer(null);
  }

  async function submitAnswer(choiceId) {
    if (submitting) return;
    setSubmitting(true);
    try {
      await api.post("/candidate/answer", { candidate_id: candidateId, question_id: question.id, choice_id: choiceId });
    } catch {}
    if (currentIndex + 1 >= total) {
      const result = await api.post("/candidate/finish", { candidate_id: candidateId });
      onFinish(result.score);
    } else {
      setCurrentIndex(i => i + 1);
      setSubmitting(false);
    }
  }

  async function handleNext() {
    if (!selectedChoice) return;
    clearInterval(timerRef.current);
    await submitAnswer(selectedChoice);
  }

  const progress = ((currentIndex) / total) * 100;
  const timerProgress = (timeLeft / exam.duration_per_question) * 100;
  const timerColor = timerProgress > 50 ? colors.success : timerProgress > 20 ? colors.warning : colors.danger;

  return (
    <div style={{ minHeight: "100vh", padding: 24, maxWidth: 720, margin: "0 auto" }} className="fade-in">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <span style={{ fontSize: 14, color: colors.muted }}>Question {currentIndex + 1} / {total}</span>
        <span style={{ fontSize: 14, color: timerColor, fontWeight: 700, fontFamily: "JetBrains Mono" }}>⏱ {timeLeft}s</span>
      </div>

      {/* Progress bar (exam) */}
      <div style={{ height: 4, background: colors.border, borderRadius: 2, marginBottom: 8 }}>
        <div style={{ height: "100%", width: `${progress}%`, background: colors.accent, borderRadius: 2, transition: "width .3s" }} />
      </div>

      {/* Timer gauge */}
      <div style={{ height: 6, background: colors.border, borderRadius: 3, marginBottom: 28 }}>
        <div style={{ height: "100%", width: `${timerProgress}%`, background: timerColor, borderRadius: 3, transition: "width 1s linear" }} />
      </div>

      {/* Question card */}
      <Card>
        <p style={{ fontSize: 18, lineHeight: 1.7, marginBottom: 24, fontWeight: 500 }}>{question.question_text}</p>

        {/* Media */}
        {question.media_type === "image" && question.media_url && (
<img src={question.media_url} alt="Question media" style={{ maxWidth: "100%", borderRadius: 8, marginBottom: 20 }} />
        )}
        {question.media_type === "video" && question.media_url && (
          <video controls style={{ maxWidth: "100%", borderRadius: 8, marginBottom: 20 }}>
          <source src={question.media_url} />
          </video>
        )}
        {question.media_type === "audio" && question.media_url && (
          <audio controls style={{ width: "100%", marginBottom: 20 }}>
          <source src={question.media_url} />
          </audio>
        )}

        {/* Choices */}
        <div style={{ display: "grid", gap: 10, marginBottom: 24 }}>
          {question.choices.map(choice => (
            <div key={choice.id} onClick={() => setSelectedChoice(choice.id)} style={{
              padding: "14px 18px", borderRadius: 10, cursor: "pointer", fontSize: 15, transition: "all .2s",
              border: `2px solid ${selectedChoice === choice.id ? colors.accent : colors.border}`,
              background: selectedChoice === choice.id ? colors.accent + "18" : colors.surface,
              color: selectedChoice === choice.id ? colors.text : colors.text,
            }}>
              <span style={{ color: selectedChoice === choice.id ? colors.accent : colors.muted, marginRight: 12, fontWeight: 700 }}>
                {selectedChoice === choice.id ? "●" : "○"}
              </span>
              {choice.choice_text}
            </div>
          ))}
        </div>

        <Btn onClick={handleNext} disabled={!selectedChoice || submitting} style={{ width: "100%" }} size="lg">
          {submitting ? "Enregistrement..." : currentIndex + 1 >= total ? "✓ Terminer l'examen" : "SUIVANT →"}
        </Btn>
      </Card>
    </div>
  );
}

// ── EXAM RESULT ──
function ExamResult({ score, candidateInfo, onBack }) {
  const passed = score >= 50;
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ textAlign: "center", maxWidth: 480 }} className="fade-in">
        <div style={{ fontSize: 72, marginBottom: 20 }}>{passed ? "🎉" : "📚"}</div>
        <h1 style={{ fontSize: 42, fontWeight: 700, color: passed ? colors.success : colors.danger, marginBottom: 8 }}>{score} / 100</h1>
        <h2 style={{ fontSize: 22, marginBottom: 8 }}>{passed ? "Félicitations !" : "Continuez vos efforts !"}</h2>
        <p style={{ color: colors.muted, marginBottom: 8 }}>
          {candidateInfo?.first_name} {candidateInfo?.last_name}
        </p>
        <p style={{ color: colors.muted, marginBottom: 32, fontSize: 14 }}>
          {passed ? "Vous avez réussi cet examen." : "Votre score est inférieur à la moyenne."}
        </p>
        <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 20, marginBottom: 28 }}>
          <p style={{ color: colors.muted, fontSize: 14 }}>Vos résultats ont été enregistrés et transmis à votre professeur. L'examen ne peut pas être repassé.</p>
        </div>
        <Btn onClick={onBack} variant="ghost">← Retour à l'accueil</Btn>
      </div>
    </div>
  );
}
