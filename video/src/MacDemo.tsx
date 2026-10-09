import React from "react";
import { AbsoluteFill, Easing, OffthreadVideo, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import marks from "./marks.json";

const CONTENT_W = 1680;
const CONTENT_H = 945;

type Box = { x: number; y: number; width: number; height: number };
type Mark = { name: string; sec: number; box: Box | null };

const shots = marks as Mark[];

function focus(box: Box) {
  const sx = CONTENT_W / 1920;
  const sy = CONTENT_H / 1080;
  const ox = (box.x + box.width / 2) * sx;
  const oy = (box.y + box.height / 2) * sy;
  const fitW = (CONTENT_W * 0.58) / Math.max(box.width * sx, 1);
  const fitH = (CONTENT_H * 0.58) / Math.max(box.height * sy, 1);
  const scale = Math.min(2.35, Math.max(1.35, Math.min(fitW, fitH)));
  return { ox, oy, scale };
}

export const MacDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const end = durationInFrames / fps;
  let amount = 0;
  let ox = CONTENT_W / 2;
  let oy = CONTENT_H / 2;
  let scale = 1;

  shots.forEach((shot, index) => {
    if (!shot.box) return;
    const next = shots[index + 1]?.sec ?? end;
    const a = shot.sec * fps;
    const b = Math.max(a + fps, (next - 0.25) * fps);
    const value = interpolate(frame, [a, a + 14, b - 12, b], [0, 1, 1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    });
    if (value > amount) {
      const target = focus(shot.box as Box);
      amount = value;
      ox = target.ox;
      oy = target.oy;
      scale = 1 + (target.scale - 1) * value;
    }
  });

  const tx = (CONTENT_W / 2 - ox) * amount;
  const ty = (CONTENT_H / 2 - oy) * amount;

  return (
    <AbsoluteFill style={{ background: "linear-gradient(160deg, #d9d3c8 0%, #cfc6b8 45%, #e7e1d6 100%)", fontFamily: '"Avenir Next", "Helvetica Neue", sans-serif' }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 18% 0%, rgba(255,255,255,0.55), transparent 34%)" }} />
      <div
        style={{
          position: "absolute",
          left: (1920 - CONTENT_W) / 2,
          top: (1080 - (CONTENT_H + 38)) / 2,
          width: CONTENT_W,
          height: CONTENT_H + 38,
          borderRadius: 14,
          background: "#f3f1ec",
          boxShadow: "0 30px 80px rgba(40, 32, 20, 0.28), 0 2px 0 rgba(255,255,255,0.65) inset",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ height: 38, position: "relative", display: "flex", alignItems: "center", padding: "0 14px", background: "linear-gradient(#f7f5f1, #ece8e1)", borderBottom: "1px solid #ddd6cc", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 8, zIndex: 1 }}>
            <Dot color="#ff5f57" />
            <Dot color="#febc2e" />
            <Dot color="#28c840" />
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, textAlign: "center", fontSize: 13, fontWeight: 600, color: "#5c564e" }}>
            Tracy — AI Compliance Intelligence
          </div>
        </div>
        <div style={{ width: CONTENT_W, height: CONTENT_H, overflow: "hidden", position: "relative", background: "#fff" }}>
          <OffthreadVideo
            src={staticFile("capture.mp4")}
            style={{
              width: CONTENT_W,
              height: CONTENT_H,
              objectFit: "fill",
              transformOrigin: `${ox}px ${oy}px`,
              transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Dot: React.FC<{ color: string }> = ({ color }) => (
  <div style={{ width: 12, height: 12, borderRadius: 6, background: color, boxShadow: "inset 0 -1px 1px rgba(0,0,0,0.15)" }} />
);
