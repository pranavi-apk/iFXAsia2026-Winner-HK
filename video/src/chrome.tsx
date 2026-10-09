import React from "react";
import { AbsoluteFill, Img, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { color, font } from "./theme";

const NAV = [
  "Case Overview",
  "Global Map",
  "Ownership Structure",
  "People & Entities",
  "Knowledge Base",
  "Gaps & Next Steps",
];

export const AppChrome: React.FC<{
  active: string;
  copilot?: boolean;
  children: React.ReactNode;
}> = ({ active, copilot, children }) => {
  return (
    <AbsoluteFill style={{ background: color.bg, fontFamily: font, color: color.ink }}>
      <div style={{ display: "flex", height: "100%" }}>
        <aside
          style={{
            width: 250,
            background: color.sidebar,
            color: "#d6d3d1",
            padding: "22px 16px",
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
          }}
        >
          <Img src={staticFile("tracy_logo_gold.png")} style={{ height: 36, width: 120, objectFit: "contain", margin: "4px 8px 22px" }} />
          {NAV.map((item) => {
            const on = item === active;
            return (
              <div
                key={item}
                style={{
                  padding: "11px 12px",
                  borderRadius: 10,
                  marginBottom: 4,
                  fontSize: 15,
                  fontWeight: 600,
                  background: on ? "linear-gradient(135deg, rgba(200,169,102,0.35), #25231f)" : "transparent",
                  color: on ? "#fef08a" : "#a8a29e",
                  border: on ? "1px solid rgba(200,169,102,0.45)" : "1px solid transparent",
                }}
              >
                {item}
              </div>
            );
          })}
          <div style={{ marginTop: "auto", background: "#1c1a17", border: "1px solid #4a3e2a", borderRadius: 14, padding: "10px 12px", display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ width: 28, height: 28, borderRadius: 14, background: "#eab308", color: "#111", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>✦</div>
            <div>
              <div style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>Tracy AI Copilot</div>
              <div style={{ color: "#22c55e", fontSize: 11 }}>Connected to case data</div>
            </div>
          </div>
        </aside>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <header style={{ height: 72, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", borderBottom: `1px solid ${color.line}` }}>
            <div>
              <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.4 }}>Silver Oak Holdings Ltd</div>
              <div style={{ fontSize: 13, color: color.muted }}>BVI · Holding company · Case KYC-2026-0412</div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ border: `1px solid ${color.line}`, background: "#fff", borderRadius: 8, padding: "8px 12px", fontSize: 14, fontWeight: 600 }}>Export Summary</div>
              <div style={{ width: 34, height: 34, borderRadius: 17, background: "#e2dbcd", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>PK</div>
            </div>
          </header>
          <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
            <div style={{ flex: 1, padding: "26px 28px 130px", position: "relative" }}>{children}</div>
            {copilot ? <Copilot /> : null}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Copilot: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slide = spring({ frame, fps, config: { damping: 16, stiffness: 90 } });
  return (
    <aside
      style={{
        width: 360,
        borderLeft: `1px solid ${color.line}`,
        background: color.cream,
        padding: 20,
        transform: `translateX(${(1 - slide) * 80}px)`,
        opacity: slide,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 18 }}>Tracy AI Copilot</div>
      <div style={{ color: "#16a34a", fontSize: 13, marginTop: 4 }}>Connected to case data</div>
      <div style={{ marginTop: 18, background: "#fff", border: `1px solid ${color.line}`, borderRadius: 14, padding: 14, fontSize: 15, lineHeight: 1.45 }}>
        Ask about ownership, a missing document, or a name in Chinese or Cantonese. The panel stays closed until you open it.
      </div>
    </aside>
  );
};

export const Lower: React.FC<{ kicker: string; text: string }> = ({ kicker, text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - 4, fps, config: { damping: 18, stiffness: 120 } });
  return (
    <div
      style={{
        position: "absolute",
        left: 28,
        right: 28,
        bottom: 20,
        transform: `translateY(${(1 - enter) * 20}px)`,
        opacity: enter,
        background: color.ink,
        color: "#f6efe2",
        borderRadius: 16,
        padding: "14px 20px",
        display: "flex",
        gap: 18,
        alignItems: "center",
        zIndex: 5,
      }}
    >
      <div style={{ color: "#e7c98a", fontWeight: 700, fontSize: 14, letterSpacing: 0.6, textTransform: "uppercase", width: 230, flexShrink: 0 }}>{kicker}</div>
      <div style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.25 }}>{text}</div>
    </div>
  );
};

export const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ background: color.card, border: `1px solid ${color.line}`, borderRadius: 16, padding: 18, boxShadow: "0 8px 24px rgba(80,60,20,0.05)", ...style }}>{children}</div>
);
