import Link from 'next/link';
import { KINLOOM_TYPES } from '../../lib/kinloom-types';

export default function CreatePage() {
  return (
    <div style={{ padding: '48px' }}>

      <div style={{ marginBottom: 48 }}>
        <p className="eyebrow" style={{ marginBottom: 12 }}>Create</p>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 48, lineHeight: 1.1, margin: '0 0 16px', color: '#1a1a1a' }}>
          What would you like to capture?
        </h1>
        <p style={{ fontSize: 18, lineHeight: 1.65, color: 'rgba(26,26,26,0.7)', margin: 0, maxWidth: 560 }}>
          Each kinloom is designed to capture a different aspect of your life and wisdom.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
        {KINLOOM_TYPES.map(type => (
          <Link
            key={type.slug}
            href={`/create/${type.slug}`}
            style={{ display: 'flex', flexDirection: 'column', background: '#fff', border: '1px solid #d4d2cc', borderRadius: 12, padding: '28px', textDecoration: 'none' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 500, background: 'rgba(85,107,91,0.10)', color: '#556b5b' }}>
                {type.label}
              </span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: 'rgba(26,26,26,0.25)', marginTop: 2, flexShrink: 0 }}>
                <path d="M6 12 L10 8 L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p style={{ fontSize: 16, color: 'rgba(26,26,26,0.75)', margin: '0 0 14px', lineHeight: 1.55, flex: 1 }}>
              {type.definition}
            </p>
            <p style={{ fontSize: 14, lineHeight: 1.6, fontStyle: 'italic', color: 'rgba(26,26,26,0.5)', margin: 0, borderTop: '1px solid #e8e6e1', paddingTop: 14 }}>
              &ldquo;{type.prompt}&rdquo;
            </p>
          </Link>
        ))}
      </div>

    </div>
  );
}
