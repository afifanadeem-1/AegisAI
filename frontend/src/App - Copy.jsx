import { useEffect, useState } from "react";
import {
  BrainCircuit, LayoutDashboard, Search, MessageSquare, History,
  BookOpen, Menu, X, Sparkles, Sun, Moon, Folders,
  Bookmark, ArrowRight, Clock3, LibraryBig, ShieldCheck,
} from "lucide-react";
import "./App.css";
import "./components/AIChat.css";
import FeatureCard from "./components/FeatureCard";
import ResearchExplorer from "./components/ResearchExplorer";
import SavedPapers from "./components/SavedPapers";
import ResearchCollections from "./components/ResearchCollections";
import AIChat from "./components/AIChat";
import { ResearchNotesProvider } from "./context/ResearchNotesContext";

const navigation = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "research", label: "Research Explorer", icon: Search },
  { id: "chat", label: "AI Chat", icon: MessageSquare },
  { id: "history", label: "History", icon: History },
  { id: "saved", label: "Saved Papers", icon: Bookmark },
  { id: "collections", label: "Collections", icon: Folders },
];
const validPages = navigation.map((item) => item.id);

function loadHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem("aegis-search-history") || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function App() {
  const [page, setPage] = useState(() => {
    const saved = localStorage.getItem("aegis-current-page");
    return validPages.includes(saved) ? saved : "overview";
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [incomingPaper, setIncomingPaper] = useState(null);
  const [history, setHistory] = useState(loadHistory);
  const [theme, setTheme] = useState(() =>
    localStorage.getItem("aegis-theme") === "light" ? "light" : "dark"
  );

  useEffect(() => {
    localStorage.setItem("aegis-search-history", JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("aegis-theme", theme);
  }, [theme]);

  useEffect(() => {
    function openPaperChat(event) {
      const paper = event.detail;
      if (!paper || typeof paper.title !== "string") return;
      setIncomingPaper({ ...paper, transferId: crypto.randomUUID() });
      setPage("chat");
      localStorage.setItem("aegis-current-page", "chat");
      setSidebarOpen(false);
    }
    window.addEventListener("aegis:ask-paper", openPaperChat);
    return () => window.removeEventListener("aegis:ask-paper", openPaperChat);
  }, []);

  function navigate(destination) {
    if (!validPages.includes(destination)) return;
    setPage(destination);
    localStorage.setItem("aegis-current-page", destination);
    setSidebarOpen(false);
  }

  function handleSearchComplete(search) {
    setHistory((previous) => [
      {
        id: crypto.randomUUID(),
        topic: search.topic,
        count: search.count,
      },
      ...previous,
    ]);
  }

  return (
    <ResearchNotesProvider>
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="brand">
          <button
            type="button"
            className="brand-home"
            onClick={()=> navigate("overview")}
            aria-label="Go to AegisAI home"
            title="Back to Overview"
          >
          <BrainCircuit size={27}/>
          <span>AegisAI</span>
          </button>
          <button type="button" className="mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><X size={20} /></button>
        </div>

        <div className="workspace-tag"><span className="workspace-tag-dot" /> YOUR RESEARCH SPACE</div>
        <p className="nav-heading">WORKSPACE</p>
        <nav className="navigation" aria-label="Main navigation">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                type="button"
                key={item.id}
                className={`nav-item ${page === item.id ? "active" : ""}`}
                onClick={() => navigate(item.id)}
                aria-current={page === item.id ? "page" : undefined}
              >
                <Icon size={19} />
                <span>{item.label}</span>
                {page === item.id && <span className="nav-active-dot" aria-hidden="true" />}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom-card">
          <div className="sidebar-bottom-icon"><Sparkles size={18} /></div>
          <strong>Ideas start here</strong>
          <p>Discover papers, organize findings, and build better research.</p>
        </div>
        <div className="sidebar-footer"><ShieldCheck size={16} /><span>AegisAI · Development</span></div>
      </aside>

      <div className="content-area">
        <header className="topbar">
          <div className="topbar-title">
            <button type="button" className="menu-button" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu size={22} /></button>
            <span className="topbar-kicker">WORKSPACE</span>
            <strong>Research Workspace</strong>
          </div>
          <div className="topbar-actions">
            <button
              type="button"
              className="theme-toggle"
              onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title="Toggle theme"
            >
              {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <span className="status"><span className="status-dot" /> Local Development</span>
          </div>
        </header>

        <main className="page-content">
          {page === "saved" && <SavedPapers />}
          {page === "collections" && <ResearchCollections />}

          {page === "overview" && (
            <section className="overview-page">
              <div className="overview-hero">
                <div className="hero-glow hero-glow-one" aria-hidden="true" />
                <div className="hero-glow hero-glow-two" aria-hidden="true" />
                <div className="hero-content">
                  <span className="hero-eyebrow"><Sparkles size={15} /> YOUR RESEARCH, REIMAGINED</span>
                  <h1>Curiosity meets <span>discovery.</span></h1>
                  <p>Welcome to AegisAI. Discover academic papers, keep your ideas organized, and explore what's next.</p>
                  <button type="button" className="hero-cta" onClick={() => navigate("research")}>Explore research <ArrowRight size={18} /></button>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <div className="hero-orbit hero-orbit-outer" />
                  <div className="hero-orbit hero-orbit-inner" />
                  <div className="hero-art-core"><BrainCircuit size={56} strokeWidth={1.5} /></div>
                  <span className="orbit-spark orbit-spark-one" /><span className="orbit-spark orbit-spark-two" />
                </div>
              </div>

              <div className="overview-section-title">
                <div><span className="section-eyebrow">EXPLORE YOUR WORKSPACE</span><h2>Everything you need to get started</h2></div>
              </div>
              <div className="feature-grid overview-feature-grid">
                <div className="feature-accent feature-accent-cyan">
                  <FeatureCard icon={BookOpen} title="Research Explorer" description="Discover academic papers from OpenAlex and find your next big idea." onClick={() => navigate("research")} accent="#22d3ee" />
                </div>
                <div className="feature-accent feature-accent-violet">
                  <FeatureCard icon={MessageSquare} title="AI Assistant" description="Explore complex ideas through natural-language conversations." onClick={() => navigate("chat")} accent="#a78bfa" />
                </div>
              </div>

              <div className="overview-activity-header">
                <div><span className="section-eyebrow">PICK UP WHERE YOU LEFT OFF</span><h2>Recent research</h2></div>
                <button type="button" className="text-action" onClick={() => navigate("history")}>View history <ArrowRight size={16} /></button>
              </div>
              <div className="panel recent-panel">
                {history.length === 0 ? (
                  <div className="recent-empty"><Clock3 size={28} /><strong>Your discoveries will show up here</strong><p>Search for a topic to start building your research history.</p><button type="button" onClick={() => navigate("research")}>Start exploring <ArrowRight size={16} /></button></div>
                ) : history.slice(0, 5).map((item) => (
                  <div className="history-item recent-history-item" key={item.id}>
                    <span className="history-topic"><span className="history-topic-icon"><Search size={16} /></span>{item.topic}</span>
                    <span className="history-count"><LibraryBig size={15} /> {item.count} papers</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {page === "research" && <ResearchExplorer onSearchComplete={handleSearchComplete} />}

          {page === "chat" && <AIChat incomingPaper={incomingPaper} onPaperReceived={() => setIncomingPaper(null)} />}

          {page === "history" && (
            <section>
              <div className="page-heading"><h1>Research History</h1><p>Revisit the topics you've explored in AegisAI.</p></div>
              <div className="panel history-panel">
                {history.length === 0 ? <p className="muted">No searches yet.</p> : history.map((item) => (
                  <div className="history-item recent-history-item" key={item.id}>
                    <span className="history-topic"><span className="history-topic-icon"><Search size={16} /></span>{item.topic}</span>
                    <span className="history-count"><LibraryBig size={15} /> {item.count} papers</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>

      {sidebarOpen && <button type="button" className="sidebar-overlay" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" />}
    </div>
    </ResearchNotesProvider>
  );
}

export default App;
