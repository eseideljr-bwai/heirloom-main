const NOTIFICATION_ITEMS = [
  { label: 'Family activity',          description: 'When a family member creates or shares a kinloom.' },
  { label: 'New family members',       description: 'When someone joins your family space.' },
  { label: 'Reminders to create',      description: 'Periodic prompts to capture something new.' },
  { label: 'AI Legacy Bank responses', description: 'When a response is generated in the Legacy Bank.' },
];

export default function NotificationsPage() {
  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 36, lineHeight: 1.2, margin: '0 0 8px', color: '#1a1a1a' }}>Notifications</h1>
      <p style={{ fontSize: 15, color: 'rgba(26,26,26,0.65)', margin: '0 0 32px' }}>Choose what you want to be notified about.</p>

      <div style={{ background: '#fff', border: '1px solid #d4d2cc', borderRadius: 12, overflow: 'hidden' }}>
        {NOTIFICATION_ITEMS.map((item, i) => (
          <div
            key={item.label}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: i < NOTIFICATION_ITEMS.length - 1 ? '1px solid #d4d2cc' : 'none' }}
          >
            <div>
              <p style={{ fontSize: 15, color: '#1a1a1a', margin: '0 0 3px', fontWeight: 500 }}>{item.label}</p>
              <p style={{ fontSize: 13, color: 'rgba(26,26,26,0.6)', margin: 0 }}>{item.description}</p>
            </div>
            {/* Toggle placeholder */}
            <div style={{ width: 44, height: 24, borderRadius: 9999, background: '#556b5b', flexShrink: 0, cursor: 'pointer', position: 'relative' }}>
              <div style={{ position: 'absolute', right: 2, top: 2, width: 20, height: 20, borderRadius: 9999, background: '#fdfcfa' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
