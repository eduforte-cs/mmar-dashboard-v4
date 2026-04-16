// ── ChatOverlay.jsx — Fullscreen chat that expands from the orb ──
import { useState, useRef, useEffect } from "react";
import Orb from "./Orb.jsx";

const BG = "#1A1B18";
const CREAM = "#F0EDDF";
const DIM = "#B0AD9F";
const BORDER = "#2E2F2A";

export default function ChatOverlay({ signal = "buy", onClose }) {
  const [phase, setPhase] = useState("expanding"); // expanding → open → contracting → closed
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [orbState, setOrbState] = useState("responding");
  const inputRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (phase === "expanding") {
      const t = setTimeout(() => {
        setPhase("open");
        setOrbState("idle");
        inputRef.current?.focus();
      }, 500);
      return () => clearTimeout(t);
    }
  }, [phase]);

  const handleClose = () => {
    setPhase("contracting");
    setTimeout(() => onClose(), 450);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setInput("");
    setOrbState("thinking");

    // Simulated response for prototype
    setTimeout(() => {
      setOrbState("responding");
      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: "bot",
          text: "This is a prototype — the AI agent isn't connected yet. When live, I'll answer your question using real-time data from CommonSense's model."
        }]);
        setOrbState("idle");
      }, 800);
    }, 1500);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      display: "flex",
      flexDirection: "column",
      background: phase === "expanding" || phase === "contracting" ? "transparent" : BG,
    }}>
      {/* Expansion animation backdrop */}
      {(phase === "expanding" || phase === "contracting") && (
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1,
        }}>
          <div style={{
            width: 48, height: 48,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${signal === "buy" || signal === "strongBuy" ? "#27AE60" : signal === "hold" ? "#E8A838" : "#EB5757"} 0%, ${BG} 70%)`,
            animation: phase === "expanding"
              ? "orbExpand 0.5s cubic-bezier(0.22,1,0.36,1) forwards"
              : "orbContract 0.45s cubic-bezier(0.22,1,0.36,1) forwards",
          }} />
        </div>
      )}

      {/* Chat content — visible only when open */}
      {phase === "open" && (
        <div style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          animation: "fi 0.3s ease",
        }}>
          {/* Header */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: `1px solid ${BORDER}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Orb state={orbState} signal={signal} size={32} />
              <div>
                <div style={{ fontFamily: "Switzer, sans-serif", fontWeight: 600, fontSize: 15, color: CREAM }}>
                  CommonSense
                </div>
                <div style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: DIM }}>
                  AI Assistant
                </div>
              </div>
            </div>
            <button
              onClick={handleClose}
              style={{
                background: "none",
                border: "none",
                color: DIM,
                fontSize: 24,
                cursor: "pointer",
                padding: "4px 8px",
                lineHeight: 1,
              }}
              aria-label="Close chat"
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}>
            {/* Welcome */}
            {messages.length === 0 && (
              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                flex: 1,
                gap: 20,
                textAlign: "center",
              }}>
                <Orb state="idle" signal={signal} size={64} />
                <div style={{ marginTop: 8 }}>
                  <div style={{
                    fontFamily: "Switzer, sans-serif",
                    fontWeight: 700,
                    fontSize: 22,
                    color: CREAM,
                    marginBottom: 8,
                  }}>
                    Ask me anything about Bitcoin
                  </div>
                  <div style={{
                    fontFamily: "Switzer, sans-serif",
                    fontSize: 14,
                    color: DIM,
                    maxWidth: 340,
                    lineHeight: 1.5,
                  }}>
                    I answer with real-time data from CommonSense's quantitative model. No guesswork, no opinions — just numbers.
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 8 }}>
                  {["Should I buy Bitcoin?", "Is Bitcoin a bubble?", "What's the fair price?", "When will it hit $150K?"].map(q => (
                    <button
                      key={q}
                      onClick={() => { setInput(q); setTimeout(() => handleSend(), 50); }}
                      onMouseDown={() => setInput(q)}
                      style={{
                        background: `${BORDER}`,
                        border: `1px solid ${BORDER}`,
                        borderRadius: 20,
                        padding: "8px 14px",
                        color: CREAM,
                        fontFamily: "Switzer, sans-serif",
                        fontSize: 13,
                        cursor: "pointer",
                        transition: "background 0.2s",
                      }}
                      onMouseOver={e => e.currentTarget.style.background = "#3A3B36"}
                      onMouseOut={e => e.currentTarget.style.background = BORDER}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} style={{
                display: "flex",
                justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                alignItems: "flex-start",
                gap: 8,
              }}>
                {m.role === "bot" && <Orb state="idle" signal={signal} size={24} style={{ flexShrink: 0, marginTop: 2 }} />}
                <div style={{
                  maxWidth: "75%",
                  padding: "10px 14px",
                  borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  background: m.role === "user" ? "#2E2F2A" : `${signal === "buy" || signal === "strongBuy" ? "#27AE60" : signal === "hold" ? "#E8A838" : "#EB5757"}15`,
                  border: m.role === "user" ? "none" : `1px solid ${BORDER}`,
                  color: CREAM,
                  fontFamily: "Switzer, sans-serif",
                  fontSize: 14,
                  lineHeight: 1.55,
                }}>
                  {m.text}
                </div>
              </div>
            ))}

            {orbState === "thinking" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Orb state="thinking" signal={signal} size={24} />
                <span style={{ fontFamily: "DM Mono, monospace", fontSize: 12, color: DIM }}>Thinking...</span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: "12px 16px",
            borderTop: `1px solid ${BORDER}`,
            display: "flex",
            gap: 10,
            alignItems: "center",
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about Bitcoin..."
              style={{
                flex: 1,
                background: "#111110",
                border: `1px solid ${BORDER}`,
                borderRadius: 12,
                padding: "12px 16px",
                color: CREAM,
                fontFamily: "Switzer, sans-serif",
                fontSize: 14,
                outline: "none",
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              style={{
                background: input.trim() ? "#27AE60" : "#2E2F2A",
                border: "none",
                borderRadius: 10,
                width: 40, height: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: input.trim() ? "pointer" : "default",
                transition: "background 0.2s",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={CREAM} strokeWidth="2" strokeLinecap="round">
                <path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" />
              </svg>
            </button>
          </div>

          {/* Footer */}
          <div style={{
            textAlign: "center",
            padding: "8px",
            fontFamily: "DM Mono, monospace",
            fontSize: 10,
            color: "#706E64",
          }}>
            Powered by CommonSense Digital Asset Management
          </div>
        </div>
      )}
    </div>
  );
}
