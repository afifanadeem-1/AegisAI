import { useEffect, useRef, useState } from "react";
import {
  BrainCircuit, Send, Trash2, MessageSquareText, Server,
  Sparkles, AlertCircle, Plus, Pencil, Check, X, MessagesSquare, Download, FileText,
} from "lucide-react";
import "./AIChat.css";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const STORAGE_KEY = "aegis-chat-conversations";
const ACTIVE_KEY = "aegis-chat-active-id";
const EMPTY_CHAT_TIMEOUT_MS = 20_000;
const OLD_MESSAGES_KEY = "aegis-chat-messages";
const OLD_DRAFT_KEY = "aegis-chat-draft";
const prompts = [
  "Explain agentic AI in simple terms",
  "Help me understand a research paper",
  "What is retrieval-augmented generation?",
  "Compare machine learning and deep learning",
];

function makeConversation(title = "New conversation", messages = [], draft = "") {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), title, messages, draft, createdAt: now, updatedAt: now, lastActiveAt: now };
}

function loadConversations() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.filter((chat) => chat && typeof chat.id === "string" && Array.isArray(chat.messages))
          .map((chat) => ({ ...chat, title: typeof chat.title === "string" ? chat.title : "New conversation", draft: typeof chat.draft === "string" ? chat.draft : "" }));
      }
    }
  } catch (error) {
    console.error("Could not read conversations:", error);
    return [];
  }

  // One-time migration: keep the messages and draft from Lesson 24.
  try {
    const oldMessages = JSON.parse(localStorage.getItem(OLD_MESSAGES_KEY) || "[]");
    const messages = Array.isArray(oldMessages)
      ? oldMessages.filter((item) => item && item.role === "user" && typeof item.content === "string")
      : [];
    const draft = localStorage.getItem(OLD_DRAFT_KEY) || "";
    if (messages.length || draft) {
      const title = messages.length ? messages[0].content.trim().slice(0, 45) || "Previous chat" : "Previous chat";
      return [makeConversation(title, messages, draft)];
    }
  } catch (error) {
    console.error("Could not migrate old chat:", error);
  }
  return [];
}

// Browser-only exports: no FastAPI or Ollama request is needed.
function safeFilename(title) {
  const name = title.replace(/[<>:"/\\|?*\x00-\x1f]/g, "-").trim().replace(/[. ]+$/g, "");
  return (name || "aegis-conversation").slice(0, 65);
}

function messageLabel(message) {
  return message.role === "assistant" ? "AegisAI" : "You";
}

function formatDate(value) {
  if (!value) return "Unknown date";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown date" : date.toLocaleString();
}

function exportText(chat) {
  const header = [
    `AegisAI Conversation: ${chat.title}`,
    `Exported: ${formatDate(new Date().toISOString())}`,
    "",
    "=".repeat(48),
  ];
  const entries = chat.messages.flatMap((message) => [
    "",
    `${messageLabel(message)} — ${formatDate(message.createdAt)}${message.model === "mock-development" ? " (mock response)" : ""}`,
    "-".repeat(32),
    message.content,
  ]);
  return [...header, ...entries, ""].join("\n");
}

function exportMarkdown(chat) {
  const lines = [
    `# ${chat.title.replace(/^#+\s*/, "")}`,
    "",
    `*Exported from AegisAI on ${formatDate(new Date().toISOString())}*`,
    "",
    "---",
  ];
  chat.messages.forEach((message) => {
    lines.push(
      "",
      `## ${messageLabel(message)}`,
      "",
      `*${formatDate(message.createdAt)}${message.model === "mock-development" ? " · Mock response" : ""}*`,
      "",
      message.content,
    );
  });
  return [...lines, ""].join("\n");
}

function downloadConversation(chat, format) {
  if (!chat || chat.messages.length === 0) return;
  const isMarkdown = format === "md";
  const content = isMarkdown ? exportMarkdown(chat) : exportText(chat);
  const blob = new Blob(["\uFEFF", content], {
    type: isMarkdown ? "text/markdown;charset=utf-8" : "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `AegisAI-${safeFilename(chat.title)}.${format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser time to begin downloading before releasing the URL.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function AIChat({ incomingPaper, onPaperReceived }) {
  const [conversations, setConversations] = useState(() => {
    const now = Date.now();
    return loadConversations().filter((chat) =>
      chat.messages.length > 0 || chat.draft.trim() ||
      chat.id === localStorage.getItem(ACTIVE_KEY) ||
      (now - new Date(chat.lastActiveAt || chat.createdAt || 0).getTime() < EMPTY_CHAT_TIMEOUT_MS)
    );
  });
  const [activeId, setActiveId] = useState(() => localStorage.getItem(ACTIVE_KEY));
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [clearId, setClearId] = useState(null);
  const [pendingIds, setPendingIds] = useState([]);
  const [errors, setErrors] = useState({});
  const requestsRef = useRef(new Map());
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const lastTransferRef = useRef(null);

  const activeChat = conversations.find((chat) => chat.id === activeId) || conversations[0];
  const currentId = activeChat?.id;
  const messages = activeChat?.messages || [];
  const draft = activeChat?.draft || "";
  const isPending = pendingIds.includes(currentId);
  const currentError = errors[currentId];

  useEffect(() => {
    if (!incomingPaper || lastTransferRef.current === incomingPaper.transferId) return;
    lastTransferRef.current = incomingPaper.transferId;
    const { transferId, ...paper } = incomingPaper;
    const multi = Array.isArray(paper.papers) && paper.papers.length >= 2;
    const chat = makeConversation(
      multi ? `Compare ${paper.papers.length} papers` : `Paper: ${paper.title}`.slice(0, 80), [],
      multi
        ? "Compare the methodologies, key findings, and research gaps across these papers. Attribute each claim to the relevant paper."
        : "What are the main contributions and limitations of this paper?"
    );
    if (multi) chat.paperContexts = paper.papers;
    else chat.paperContext = paper;
    setConversations((previous) => [chat, ...previous]);
    setActiveId(chat.id);
    onPaperReceived?.();
  }, [incomingPaper, onPaperReceived]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations)); }
    catch (error) { console.error("Could not save conversations:", error); }
  }, [conversations]);

  useEffect(() => {
    try {
      if (currentId) localStorage.setItem(ACTIVE_KEY, currentId);
      else localStorage.removeItem(ACTIVE_KEY);
    } catch (error) { console.error("Could not save active conversation:", error); }
  }, [currentId]);

  // Only inactive (not selected), unused chats expire. An open chat stays visible.
  // Drafts and conversations containing messages are always protected.
  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = Date.now();
      setConversations((previous) => {
        const remaining = previous.filter((chat) => {
          if (chat.id === currentId || chat.messages.length > 0 || chat.draft.trim()) return true;
          const lastActive = new Date(chat.lastActiveAt || chat.createdAt || 0).getTime();
          return Number.isFinite(lastActive) && now - lastActive < EMPTY_CHAT_TIMEOUT_MS;
        });
        return remaining.length === previous.length ? previous : remaining;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [currentId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [currentId, messages.length]);

  function updateDraft(value) {
    if (!currentId) {
      const chat = makeConversation("New conversation", [], value);
      setConversations((previous) => [chat, ...previous]);
      setActiveId(chat.id);
      return;
    }
    setConversations((previous) => previous.map((chat) =>
      chat.id === currentId ? { ...chat, draft: value, lastActiveAt: new Date().toISOString() } : chat
    ));
  }

  function selectChat(id) {
    const now = new Date().toISOString();
    setConversations((previous) => previous.map((chat) =>
      chat.id === id ? { ...chat, lastActiveAt: now } : chat
    ));
    setActiveId(id);
  }

  function createChat() {
    // Reuse an existing empty chat rather than making unlimited empty chats.
    const empty = conversations.find((chat) => chat.messages.length === 0 && !chat.draft.trim() && !chat.paperContext && !chat.paperContexts);
    if (empty) {
      selectChat(empty.id);
    } else {
      const chat = makeConversation();
      setConversations((previous) => [chat, ...previous]);
      setActiveId(chat.id);
    }
    setRenamingId(null);
    inputRef.current?.focus();
  }

  async function sendMessage(event) {
    event.preventDefault();
    const content = draft.trim();
    const chatId = currentId;
    if (!content || !chatId || requestsRef.current.has(chatId)) return;

    const now = new Date().toISOString();
    const userMessage = { id: crypto.randomUUID(), role: "user", content, createdAt: now };
    const outgoingMessages = [...messages, userMessage];
    const controller = new AbortController();
    requestsRef.current.set(chatId, controller);
    setPendingIds((previous) => [...previous, chatId]);
    setErrors((previous) => ({ ...previous, [chatId]: null }));

    setConversations((previous) => previous.map((chat) => {
      if (chat.id !== chatId) return chat;
      return {
        ...chat,
        title: chat.messages.length === 0 && chat.title === "New conversation"
          ? content.slice(0, 45) : chat.title,
        messages: [...chat.messages, userMessage],
        draft: "",
        updatedAt: now,
      };
    }));

    try {
      // FastAPI accepts at most 30 messages. Send the most recent context.
      const response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: outgoingMessages.slice(-30).map(({ role, content }) => ({ role, content })),
          ...(activeChat?.paperContexts ? { paper_contexts: activeChat.paperContexts } :
              activeChat?.paperContext ? { paper_context: activeChat.paperContext } : {}),
        }),
        signal: controller.signal,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof data.detail === "string" ? data.detail : `Server error (${response.status})`);
      }
      if (typeof data.reply !== "string" || !data.reply.trim()) {
        throw new Error("The server returned an empty or invalid reply.");
      }
      if (controller.signal.aborted) return;

      const assistantMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.reply,
        model: data.model || "unknown",
        basis: data.basis || null,
        sources: Array.isArray(data.sources) ? data.sources : [],
        createdAt: new Date().toISOString(),
      };
      setConversations((previous) => previous.map((chat) =>
        chat.id === chatId
          ? { ...chat, messages: [...chat.messages, assistantMessage], updatedAt: assistantMessage.createdAt }
          : chat
      ));
    } catch (error) {
      if (error.name !== "AbortError" && !controller.signal.aborted) {
        setErrors((previous) => ({ ...previous, [chatId]: error.message || "Unable to contact FastAPI." }));
      }
    } finally {
      if (requestsRef.current.get(chatId) === controller) {
        requestsRef.current.delete(chatId);
        setPendingIds((previous) => previous.filter((id) => id !== chatId));
      }
    }
    inputRef.current?.focus();
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (draft.trim()) event.currentTarget.form?.requestSubmit();
    }
  }

  function startRename(chat) {
    setRenamingId(chat.id);
    setRenameValue(chat.title);
  }

  function saveRename(event) {
    event.preventDefault();
    const title = renameValue.trim();
    if (!title || !renamingId) return;
    setConversations((previous) => previous.map((chat) =>
      chat.id === renamingId ? { ...chat, title: title.slice(0, 80), updatedAt: new Date().toISOString() } : chat
    ));
    setRenamingId(null);
  }

  function deleteConversation() {
    if (!deleteId) return;
    requestsRef.current.get(deleteId)?.abort();
    requestsRef.current.delete(deleteId);
    setPendingIds((previous) => previous.filter((id) => id !== deleteId));
    setErrors((previous) => ({ ...previous, [deleteId]: null }));
    const remaining = conversations.filter((chat) => chat.id !== deleteId);
    setConversations(remaining);
    if (currentId === deleteId) setActiveId(remaining[0]?.id || null);
    setDeleteId(null);
    setRenamingId(null);
  }

  function clearChat() {
    if (!clearId) return;
    requestsRef.current.get(clearId)?.abort();
    requestsRef.current.delete(clearId);
    setPendingIds((previous) => previous.filter((id) => id !== clearId));
    setErrors((previous) => ({ ...previous, [clearId]: null }));
    setConversations((previous) => previous.map((chat) =>
      chat.id === clearId ? { ...chat, messages: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : chat
    ));
    setClearId(null);
  }

  return (
    <section className="aegis-chat-page">
      <div className="page-heading aegis-chat-heading">
        <div><h1>AI Assistant</h1><p>Organize your research questions into separate conversations.</p></div>
        {messages.length > 0 && (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <button type="button" className="aegis-chat-clear" onClick={() => downloadConversation(activeChat, "txt")} title="Download this conversation as plain text">
              <Download size={17} /> Export TXT
            </button>
            <button type="button" className="aegis-chat-clear" onClick={() => downloadConversation(activeChat, "md")} title="Download this conversation as Markdown">
              <FileText size={17} /> Export MD
            </button>
            <button type="button" className="aegis-chat-clear" onClick={() => setClearId(currentId)}>
              <Trash2 size={17} /> Clear messages
            </button>
          </div>
        )}
      </div>

      <div className="aegis-chat-workspace">
        <aside className="aegis-chat-list" aria-label="Chat conversations">
          <button type="button" className="aegis-chat-new" onClick={createChat}><Plus size={18} /> New Chat</button>
          <div className="aegis-chat-list-label">YOUR CONVERSATIONS</div>
          <div className="aegis-chat-list-scroll">
            {conversations.length === 0 && <p className="aegis-chat-list-note">No conversations yet. Start a new chat or choose a suggested prompt.</p>}
            {conversations.map((chat) => (
              <div key={chat.id} className={`aegis-chat-list-item ${chat.id === currentId ? "active" : ""}`}>
                {renamingId === chat.id ? (
                  <form className="aegis-chat-rename-form" onSubmit={saveRename}>
                    <input autoFocus value={renameValue} maxLength={80} aria-label="Conversation title" onChange={(event) => setRenameValue(event.target.value)} />
                    <button type="submit" disabled={!renameValue.trim()} aria-label="Save title"><Check size={15} /></button>
                    <button type="button" onClick={() => setRenamingId(null)} aria-label="Cancel rename"><X size={15} /></button>
                  </form>
                ) : (
                  <>
                    <button type="button" className="aegis-chat-select" onClick={() => selectChat(chat.id)} title={chat.title} aria-current={chat.id === currentId ? "true" : undefined}>
                      <MessageSquareText size={16} /><span>{chat.title}</span>
                    </button>
                    <div className="aegis-chat-item-actions">
                      <button type="button" onClick={() => startRename(chat)} aria-label={`Rename ${chat.title}`} title="Rename"><Pencil size={14} /></button>
                      <button type="button" onClick={() => setDeleteId(chat.id)} aria-label={`Delete ${chat.title}`} title="Delete"><Trash2 size={14} /></button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          <p className="aegis-chat-list-note"><MessagesSquare size={15} /> Chats are saved in this browser.</p>
        </aside>

        <div className="aegis-chat-shell">
          <div className="aegis-chat-status" role="status">
            <span className="aegis-chat-status-icon"><Server size={17} /></span>
            <span><strong>FastAPI chat connected · Local Qwen</strong><small>Responses are generated by your Ollama model. Verify research claims against their sources.</small></span>
          </div>

          {activeChat?.paperContexts && (
            <div className="aegis-chat-status" role="status">
              <span><strong><FileText size={16} style={{ verticalAlign: "middle", marginRight: 6 }} /> Comparing {activeChat.paperContexts.length} papers</strong>
                <small>{activeChat.paperContexts.map((paper, i) => `[${i + 1}] ${paper.title}`).join(" · ")}</small>
              </span>
            </div>
          )}
          {activeChat?.paperContext && (
            <div className="aegis-paper-context-banner" role="note" style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-color, #64748b55)" }}>
              <strong><FileText size={16} style={{ verticalAlign: "middle", marginRight: 6 }} /> Discussing: {activeChat.paperContext.title}</strong>
              <p style={{ margin: "5px 0 0", fontSize: 13, opacity: 0.8 }}>Answers are grounded in the available abstract, not the full paper. Start a New Chat for general questions.</p>
            </div>
          )}
          <div className="aegis-chat-messages" aria-label="Chat conversation" aria-live="polite">
            {messages.length === 0 ? (
              <div className="aegis-chat-welcome">
                <span className="aegis-chat-avatar aegis-chat-welcome-icon"><BrainCircuit size={32} /></span>
                <span className="aegis-chat-eyebrow"><Sparkles size={15} /> YOUR RESEARCH COMPANION</span>
                <h2>What are you curious about?</h2>
                <p>Start with a research question or try one of these prompts. AegisAI responds using your local Qwen model.</p>
                <div className="aegis-chat-prompts">
                  {prompts.map((prompt) => (
                    <button key={prompt} type="button" onClick={() => { updateDraft(prompt); inputRef.current?.focus(); }}>
                      <MessageSquareText size={17} /> {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="aegis-chat-thread">
                {messages.map((message) => (
                  <div className={`aegis-chat-message ${message.role === "assistant" ? "aegis-chat-assistant" : "aegis-chat-user"}`} key={message.id}>
                    <div className="aegis-chat-bubble">{message.content}</div>
                    {message.role === "assistant" && message.basis === "abstract" && (
                      <div className="aegis-chat-citations" aria-label="Research sources" style={{ marginTop: 8, fontSize: 13 }}>
                        <strong>Source: selected paper abstract</strong>
                        {Array.isArray(message.sources) && message.sources.length > 0 ? (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 5 }}>
                            {message.sources.filter((source) => {
                              try {
                                const url = new URL(source.url);
                                return url.protocol === "https:" && ["doi.org", "openalex.org", "www.openalex.org"].includes(url.hostname);
                              } catch { return false; }
                            }).map((source, index) => (
                              <a key={`${source.url}-${index}`} href={source.url} target="_blank" rel="noopener noreferrer">{source.label || "Paper record"} ↗</a>
                            ))}
                          </div>
                        ) : <p style={{ margin: "4px 0 0" }}>No verified DOI or OpenAlex link available in this paper's metadata.</p>}
                        <small style={{ display: "block", opacity: 0.7, marginTop: 5 }}>Links identify the selected paper; they do not independently verify every AI claim.</small>
                      </div>
                    )}
                    <span className="aegis-chat-message-meta">{message.role === "assistant" ? `AegisAI · ${message.model === "mock-development" ? "Mock response" : (message.model || "Assistant")}` : "You · Saved locally"}</span>
                  </div>
                ))}
                {isPending && <div className="aegis-chat-pending" role="status"><Sparkles size={17} /> AegisAI is responding...</div>}
                {currentError && <div className="aegis-chat-pending" role="alert"><AlertCircle size={17} /> {currentError} Your message is still saved.</div>}
                <div ref={endRef} />
              </div>
            )}
          </div>

          <form className="aegis-chat-compose" onSubmit={sendMessage}>
            <div className="aegis-chat-input-row">
              <textarea ref={inputRef} value={draft} onChange={(event) => updateDraft(event.target.value)} onKeyDown={handleKeyDown} placeholder="Ask AegisAI a research question..." aria-label="Message to AegisAI" rows={2} maxLength={5000} />
              <button type="submit" disabled={!draft.trim() || isPending} aria-label="Send message" title="Send to AegisAI backend"><Send size={20} /></button>
            </div>
            <p>Enter to send · Shift + Enter for a new line · Conversations saved in this browser</p>
          </form>
        </div>
      </div>

      {(deleteId || clearId) && (
        <div className="compact-confirm-overlay">
          <div className="compact-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="aegis-confirm-title">
            <h3 id="aegis-confirm-title">{deleteId ? "Delete conversation?" : "Clear messages?"}</h3>
            <p>{deleteId ? "This permanently deletes this conversation and its locally saved messages." : "This removes the messages in this conversation only. Your draft and other conversations will remain."}</p>
            <div className="compact-confirm-actions">
              <button type="button" className="compact-cancel-button" onClick={() => { setDeleteId(null); setClearId(null); }}>Cancel</button>
              <button type="button" className="compact-remove-button" onClick={deleteId ? deleteConversation : clearChat}>{deleteId ? "Delete conversation" : "Clear messages"}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
