import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { AppChrome, Card, Lower } from "./chrome";
import { color, font } from "./theme";

const pop = (frame: number, fps: number, delay: number) =>
  spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 130 } });

export const TitleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = pop(frame, fps, 4);
  return (
    <AbsoluteFill style={{ background: color.bg, fontFamily: font, alignItems: "center", justifyContent: "center" }}>
      <div style={{ opacity: enter, transform: `translateY(${(1 - enter) * 16}px)`, textAlign: "center" }}>
        <Img src={staticFile("tracy_logo_gold.png")} style={{ height: 72, objectFit: "contain", mixBlendMode: "multiply" }} />
        <div style={{ marginTop: 18, fontSize: 28, color: color.goldDeep, fontWeight: 600 }}>AI compliance intelligence</div>
        <div style={{ marginTop: 14, fontSize: 40, fontWeight: 700, color: color.ink, maxWidth: 980, lineHeight: 1.2 }}>
          From a document pack to an ownership review, in one conversation.
        </div>
        <div style={{ marginTop: 28, display: "inline-block", background: "#fff", border: `1px solid ${color.line}`, borderRadius: 999, padding: "10px 18px", fontSize: 18, fontWeight: 600 }}>
          Sample case · Silver Oak Holdings Ltd
        </div>
      </div>
    </AbsoluteFill>
  );
};

const FILES = [
  "Certificate of incorporation",
  "Register of directors",
  "Passport · Zhang Wei",
  "HKID · Chan Hiu Lam",
  "股权转让协议 · share sale",
  "Ownership structure chart",
  "Voting proxy",
  "Audited accounts FY2025",
];

export const UploadScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const shown = Math.min(FILES.length, Math.floor(frame / 6));
  return (
    <AbsoluteFill style={{ background: color.bg, fontFamily: font, color: color.ink, padding: 80 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: color.goldDeep, letterSpacing: 1 }}>NEW INVESTIGATION</div>
      <div style={{ fontSize: 48, fontWeight: 700, marginTop: 8 }}>Drop the onboarding pack</div>
      <div style={{ marginTop: 28, background: "#fff", border: "2px dashed #e2d3b0", borderRadius: 24, minHeight: 420, padding: 24 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {FILES.slice(0, shown).map((name, i) => (
            <div key={name} style={{ background: color.cream, border: `1px solid ${color.line}`, borderRadius: 12, padding: "12px 14px", width: 360, fontWeight: 650, fontSize: 18, opacity: pop(frame, fps, i * 6) }}>
              {name}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 22, fontSize: 22, color: color.muted, fontWeight: 600 }}>{Math.min(31, 8 + shown * 3)} of 31 documents</div>
      </div>
      <Lower kicker="01 · Upload" text="One folder: company records, IDs, the Chinese share-sale agreement, accounts, and the structure chart." />
    </AbsoluteFill>
  );
};

const NAMES = [
  { en: "Zhang Wei", zh: "张伟", trad: "張偉", canto: "Cheung Wai", role: "70% owner · Director" },
  { en: "Liu Mei", zh: "刘梅", trad: "劉梅", canto: "Lau Mui", role: "Owner of Jade Crest" },
  { en: "Chen Xiaolin", zh: "陈晓琳", trad: "陳曉琳", canto: "Chan Hiu Lam", role: "Director · HKID spelling" },
];

export const ParseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: color.bg, fontFamily: font, color: color.ink, padding: "64px 72px 140px" }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: color.goldDeep }}>INTELLIGENT PARSING</div>
      <div style={{ fontSize: 42, fontWeight: 700, margin: "8px 0 22px" }}>English, Chinese, and Cantonese. One person.</div>
      <div style={{ display: "flex", gap: 18 }}>
        {NAMES.map((person, i) => {
          const s = pop(frame, fps, 8 + i * 10);
          return (
            <Card key={person.en} style={{ flex: 1, opacity: s, transform: `translateY(${(1 - s) * 18}px)` }}>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{person.en}</div>
              <div style={{ fontSize: 26, marginTop: 8 }}>{person.zh} · {person.trad}</div>
              <div style={{ marginTop: 10, color: color.goldDeep, fontWeight: 700, fontSize: 20 }}>Cantonese · {person.canto}</div>
              <div style={{ marginTop: 14, fontSize: 16, color: color.muted }}>{person.role}</div>
              <div style={{ marginTop: 16, display: "inline-block", background: "#f0fdf4", color: "#166534", borderRadius: 999, padding: "4px 10px", fontSize: 13, fontWeight: 700 }}>Matched across the pack</div>
            </Card>
          );
        })}
      </div>
      <Lower kicker="02 · Trilingual" text="A passport, a Hong Kong bank statement, and a Chinese contract can spell the same name three ways. Tracy joins them." />
    </AbsoluteFill>
  );
};

export const OverviewScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const metrics = [
    ["9", "Entities"],
    ["3", "Individuals"],
    ["6", "Relationships"],
    ["3", "Evidence gaps"],
  ];
  const findings = [
    "Missing: Register of Members",
    "Pending: Jade Crest constitution and register",
    "Zhang Wei holds the voting proxy",
    "Zhang Wei is also a director of Eastbridge",
    "Possible PEP match: Chen Xiaolin",
  ];
  return (
    <AppChrome active="Case Overview">
      <div style={{ fontSize: 22, marginBottom: 16 }}>I've analysed the documents for <b>Silver Oak Holdings Ltd</b>. Here's what I found.</div>
      <div style={{ display: "flex", gap: 12 }}>
        {metrics.map(([n, label], i) => (
          <Card key={label} style={{ flex: 1, opacity: pop(frame, fps, i * 4) }}>
            <div style={{ fontSize: 36, fontWeight: 700 }}>{n}</div>
            <div style={{ color: color.muted, fontWeight: 600 }}>{label}</div>
          </Card>
        ))}
      </div>
      <Card style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Key findings</div>
        {findings.map((line, i) => (
          <div key={line} style={{ padding: "6px 0", fontSize: 18, opacity: pop(frame, fps, 12 + i * 5) }}>{line}</div>
        ))}
      </Card>
      <Lower kicker="03 · Case overview" text="Counts, findings, and the next place to look, as soon as the pack is read." />
    </AppChrome>
  );
};

const NODES = [
  { x: 470, y: 220, label: "Silver Oak", sub: "BVI · applicant" },
  { x: 150, y: 60, label: "Zhang Wei", sub: "China · 70%" },
  { x: 760, y: 50, label: "Jade Crest", sub: "Singapore · 30%" },
  { x: 980, y: 150, label: "Liu Mei", sub: "Singapore · 100%" },
  { x: 70, y: 390, label: "Eastbridge", sub: "Hong Kong" },
  { x: 340, y: 460, label: "Maple Finance", sub: "Singapore" },
  { x: 640, y: 390, label: "Northern Capital", sub: "United Kingdom" },
  { x: 960, y: 390, label: "NC Real Estate", sub: "USA" },
];

export const MapScene: React.FC = () => {
  const frame = useCurrentFrame();
  const draw = interpolate(frame, [0, 28], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AppChrome active="Global Map">
      <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 8 }}>Global ownership map</div>
      <svg width="1180" height="560" style={{ background: "#fff", borderRadius: 16, border: `1px solid ${color.line}` }}>
        {NODES.slice(1).map((node) => (
          <line key={node.label} x1={NODES[0].x + 80} y1={NODES[0].y + 26} x2={node.x + 80} y2={node.y + 26} stroke="#c8a966" strokeWidth={2} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
        ))}
        {NODES.map((node, i) => (
          <g key={node.label} opacity={interpolate(frame, [i * 2, i * 2 + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}>
            <rect x={node.x} y={node.y} rx={12} width={160} height={52} fill={i === 0 ? "#1c1915" : "#fff"} stroke="#efe8da" />
            <text x={node.x + 12} y={node.y + 22} fill={i === 0 ? "#fff" : "#1c1915"} fontSize={15} fontWeight={700}>{node.label}</text>
            <text x={node.x + 12} y={node.y + 40} fill={i === 0 ? "#e7c98a" : "#6b645b"} fontSize={12}>{node.sub}</text>
          </g>
        ))}
      </svg>
      <Lower kicker="04 · Global map" text="The parent in the BVI, and the group in Hong Kong, Singapore, China, the UK, and the US." />
    </AppChrome>
  );
};

export const StructureScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AppChrome active="Ownership Structure">
      <div style={{ display: "flex", gap: 16 }}>
        <Card style={{ flex: 1.2, opacity: pop(frame, fps, 4) }}>
          <div style={{ fontSize: 13, color: color.muted, fontWeight: 700 }}>OWNERSHIP</div>
          <Row name="Zhang Wei" detail="70% direct · UBO" />
          <Row name="Jade Crest Holdings Pte Ltd" detail="30% · Singapore" />
          <Row name="Liu Mei" detail="100% of Jade Crest · indirect 30%" />
        </Card>
        <Card style={{ flex: 1, opacity: pop(frame, fps, 14), background: "#fdfaf4" }}>
          <div style={{ fontSize: 13, color: color.goldDeep, fontWeight: 700 }}>CONTROL, NOT JUST SHARES</div>
          <div style={{ fontSize: 26, fontWeight: 700, marginTop: 10 }}>Voting proxy</div>
          <div style={{ marginTop: 8, fontSize: 18, lineHeight: 1.4 }}>Zhang Wei votes Jade Crest's 30% until 31 Dec 2026. Dividends stay with Liu Mei.</div>
          <div style={{ marginTop: 16, fontSize: 16, color: color.muted }}>Also a director of Eastbridge Trading Ltd.</div>
        </Card>
      </div>
      <Lower kicker="05 · Ownership" text="Who owns the shares, and who actually controls the votes." />
    </AppChrome>
  );
};

const Row: React.FC<{ name: string; detail: string }> = ({ name, detail }) => (
  <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", borderBottom: `1px solid ${color.line}`, fontSize: 20 }}>
    <b>{name}</b>
    <span style={{ color: color.muted }}>{detail}</span>
  </div>
);

export const PeopleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const people = [
    ["Zhang Wei", "UBO · Director", "Hong Kong", "Verified"],
    ["Liu Mei", "UBO · Director", "Singapore", "Gaps"],
    ["Chen Xiaolin", "Director", "Hong Kong", "PEP check"],
    ["Jade Crest Holdings", "Shareholder 30%", "Singapore", "Pending"],
  ];
  return (
    <AppChrome active="People & Entities">
      <div style={{ display: "flex", gap: 16 }}>
        <Card style={{ flex: 1.3, padding: 0, overflow: "hidden" }}>
          {people.map((row, i) => (
            <div key={row[0]} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 0.8fr 0.7fr", padding: "16px 18px", borderBottom: `1px solid ${color.line}`, fontSize: 17, background: i === 0 ? "#fdfaf4" : "#fff", opacity: pop(frame, fps, i * 5) }}>
              <b>{row[0]}</b><span>{row[1]}</span><span style={{ color: color.muted }}>{row[2]}</span><b>{row[3]}</b>
            </div>
          ))}
        </Card>
        <Card style={{ width: 380, background: "#0f172a", color: "#fff", opacity: pop(frame, fps, 16) }}>
          <div style={{ color: "#fbbf24", fontWeight: 700, fontSize: 14 }}>TRILINGUAL RESOLUTION · 98%</div>
          <div style={{ fontSize: 26, fontWeight: 700, margin: "10px 0" }}>Zhang Wei</div>
          {["Zhang Wei · English", "张伟 · Simplified", "張偉 · Traditional", "Cheung Wai · Cantonese"].map((line) => (
            <div key={line} style={{ background: "rgba(255,255,255,0.08)", borderRadius: 8, padding: "8px 10px", marginTop: 8, fontSize: 16 }}>{line}</div>
          ))}
        </Card>
      </div>
      <Lower kicker="06 · People & entities" text="Roles, jurisdiction, evidence status, and every spelling of the name." />
    </AppChrome>
  );
};

export const KnowledgeScene: React.FC = () => {
  const modes = ["All", "Ownership", "Identity", "Document evidence", "Conflicts"];
  const frame = useCurrentFrame();
  const on = Math.min(modes.length - 1, Math.floor(frame / 42));
  return (
    <AppChrome active="Knowledge Base">
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {modes.map((mode, i) => (
          <div key={mode} style={{ padding: "8px 12px", borderRadius: 999, background: i === on ? color.ink : "#fff", color: i === on ? "#fef08a" : color.ink, border: `1px solid ${color.line}`, fontSize: 14, fontWeight: 700 }}>{mode}</div>
        ))}
      </div>
      <Card>
        <div style={{ fontSize: 20, lineHeight: 1.45 }}>
          Passport: Zhang Wei → Zhang Wei<br />
          HK bank statement in the name Cheung Wai → same person<br />
          股权转让协议 → source of wealth, USD 6.2 million<br />
          Structure chart → Jade Crest 30%, Eastbridge 100%
        </div>
        <div style={{ marginTop: 14, color: color.muted, fontSize: 16 }}>Every link keeps the document it came from. Nothing on the graph is invented.</div>
      </Card>
      <Lower kicker="07 · Knowledge base" text="Filter the same facts by ownership, identity, document evidence, or conflicts." />
    </AppChrome>
  );
};

export const GapsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const gaps = [
    "Register of members for Silver Oak",
    "Jade Crest constitution and register of members",
    "Source of wealth evidence for Liu Mei",
    "Renewed passport for Liu Mei, expired 30 Jul 2026",
  ];
  return (
    <AppChrome active="Gaps & Next Steps">
      <div style={{ display: "flex", gap: 16 }}>
        <Card style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Missing evidence & next steps</div>
          {gaps.map((gap, i) => (
            <div key={gap} style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 0", opacity: pop(frame, fps, i * 6) }}>
              <div style={{ width: 26, height: 26, borderRadius: 13, background: color.ink, color: "#fef08a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>{i + 1}</div>
              <div style={{ fontSize: 18 }}>{gap}</div>
            </div>
          ))}
        </Card>
        <Card style={{ flex: 1, opacity: pop(frame, fps, 18) }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <b>Chase email draft</b>
            <span style={{ color: "#166534", fontWeight: 700, fontSize: 13 }}>Ready to send</span>
          </div>
          <div style={{ marginTop: 12, fontSize: 16, lineHeight: 1.45, color: "#3d3730" }}>
            Please send the register of members, Jade Crest's constitution, and Liu Mei's source of wealth evidence.<br /><br />
            敬啟者：請提供成員名冊、翡翠峰控股的章程，以及劉梅的財富來源證明。
          </div>
        </Card>
      </div>
      <Lower kicker="08 · Gaps & email" text="The checklist and a bilingual chase email. The officer reviews it before anything is sent." />
    </AppChrome>
  );
};

export const CloseScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AppChrome active="Case Overview" copilot>
      <div style={{ fontSize: 34, fontWeight: 700, maxWidth: 760, lineHeight: 1.25, opacity: pop(frame, fps, 6) }}>
        Tracy prepares the review. The officer makes the decision.
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
        {["Ask the copilot", "Export the summary", "Sanctions, PEP, and source of funds"].map((item, i) => (
          <Card key={item} style={{ flex: 1, fontSize: 18, fontWeight: 650, opacity: pop(frame, fps, 12 + i * 6) }}>{item}</Card>
        ))}
      </div>
      <Lower kicker="09 · Copilot" text="Open the copilot when you want it. It does not take over the case until you click." />
    </AppChrome>
  );
};
