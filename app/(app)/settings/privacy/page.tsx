const PRIVACY_ITEMS = [
  { label: 'Profile visibility',         description: 'Who can see your name and profile in the family space.',  options: ['Family only', 'Invite only'] },
  { label: 'Kinloom visibility',         description: 'Who can read the kinlooms you create.',                   options: ['Family only', 'Private'] },
  { label: 'AI Legacy Bank access',      description: 'Who can ask the AI Legacy Bank questions about you.',     options: ['Family only', 'No one'] },
];

export default function PrivacyPage() {
  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 36, lineHeight: 1.2, margin: '0 0 8px', color: '#1a1a1a' }}>Privacy & permissions</h1>
      <p style={{ fontSize: 15, color: 'rgba(26,26,26,0.65)', margin: '0 0 32px' }}>Control how your content and profile are shared within your family space.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {PRIVACY_ITEMS.map(item => (
          <div key={item.label} style={{ background: '#fff', border: '1px solid #d4d2cc', borderRadius: 12, padding: '22px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
              <div>
                <p style={{ fontSize: 15, color: '#1a1a1a', margin: '0 0 4px', fontWeight: 500 }}>{item.label}</p>
                <p style={{ fontSize: 13, color: 'rgba(26,26,26,0.6)', margin: 0 }}>{item.description}</p>
              </div>
              <select style={{ background: '#f5f4f1', border: '1px solid transparent', borderRadius: 8, padding: '8px 12px', fontSize: 14, fontFamily: 'inherit', cursor: 'pointer', flexShrink: 0, outline: 'none' }}>
                {item.options.map(opt => <option key={opt}>{opt}</option>)}
              </select>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, padding: '16px 20px', background: 'rgba(85,107,91,0.05)', border: '1px solid rgba(85,107,91,0.15)', borderRadius: 8 }}>
        <p style={{ fontSize: 13, color: 'rgba(26,26,26,0.7)', margin: 0, fontStyle: 'italic' }}>
          Kinloom is private by design. Your content is never shared publicly and is never used to train AI models.
        </p>
      </div>
    </div>
  );
}
