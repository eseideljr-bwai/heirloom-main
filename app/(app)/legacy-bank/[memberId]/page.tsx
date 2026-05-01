'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MEMBER_MAP, KINLOOMS, type Member } from '../../../lib/mock-data';
import { KINLOOM_TYPE_MAP } from '../../../lib/kinloom-types';

type Message = { role: 'user' | 'assistant'; text: string; source?: string };

function Silhouette({ member, size = 48 }: { member: Member; size?: number }) {
  const { gender = 'n', tone = '#a39376' } = member;
  const bg = tone + '22';
  return (
    <svg viewBox="0 0 80 80" width={size} height={size} aria-label={member.name} style={{ display: 'block', borderRadius: '50%', flexShrink: 0 }}>
      <defs><clipPath id={`clip-lbc-${member.id}`}><circle cx="40" cy="40" r="40" /></clipPath></defs>
      <g clipPath={`url(#clip-lbc-${member.id})`}>
        <rect width="80" height="80" fill={bg} />
        <rect y="48" width="80" height="32" fill={tone} opacity="0.10" />
        {gender === 'f' && <ellipse cx="40" cy="34" rx="16" ry="18" fill={tone} opacity="0.38" />}
        <path d="M 8 80 C 8 60, 22 52, 40 52 C 58 52, 72 60, 72 80 Z" fill={tone} opacity="0.55" />
        <ellipse cx="40" cy="32" rx="12" ry={gender === 'f' ? 11 : 10} fill={tone} opacity="0.78" />
        {gender === 'm' && <path d="M 28 28 Q 40 16, 52 28 L 52 32 Q 40 26, 28 32 Z" fill={tone} opacity="0.55" />}
        {gender === 'f' && <path d="M 28 30 Q 28 18, 40 16 Q 52 18, 52 30 L 52 38 Q 50 30, 40 30 Q 30 30, 28 38 Z" fill={tone} opacity="0.45" />}
        <ellipse cx="34" cy="34" rx="3" ry="4" fill="#fff" opacity="0.10" />
      </g>
    </svg>
  );
}

// Listening orb — pulsing AI presence indicator
function ListeningOrb({ active = false }: { active?: boolean }) {
  return (
    <div style={{ position: 'relative', width: 32, height: 32, flexShrink: 0 }}>
      <svg viewBox="0 0 32 32" width="32" height="32" style={{ display: 'block' }}>
        <defs>
          <radialGradient id="orb-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#c9a96e" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#556b5b" stopOpacity="0.5" />
          </radialGradient>
        </defs>
        {active && <circle cx="16" cy="16" r="14" fill="none" stroke="#556b5b" strokeWidth="0.8" opacity="0.3" />}
        <circle cx="16" cy="16" r="9" fill="url(#orb-grad)" opacity="0.85" />
        <circle cx="16" cy="16" r="4" fill="#fdfcfa" opacity="0.7" />
      </svg>
    </div>
  );
}

function getSuggestedQuestions(member: Member): string[] {
  const kinlooms = KINLOOMS.filter(k => k.author === member.id);
  const typeList = kinlooms.map(k => {
    const t = KINLOOM_TYPE_MAP[k.type];
    return t?.label.toLowerCase();
  }).filter(Boolean) as string[];
  const types = typeList.filter((v, i, a) => a.indexOf(v) === i);

  const questions: string[] = [];
  if (types.includes('story')) questions.push(`What's a story from ${member.name.split(' ')[0]}'s life that shaped them?`);
  if (types.includes('lesson')) questions.push(`What life lessons did ${member.name.split(' ')[0]} most want to pass on?`);
  if (types.includes('belief')) questions.push(`What did ${member.name.split(' ')[0]} believe was most worth holding onto?`);
  if (types.includes('message')) questions.push(`What did ${member.name.split(' ')[0]} want their family to remember?`);
  if (types.includes('tradition')) questions.push(`What family traditions did ${member.name.split(' ')[0]} want to preserve?`);
  if (questions.length < 2) questions.push(`What did ${member.name.split(' ')[0]} find most meaningful?`);
  return questions.slice(0, 3);
}

function buildSeedMessages(member: Member): Message[] {
  const kinlooms = KINLOOMS.filter(k => k.author === member.id);
  if (kinlooms.length === 0) return [];
  const firstName = member.name.split(' ')[0];
  const firstKinloom = kinlooms[0];
  const typeLabel = KINLOOM_TYPE_MAP[firstKinloom.type]?.label?.toLowerCase() || 'kinloom';
  return [
    { role: 'user', text: `What matters most to ${firstName}?` },
    {
      role: 'assistant',
      text: `Based on their ${typeLabel}, "${firstKinloom.title}", ${firstName} seems to value ${firstKinloom.excerpt.split('.')[0].toLowerCase()}.`,
      source: `"${firstKinloom.title}"`,
    },
  ];
}

export default function LegacyBankChatPage({ params }: { params: { memberId: string } }) {
  const member = MEMBER_MAP[params.memberId];
  const memberKinlooms = member ? KINLOOMS.filter(k => k.author === member.id) : [];
  const [messages, setMessages] = useState<Message[]>(() => member ? buildSeedMessages(member) : []);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  if (!member) {
    return (
      <div style={{ padding: '48px' }}>
        <Link href="/legacy-bank" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'rgba(26,26,26,0.6)', textDecoration: 'none', marginBottom: 24 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          AI Legacy Bank
        </Link>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'rgba(26,26,26,0.5)' }}>Family member not found.</p>
      </div>
    );
  }

  const suggestedQuestions = getSuggestedQuestions(member);

  const handleSend = async (text?: string) => {
    const q = (text || input).trim();
    if (!q) return;
    setInput('');
    setSending(true);
    setMessages(prev => [...prev, { role: 'user', text: q }]);

    // Simulate a thoughtful response based on their kinlooms
    await new Promise(r => setTimeout(r, 900));
    const kinloom = memberKinlooms[Math.floor(Math.random() * Math.max(1, memberKinlooms.length))];
    const resp: Message = kinloom
      ? {
          role: 'assistant',
          text: `Based on what ${member.name.split(' ')[0]} kept, they believed: "${kinloom.excerpt.split('.')[0]}." This comes through clearly in the kinlooms they chose to preserve.`,
          source: `"${kinloom.title}" · ${kinloom.date}`,
        }
      : {
          role: 'assistant',
          text: `${member.name.split(' ')[0]} hasn't deposited any kinlooms yet. Once they do, you'll be able to ask questions about their life, beliefs, and stories here.`,
        };
    setMessages(prev => [...prev, resp]);
    setSending(false);
  };

  const handleFormSend = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend();
  };

  const firstName = member.name.split(' ')[0];

  return (
    <div style={{ padding: '48px 48px 0', maxWidth: 760, display: 'flex', flexDirection: 'column', height: '100vh' }}>

      {/* Back */}
      <div style={{ borderBottom: '1px solid #d4d2cc', paddingBottom: 20, marginBottom: 32, flexShrink: 0 }}>
        <Link href="/legacy-bank" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'rgba(26,26,26,0.6)', textDecoration: 'none' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          AI Legacy Bank
        </Link>
      </div>

      {/* Member header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, flexShrink: 0 }}>
        <Silhouette member={member} size={52} />
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 30, margin: '0 0 2px', color: '#1a1a1a' }}>
            {member.name}&apos;s Legacy
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(26,26,26,0.5)' }}>
            {member.role}{member.deceased ? ' · Passed' : ''} · {memberKinlooms.length} kinloom{memberKinlooms.length !== 1 ? 's' : ''} deposited
          </p>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <ListeningOrb active={sending} />
        </div>
      </div>

      {/* Kinloom source tags */}
      {memberKinlooms.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: 'rgba(26,26,26,0.45)', alignSelf: 'center' }}>Responding from:</span>
          {memberKinlooms.map(k => (
            <Link key={k.id} href={`/library/${k.id}`} style={{ display: 'inline-block', padding: '3px 10px', background: 'rgba(85,107,91,0.08)', border: '1px solid rgba(85,107,91,0.18)', borderRadius: 9999, fontSize: 11, color: '#556b5b', textDecoration: 'none' }}>
              {k.title}
            </Link>
          ))}
        </div>
      )}

      {/* Chat thread */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
        {messages.length === 0 && (
          <div style={{ background: 'rgba(85,107,91,0.04)', border: '1px solid rgba(85,107,91,0.15)', borderRadius: 12, padding: '24px 28px', textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'rgba(26,26,26,0.6)', margin: '0 0 6px' }}>
              Ask {firstName} anything.
            </p>
            <p style={{ fontSize: 14, color: 'rgba(26,26,26,0.45)', margin: 0 }}>
              Responses are grounded in what they chose to keep.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i}>
            {msg.role === 'user' ? (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ background: '#556b5b', color: '#fdfcfa', borderRadius: '12px 12px 2px 12px', padding: '12px 16px', maxWidth: '72%' }}>
                  <p style={{ fontSize: 15, margin: 0, lineHeight: 1.55 }}>{msg.text}</p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <ListeningOrb active={false} />
                <div style={{ flex: 1 }}>
                  <div style={{ background: '#fff', border: '1px solid #d4d2cc', borderRadius: '2px 12px 12px 12px', padding: '14px 16px' }}>
                    <p style={{ fontSize: 15, lineHeight: 1.7, color: '#1a1a1a', margin: '0 0 10px' }}>{msg.text}</p>
                    {msg.source && (
                      <p style={{ fontSize: 11, color: '#556b5b', margin: 0, fontStyle: 'italic' }}>
                        Source: {msg.source}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {sending && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <ListeningOrb active={true} />
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '10px 0' }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(85,107,91,0.4)' }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Suggested questions */}
      {messages.length <= 2 && suggestedQuestions.length > 0 && (
        <div style={{ flexShrink: 0, marginBottom: 12 }}>
          <p style={{ fontSize: 12, color: 'rgba(26,26,26,0.4)', margin: '0 0 8px' }}>Suggested questions</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {suggestedQuestions.map((q, i) => (
              <button key={i}
                onClick={() => handleSend(q)}
                style={{ background: '#f5f4f1', border: '1px solid #d4d2cc', borderRadius: 9999, padding: '6px 14px', fontSize: 13, color: 'rgba(26,26,26,0.7)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div style={{ flexShrink: 0, paddingBottom: 32 }}>
        <form onSubmit={handleFormSend} style={{ display: 'flex', gap: 10 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={`Ask ${firstName} something…`}
            disabled={sending}
            style={{ flex: 1, padding: '12px 16px', background: '#fff', border: '1px solid #d4d2cc', borderRadius: 8, fontSize: 15, fontFamily: 'inherit', outline: 'none' }}
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            style={{ background: '#556b5b', color: '#fdfcfa', border: 'none', padding: '12px 22px', borderRadius: 8, fontSize: 14, fontWeight: 500, fontFamily: 'inherit', cursor: sending ? 'wait' : 'pointer', flexShrink: 0, opacity: (!input.trim() && !sending) ? 0.5 : 1 }}
          >
            Ask
          </button>
        </form>
        <p style={{ fontSize: 11, color: 'rgba(26,26,26,0.35)', margin: '8px 0 0', textAlign: 'center' }}>
          Responses are grounded in stored kinloom content only — no invented facts, no impersonation.
        </p>
      </div>

    </div>
  );
}
