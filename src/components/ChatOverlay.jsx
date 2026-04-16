// ── ChatOverlay.jsx — Fullscreen chat, Lite aesthetic ──
import { useState, useRef, useEffect, useCallback } from "react";
import { useTheme } from "../theme/ThemeContext";
import { useI18n } from "../i18n/I18nContext";
import { bd, mn } from "../theme/tokens";
import Orb from "./Orb.jsx";

// Generate contextual suggestions based on market state
function buildSuggestions(signal, d) {
  // Pool of FAQ-style questions people always ask
  const universal = [
    "Should I buy Bitcoin today?",
    "Will Bitcoin keep falling?",
    "Will Bitcoin go up?",
    "How much will Bitcoin be worth?",
    "Is Bitcoin overvalued?",
    "Is it too late to buy Bitcoin?",
    "Should I sell my Bitcoin?",
    "Is Bitcoin a bubble?",
    "What's the worst case?",
    "Should I DCA into Bitcoin?",
    "What's Bitcoin's fair price?",
    "What's Bitcoin's support level?",
    "What is the Power Law?",
    "Is Bitcoin a good long-term investment?",
    "When is the best time to buy?",
    "When will Bitcoin hit $150K?",
    "When will Bitcoin hit $1M?",
  ];

  if (!d) {
    // No data — pick 5 popular ones
    return [universal[0], universal[2], universal[10], universal[7], universal[15]];
  }

  // Pick 5 contextual questions based on market state
  if (signal === "buy" || signal === "strongBuy") {
    return [
      universal[0],  // Should I buy?
      universal[1],  // Will it keep falling?
      universal[9],  // Should I DCA?
      universal[8],  // Worst case?
      universal[15], // When will it hit $150K?
    ];
  }
  if (signal === "sell") {
    return [
      universal[6],  // Should I sell?
      universal[7],  // Is it a bubble?
      universal[4],  // Is it overvalued?
      universal[8],  // Worst case?
      universal[14], // Best time to buy?
    ];
  }
  // hold / caution
  return [
    universal[0],  // Should I buy?
    universal[5],  // Is it too late?
    universal[10], // Fair price?
    universal[9],  // Should I DCA?
    universal[13], // Good long-term investment?
  ];
}

export default function ChatOverlay({ signal = "buy", engineData, onClose }) {
  const { t } = useTheme();
  const { lang } = useI18n();
  const [phase, setPhase] = useState("expanding");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [orbState, setOrbState] = useState("responding");
  const inputRef = useRef(null);
  const chatEndRef = useRef(null);
  const abortRef = useRef(null);

  const signalColor = signal === "sell" ? "#EB5757" : signal === "hold" ? "#E8A838" : "#27AE60";

  useEffect(() => {
    if (phase === "expanding") {
      const timer = setTimeout(() => {
        setPhase("open");
        setOrbState("idle");
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const handleClose = () => {
    abortRef.current?.abort();
    setPhase("contracting");
    setTimeout(() => onClose(), 400);
  };

  const handleSend = useCallback(async (text) => {
    const msg = text || input.trim();
    if (!msg || orbState === "thinking") return;

    // Add user message
    setMessages(prev => [...prev, { role: "user", text: msg }]);
    setInput("");
    setOrbState("thinking");

    // Build history from current messages (last 10)
    const currentMessages = [...messages, { role: "user", text: msg }];
    const history = currentMessages.slice(-10).map(m => ({
      role: m.role === "bot" ? "assistant" : "user",
      text: m.text,
    }));

    // Abort any previous request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history: history.slice(0, -1), lang }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed (${response.status})`);
      }

      // Read SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let botText = "";
      let buffer = "";

      // Add empty bot message that we'll fill as chunks arrive
      setMessages(prev => [...prev, { role: "bot", text: "" }]);
      setOrbState("responding");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        // Keep the last potentially incomplete line in buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr);
            if (event.type === "text") {
              botText += event.text;
              const snapshot = botText;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "bot", text: snapshot };
                return updated;
              });
            } else if (event.type === "error") {
              throw new Error(event.error || "Stream error");
            }
            // "done" type — stream ends naturally
          } catch (parseErr) {
            if (parseErr.message === "Stream error") throw parseErr;
            // Ignore JSON parse errors for partial chunks
          }
        }
      }

      setOrbState("idle");
    } catch (err) {
      if (err.name === "AbortError") return; // User navigated away

      console.error("Chat error:", err);
      setOrbState("idle");

      const errorMsg = lang === "es"
        ? "Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo."
        : "Sorry, something went wrong. Please try again.";

      setMessages(prev => {
        // Remove empty bot message if it was added
        const cleaned = prev.filter((m, i) => !(i === prev.length - 1 && m.role === "bot" && m.text === ""));
        return [...cleaned, { role: "bot", text: errorMsg }];
      });
    }
  }, [input, messages, orbState, lang]);

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isClosing = phase === "contracting";

  const suggestions = buildSuggestions(signal, engineData);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
    }}>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: "absolute", inset: 0,
          background: "rgba(0,0,0,0.5)",
          animation: isClosing
            ? "chatBackdropOut 0.35s ease forwards"
            : "chatBackdropIn 0.3s ease forwards",
        }}
      />
      {/* Sheet */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        height: "92vh",
        borderRadius: "16px 16px 0 0",
        background: t.bg,
        display: "flex", flexDirection: "column",
        overflow: "hidden",
        animation: isClosing
          ? "chatSlideDown 0.35s cubic-bezier(0.22,1,0.36,1) forwards"
          : "chatSlideUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards",
      }}>
      {/* Handle bar */}
      <div style={{
        display: "flex", justifyContent: "center",
        padding: "10px 0 2px",
      }}>
        <div style={{
          width: 36, height: 4, borderRadius: 2,
          background: t.border,
        }} />
      </div>
      {/* Header — minimal, Lite style */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "20px 24px",
        borderBottom: `1px solid ${t.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Orb state={orbState} signal={signal} size={28} />
          <span style={{ fontFamily: bd, fontSize: 15, fontWeight: 600, color: t.cream }}>
            CommonSense
          </span>
          <span style={{ fontFamily: mn, fontSize: 11, color: t.faint }}>
            AI
          </span>
        </div>
        <button
          onClick={handleClose}
          style={{
            background: "none", border: "none",
            color: t.dim, fontSize: 14, cursor: "pointer",
            fontFamily: bd, fontWeight: 400,
            padding: "4px 0",
          }}
        >
          Close
        </button>
      </div>

      {/* Messages area */}
      <div style={{
        flex: 1, overflowY: "auto",
        padding: "0 24px",
        display: "flex", flexDirection: "column",
      }}>
        {/* Empty state — Lite hero style */}
        {messages.length === 0 && (
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            justifyContent: "flex-start",
            paddingTop: "clamp(32px, 8vh, 100px)",
          }}>
            <Orb state="idle" signal={signal} size={48} style={{ marginBottom: 24 }} />
            <h2 style={{
              fontFamily: bd,
              fontSize: "clamp(32px, 8vw, 72px)",
              fontWeight: 700,
              color: t.cream,
              letterSpacing: "-0.04em",
              lineHeight: 0.95,
              margin: 0,
            }}>
              Ask me anything about Bitcoin
            </h2>
            <p style={{
              fontFamily: bd, fontSize: "clamp(14px, 1.3vw, 18px)",
              color: t.faint, lineHeight: 1.6,
              margin: "12px 0 0", maxWidth: 420,
            }}>
              I answer with real-time data from CommonSense's model. No guesswork — just numbers.
            </p>

            <div style={{
              display: "flex", flexDirection: "column", gap: 0,
              marginTop: "clamp(24px, 4vh, 48px)",
            }}>
              {suggestions.map(q => (
                <div
                  key={q}
                  onClick={() => handleSend(q)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "16px 0",
                    borderTop: `1px solid ${t.border}`,
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontFamily: bd, fontSize: 15, color: t.dim }}>{q}</span>
                  <span style={{ fontFamily: bd, fontSize: 14, color: t.faint }}>→</span>
                </div>
              ))}
              <div style={{ borderTop: `1px solid ${t.border}` }} />
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.length > 0 && (
          <div style={{
            display: "flex", flexDirection: "column", gap: 24,
            paddingTop: 24, paddingBottom: 24,
          }}>
            {messages.map((m, i) => (
              <div key={i}>
                {m.role === "user" ? (
                  <div>
                    <div style={{
                      fontFamily: mn, fontSize: 9, color: t.faint,
                      textTransform: "uppercase", letterSpacing: "0.08em",
                      marginBottom: 6,
                    }}>
                      You
                    </div>
                    <div style={{
                      fontFamily: bd, fontSize: "clamp(17px, 2vw, 22px)",
                      fontWeight: 500, color: t.cream, lineHeight: 1.5,
                    }}>
                      {m.text}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      marginBottom: 8,
                    }}>
                      <Orb state="idle" signal={signal} size={16} />
                      <span style={{
                        fontFamily: mn, fontSize: 9, color: t.faint,
                        textTransform: "uppercase", letterSpacing: "0.08em",
                      }}>
                        CommonSense
                      </span>
                    </div>
                    <div style={{
                      fontFamily: bd, fontSize: "clamp(15px, 1.5vw, 19px)",
                      fontWeight: 400, color: t.cream, lineHeight: 1.7,
                    }}>
                      {m.text}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {orbState === "thinking" && (
              <div>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  marginBottom: 8,
                }}>
                  <Orb state="thinking" signal={signal} size={16} />
                  <span style={{
                    fontFamily: mn, fontSize: 9, color: t.faint,
                    textTransform: "uppercase", letterSpacing: "0.08em",
                  }}>
                    CommonSense
                  </span>
                </div>
                <span style={{
                  fontFamily: mn, fontSize: 13, color: t.dim,
                }}>
                  Analyzing...
                </span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Input — bottom bar, Lite style */}
      <div style={{
        padding: "16px 24px",
        borderTop: `1px solid ${t.border}`,
      }}>
        <div style={{
          display: "flex", gap: 12, alignItems: "center",
        }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about Bitcoin..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              borderBottom: `1px solid ${t.border}`,
              padding: "10px 0",
              color: t.cream,
              fontFamily: bd,
              fontSize: 15,
              outline: "none",
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim()}
            style={{
              background: "none",
              border: "none",
              fontFamily: bd,
              fontSize: 14,
              fontWeight: 500,
              color: input.trim() ? t.cream : t.faint,
              cursor: input.trim() ? "pointer" : "default",
              padding: "8px 0",
              transition: "color 0.2s",
            }}
          >
            Send
          </button>
        </div>
        <div style={{
          textAlign: "center", paddingTop: 10,
          fontFamily: mn, fontSize: 10, color: t.faint,
        }}>
          Powered by CommonSense · commonsense.finance
        </div>
      </div>
    </div>
    </div>
  );
}
