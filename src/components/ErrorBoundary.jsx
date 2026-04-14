import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    console.error("[ErrorBoundary]", error, info);
  }

  handleReload = () => {
    this.setState({ error: null, info: null });
    if (typeof window !== "undefined") window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    const { error, info } = this.state;
    return (
      <div style={{
        background: "#0e0e10", color: "#E8E6DC", minHeight: "100vh",
        padding: "24px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 12, lineHeight: 1.5,
      }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: "#EB5757" }}>
            Something crashed
          </div>
          <div style={{ color: "#6B6A62", marginBottom: 16 }}>
            The UI hit an unrecoverable error. Details below.
          </div>
          <pre style={{
            background: "#161618", padding: 12, borderRadius: 4,
            overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word",
            border: "1px solid #3A3B36", marginBottom: 12,
          }}>
            {String(error?.stack || error?.message || error)}
          </pre>
          {info?.componentStack && (
            <pre style={{
              background: "#161618", padding: 12, borderRadius: 4,
              overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word",
              border: "1px solid #3A3B36", marginBottom: 12, color: "#6B6A62",
            }}>
              {info.componentStack}
            </pre>
          )}
          <button
            onClick={this.handleReload}
            style={{
              background: "#E8E6DC", color: "#0e0e10", border: "none",
              padding: "8px 20px", cursor: "pointer", fontSize: 12,
              fontWeight: 600, borderRadius: 4,
            }}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
