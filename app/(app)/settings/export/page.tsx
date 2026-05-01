export default function ExportPage() {
  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 36, lineHeight: 1.2, margin: '0 0 8px', color: '#1a1a1a' }}>Export & backup</h1>
      <p style={{ fontSize: 15, color: 'rgba(26,26,26,0.65)', margin: '0 0 32px' }}>Your kinlooms belong to you. Export or download them at any time.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        <div style={{ background: '#fff', border: '1px solid #d4d2cc', borderRadius: 12, padding: '24px 28px' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 22, margin: '0 0 8px', color: '#1a1a1a' }}>Export all kinlooms</h2>
          <p style={{ fontSize: 14, color: 'rgba(26,26,26,0.65)', margin: '0 0 20px' }}>
            Download all your kinlooms as a single archive. Includes full text and metadata.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={{ background: '#556b5b', color: '#fdfcfa', border: 'none', padding: '10px 22px', borderRadius: 8, fontSize: 14, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' }}>
              Export as PDF
            </button>
            <button style={{ background: 'transparent', color: '#1a1a1a', border: '1px solid #d4d2cc', padding: '10px 22px', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}>
              Export as JSON
            </button>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #d4d2cc', borderRadius: 12, padding: '24px 28px' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 22, margin: '0 0 8px', color: '#1a1a1a' }}>Automatic backups</h2>
          <p style={{ fontSize: 14, color: 'rgba(26,26,26,0.65)', margin: '0 0 20px' }}>
            Schedule automatic exports sent to your email.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            {['Weekly', 'Monthly', 'Off'].map((opt, i) => (
              <button key={opt} style={{ padding: '8px 18px', borderRadius: 9999, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', background: i === 2 ? '#556b5b' : '#f5f4f1', color: i === 2 ? '#fdfcfa' : 'rgba(26,26,26,0.7)', border: 'none' }}>
                {opt}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
