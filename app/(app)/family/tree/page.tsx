'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MEMBERS, KINLOOMS, MEMBER_MAP, COUPLES, TREE_EDGES, type Member } from '../../../lib/mock-data';

// Layout positions for the Aldwin family tree
const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  eleanor: { x: 240, y: 70 },
  thomas:  { x: 380, y: 70 },
  ruth:    { x: 100, y: 210 },
  james:   { x: 260, y: 210 },
  mira:    { x: 390, y: 210 },
  sam:     { x: 170, y: 355 },
  you:     { x: 310, y: 355 },
  noor:    { x: 450, y: 355 },
  ivy:     { x: 260, y: 490 },
  theo:    { x: 380, y: 490 },
};

const CANVAS_W = 560;
const CANVAS_H = 570;
const R = 30;

function getParentMidpoint(childId: string): { x: number; y: number } | null {
  const parents = TREE_EDGES.filter(([, child]) => child === childId).map(([parent]) => parent);
  if (parents.length === 0) return null;
  const positions = parents.map(p => NODE_POSITIONS[p]).filter(Boolean);
  if (positions.length === 0) return null;
  const mx = positions.reduce((s, p) => s + p.x, 0) / positions.length;
  const my = positions.reduce((s, p) => s + p.y, 0) / positions.length;
  return { x: mx, y: my };
}

export default function FamilyTreePage() {
  const [focused, setFocused] = useState<string | null>(null);
  const focusedMember = focused ? MEMBER_MAP[focused] : null;
  const kinloomCount = focused ? KINLOOMS.filter(k => k.author === focused).length : 0;

  // Build couple lines
  const coupleLines = COUPLES.map(([a, b]) => {
    const pa = NODE_POSITIONS[a];
    const pb = NODE_POSITIONS[b];
    if (!pa || !pb) return null;
    return { id: `${a}-${b}`, x1: pa.x + R, y1: pa.y, x2: pb.x - R, y2: pb.y };
  }).filter(Boolean);

  // Build descent lines (parent midpoint → child)
  const descentLines: { id: string; px: number; py: number; cx: number; cy: number }[] = [];
  for (const m of MEMBERS) {
    const mid = getParentMidpoint(m.id);
    const pos = NODE_POSITIONS[m.id];
    if (!mid || !pos) continue;
    descentLines.push({ id: m.id, px: mid.x, py: mid.y, cx: pos.x, cy: pos.y });
  }

  return (
    <div style={{ padding: '48px' }}>

      <div style={{ borderBottom: '1px solid #d4d2cc', paddingBottom: 20, marginBottom: 40 }}>
        <Link href="/family" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'rgba(26,26,26,0.6)', textDecoration: 'none' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          Family
        </Link>
      </div>

      <p className="eyebrow" style={{ marginBottom: 12 }}>Family tree</p>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 42, lineHeight: 1.15, margin: '0 0 8px', color: '#1a1a1a' }}>
        The Aldwin family.
      </h1>
      <p style={{ fontSize: 15, color: 'rgba(26,26,26,0.6)', margin: '0 0 40px' }}>
        Four generations · {MEMBERS.length} members
      </p>

      <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start' }}>
        {/* Tree SVG */}
        <div style={{ background: '#fdfcfa', border: '1px solid #d4d2cc', borderRadius: 16, overflow: 'hidden', flexShrink: 0 }}>
          <svg
            viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
            width={CANVAS_W}
            height={CANVAS_H}
            style={{ display: 'block' }}
          >
            {/* Background subtle grid */}
            <defs>
              <pattern id="tree-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#d4d2cc" strokeWidth="0.4" opacity="0.4" />
              </pattern>
            </defs>
            <rect width={CANVAS_W} height={CANVAS_H} fill="url(#tree-grid)" />

            {/* Generation labels */}
            {[
              { y: 24,  label: 'Generation I' },
              { y: 164, label: 'Generation II' },
              { y: 308, label: 'Generation III' },
              { y: 444, label: 'Generation IV' },
            ].map(g => (
              <text key={g.y} x={CANVAS_W - 12} y={g.y} textAnchor="end"
                style={{ fontSize: 9, fill: 'rgba(26,26,26,0.25)', fontFamily: 'var(--font-sans)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {g.label}
              </text>
            ))}

            {/* Couple marriage lines */}
            {coupleLines.map(l => l && (
              <line key={l.id} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                stroke="#a39376" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
            ))}

            {/* Descent lines */}
            {descentLines.map(d => {
              const midY = (d.py + d.cy) / 2;
              return (
                <path key={d.id}
                  d={`M ${d.px} ${d.py + R} L ${d.px} ${midY} L ${d.cx} ${midY} L ${d.cx} ${d.cy - R}`}
                  fill="none" stroke="#c8c4bb" strokeWidth="1.2" />
              );
            })}

            {/* Nodes */}
            {MEMBERS.map(m => {
              const pos = NODE_POSITIONS[m.id];
              if (!pos) return null;
              const isFocused = focused === m.id;
              const tone = m.tone;
              const bg = tone + '28';

              return (
                <g key={m.id} onClick={() => setFocused(isFocused ? null : m.id)} style={{ cursor: 'pointer' }}>
                  {/* Outer ring when focused */}
                  {isFocused && (
                    <circle cx={pos.x} cy={pos.y} r={R + 5} fill="none" stroke="#556b5b" strokeWidth="1.5" opacity="0.6" />
                  )}
                  {/* Node circle */}
                  <circle cx={pos.x} cy={pos.y} r={R} fill={bg} stroke={isFocused ? '#556b5b' : tone} strokeWidth={isFocused ? 1.5 : 1} opacity={m.deceased ? 0.55 : 1} />
                  {/* Deceased indicator */}
                  {m.deceased && (
                    <circle cx={pos.x} cy={pos.y} r={R} fill="none" stroke={tone} strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
                  )}
                  {/* Initials */}
                  <text x={pos.x} y={pos.y + 5} textAnchor="middle" dominantBaseline="middle"
                    style={{ fontSize: 13, fontWeight: 500, fill: tone, fontFamily: 'var(--font-sans)', opacity: m.deceased ? 0.7 : 1 }}>
                    {m.initials}
                  </text>
                  {/* Name label below */}
                  <text x={pos.x} y={pos.y + R + 14} textAnchor="middle"
                    style={{ fontSize: 10, fill: isFocused ? '#556b5b' : 'rgba(26,26,26,0.65)', fontFamily: 'var(--font-sans)', fontWeight: isFocused ? 500 : 400 }}>
                    {m.name.split(' ')[0]}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Detail panel */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {focusedMember ? (
            <div style={{ background: '#fff', border: '1px solid #d4d2cc', borderRadius: 12, padding: 28 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 28, margin: '0 0 4px', color: '#1a1a1a' }}>
                    {focusedMember.name}
                  </h2>
                  <p style={{ margin: 0, fontSize: 14, color: 'rgba(26,26,26,0.55)' }}>{focusedMember.role}</p>
                </div>
                <button
                  onClick={() => setFocused(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(26,26,26,0.4)', padding: 4 }}
                  aria-label="Close"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                <div style={{ flex: 1, background: '#f5f4f1', borderRadius: 8, padding: '12px 16px' }}>
                  <p style={{ margin: '0 0 2px', fontSize: 22, fontFamily: 'var(--font-serif)', color: '#1a1a1a' }}>{focusedMember.born}</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'rgba(26,26,26,0.5)' }}>Year born</p>
                </div>
                <div style={{ flex: 1, background: '#f5f4f1', borderRadius: 8, padding: '12px 16px' }}>
                  <p style={{ margin: '0 0 2px', fontSize: 22, fontFamily: 'var(--font-serif)', color: kinloomCount > 0 ? '#556b5b' : '#1a1a1a' }}>
                    {kinloomCount}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: 'rgba(26,26,26,0.5)' }}>Kinlooms</p>
                </div>
                <div style={{ flex: 1, background: '#f5f4f1', borderRadius: 8, padding: '12px 16px' }}>
                  <p style={{ margin: '0 0 2px', fontSize: 22, fontFamily: 'var(--font-serif)', color: '#1a1a1a' }}>
                    {`G${focusedMember.gen}`}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: 'rgba(26,26,26,0.5)' }}>Generation</p>
                </div>
              </div>

              {focusedMember.deceased && (
                <div style={{ background: 'rgba(163,147,118,0.12)', border: '1px solid rgba(163,147,118,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                  <p style={{ margin: 0, fontSize: 13, color: 'rgba(26,26,26,0.65)', fontStyle: 'italic' }}>
                    Passed · Their kinlooms remain in the family library.
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {kinloomCount > 0 && (
                  <Link href={`/library`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#556b5b', color: '#fdfcfa', padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
                    View their kinlooms
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M6 12 L10 8 L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </Link>
                )}
                {kinloomCount > 0 && (
                  <Link href={`/legacy-bank`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', color: '#556b5b', border: '1px solid rgba(85,107,91,0.35)', padding: '9px 16px', borderRadius: 8, fontSize: 13, textDecoration: 'none' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" /></svg>
                    Ask their legacy
                  </Link>
                )}
                {!focusedMember.isMe && (
                  <Link href="/create" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', color: 'rgba(26,26,26,0.6)', border: '1px solid #d4d2cc', padding: '9px 16px', borderRadius: 8, fontSize: 13, textDecoration: 'none' }}>
                    Write to them
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div style={{ background: 'rgba(245,244,241,0.60)', border: '1px solid #d4d2cc', borderRadius: 12, padding: '32px 28px', textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'rgba(26,26,26,0.45)', margin: '0 0 8px' }}>
                Select a family member
              </p>
              <p style={{ fontSize: 14, color: 'rgba(26,26,26,0.4)', margin: 0 }}>
                Click any node in the tree to see their details.
              </p>
            </div>
          )}

          {/* Legend */}
          <div style={{ marginTop: 20, padding: '16px 20px', background: '#fff', border: '1px solid #d4d2cc', borderRadius: 10 }}>
            <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(26,26,26,0.4)' }}>Legend</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="24" height="12"><line x1="0" y1="6" x2="24" y2="6" stroke="#a39376" strokeWidth="1.5" strokeDasharray="3 3" /></svg>
                <span style={{ fontSize: 12, color: 'rgba(26,26,26,0.6)' }}>Partner</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="24" height="12"><line x1="0" y1="6" x2="24" y2="6" stroke="#c8c4bb" strokeWidth="1.2" /></svg>
                <span style={{ fontSize: 12, color: 'rgba(26,26,26,0.6)' }}>Parent–child</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="16" height="16"><circle cx="8" cy="8" r="7" fill="none" stroke="#a39376" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" /></svg>
                <span style={{ fontSize: 12, color: 'rgba(26,26,26,0.6)' }}>Passed</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
