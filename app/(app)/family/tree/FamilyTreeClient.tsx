'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { FamilyTreeNode } from '../../../../lib/server/queries';

type Props = {
  nodes: FamilyTreeNode[];
  parentEdges: [string, string][];
  coupleEdges: [string, string][];
};

const CANVAS_W = 720;
const ROW_H = 140;
const R = 30;

/**
 * Lay nodes out by generation (or by parent depth if generation isn't
 * provided). Within each row, distribute evenly across the width.
 */
function layoutPositions(nodes: FamilyTreeNode[], parentEdges: [string, string][]) {
  // Generation map. Fallback: BFS depth from roots (members with no parents).
  const gen = new Map<string, number>();
  const fromApi = nodes.every(n => n.generation != null);
  if (fromApi) {
    for (const n of nodes) gen.set(n.member_id, Number(n.generation));
  } else {
    const parentsOf = new Map<string, string[]>();
    for (const [p, c] of parentEdges) {
      if (!parentsOf.has(c)) parentsOf.set(c, []);
      parentsOf.get(c)!.push(p);
    }
    const depthCache = new Map<string, number>();
    const depth = (id: string, seen = new Set<string>()): number => {
      if (depthCache.has(id)) return depthCache.get(id)!;
      if (seen.has(id)) return 0;
      seen.add(id);
      const ps = parentsOf.get(id) || [];
      if (ps.length === 0) return 0;
      const d = 1 + Math.max(...ps.map(p => depth(p, seen)));
      depthCache.set(id, d);
      return d;
    };
    for (const n of nodes) gen.set(n.member_id, depth(n.member_id));
  }

  const rows = new Map<number, FamilyTreeNode[]>();
  for (const n of nodes) {
    const g = gen.get(n.member_id) ?? 0;
    if (!rows.has(g)) rows.set(g, []);
    rows.get(g)!.push(n);
  }

  const sortedGens = Array.from(rows.keys()).sort((a, b) => a - b);
  const positions = new Map<string, { x: number; y: number }>();
  sortedGens.forEach((g, rowIdx) => {
    const row = rows.get(g)!;
    const slotW = CANVAS_W / (row.length + 1);
    row.forEach((n, i) => {
      positions.set(n.member_id, {
        x: slotW * (i + 1),
        y: 70 + rowIdx * ROW_H,
      });
    });
  });

  return { positions, generations: sortedGens.length };
}

export default function FamilyTreeClient({ nodes, parentEdges, coupleEdges }: Props) {
  const [focused, setFocused] = useState<string | null>(null);
  const { positions, generations } = useMemo(
    () => layoutPositions(nodes, parentEdges),
    [nodes, parentEdges],
  );
  const canvasH = Math.max(300, 70 + generations * ROW_H + 60);
  const focusedNode = focused ? nodes.find(n => n.member_id === focused) ?? null : null;

  const coupleLines = coupleEdges
    .map(([a, b]) => {
      const pa = positions.get(a);
      const pb = positions.get(b);
      if (!pa || !pb) return null;
      return { id: `${a}-${b}`, x1: Math.min(pa.x, pb.x) + R, y1: pa.y, x2: Math.max(pa.x, pb.x) - R, y2: pb.y };
    })
    .filter(Boolean) as { id: string; x1: number; y1: number; x2: number; y2: number }[];

  const descent = parentEdges.flatMap(([parent, child]) => {
    const pp = positions.get(parent);
    const pc = positions.get(child);
    if (!pp || !pc) return [];
    const midY = (pp.y + pc.y) / 2;
    return [{
      id: `${parent}->${child}`,
      d: `M ${pp.x} ${pp.y + R} L ${pp.x} ${midY} L ${pc.x} ${midY} L ${pc.x} ${pc.y - R}`,
    }];
  });

  return (
    <div className="tree-layout">
      <div className="tree-canvas">
        <svg viewBox={`0 0 ${CANVAS_W} ${canvasH}`}>
          <defs>
            <pattern id="tree-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#d4d2cc" strokeWidth="0.4" opacity="0.4" />
            </pattern>
          </defs>
          <rect width={CANVAS_W} height={canvasH} fill="url(#tree-grid)" />

          {coupleLines.map(l => (
            <line key={l.id} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
              stroke="#a39376" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
          ))}

          {descent.map(d => (
            <path key={d.id} d={d.d} fill="none" stroke="#c8c4bb" strokeWidth="1.2" />
          ))}

          {nodes.map(n => {
            const pos = positions.get(n.member_id);
            if (!pos) return null;
            const isFocused = focused === n.member_id;
            const tone = n.tone || '#a39376';
            const bg = tone + '28';
            const initials = n.name?.split(' ').map(s => s[0]).slice(0, 2).join('') ?? '?';
            return (
              <g key={n.member_id} onClick={() => setFocused(isFocused ? null : n.member_id)} className="tree-node">
                {isFocused && (
                  <circle cx={pos.x} cy={pos.y} r={R + 5} fill="none" stroke="#556b5b" strokeWidth="1.5" opacity="0.6" />
                )}
                <circle cx={pos.x} cy={pos.y} r={R} fill={bg} stroke={isFocused ? '#556b5b' : tone} strokeWidth={isFocused ? 1.5 : 1} opacity={n.deceased ? 0.55 : 1} />
                {n.deceased && (
                  <circle cx={pos.x} cy={pos.y} r={R} fill="none" stroke={tone} strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
                )}
                <text x={pos.x} y={pos.y + 5} textAnchor="middle" dominantBaseline="middle" className="tree-node__initials" fill={tone}>
                  {initials}
                </text>
                <text x={pos.x} y={pos.y + R + 14} textAnchor="middle" className={`tree-node__label${isFocused ? ' is-focused' : ''}`}>
                  {n.name?.split(' ')[0]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <aside className="tree-side">
        {focusedNode ? (
          <div className="tree-detail">
            <div className="tree-detail__head">
              <div>
                <h2 className="tree-detail__name">{focusedNode.name}</h2>
                <p className="tree-detail__role">{focusedNode.role_label || ''}</p>
              </div>
              <button onClick={() => setFocused(null)} className="tree-detail__close" aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="tree-detail__actions">
              <Link href={`/family/${focusedNode.member_id}`} className="btn-primary btn-primary--sm">View profile</Link>
              <Link href={`/legacy-bank/${focusedNode.member_id}`} className="btn-outline btn-outline--sm">
                Ask their legacy
              </Link>
            </div>
            {focusedNode.deceased && (
              <p className="tree-detail__passed">Passed · Their kinlooms remain in the family library.</p>
            )}
          </div>
        ) : (
          <div className="tree-side__empty">
            <p className="tree-side__title">Select a family member</p>
            <p className="tree-side__sub">Click any node in the tree to see their details.</p>
          </div>
        )}

        <div className="tree-legend">
          <p className="tree-legend__heading">Legend</p>
          <div className="tree-legend__rows">
            <div className="tree-legend__row">
              <svg width="24" height="12"><line x1="0" y1="6" x2="24" y2="6" stroke="#a39376" strokeWidth="1.5" strokeDasharray="3 3" /></svg>
              <span>Partner</span>
            </div>
            <div className="tree-legend__row">
              <svg width="24" height="12"><line x1="0" y1="6" x2="24" y2="6" stroke="#c8c4bb" strokeWidth="1.2" /></svg>
              <span>Parent–child</span>
            </div>
            <div className="tree-legend__row">
              <svg width="16" height="16"><circle cx="8" cy="8" r="7" fill="none" stroke="#a39376" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" /></svg>
              <span>Passed</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
