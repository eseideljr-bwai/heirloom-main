export default function SettingsPage() {
  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 36, lineHeight: 1.2, margin: '0 0 32px', color: '#1a1a1a' }}>
        Account
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        <div style={{ background: '#fff', border: '1px solid #d4d2cc', borderRadius: 12, padding: 28 }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 20, margin: '0 0 20px', color: '#1a1a1a' }}>Profile</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'rgba(26,26,26,0.6)', marginBottom: 4 }}>Display name</label>
              <input placeholder="Your name" style={{ width: '100%', padding: '10px 14px', background: '#f5f4f1', border: '1px solid transparent', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'rgba(26,26,26,0.6)', marginBottom: 4 }}>Email address</label>
              <input type="email" disabled style={{ width: '100%', padding: '10px 14px', background: '#f5f4f1', border: '1px solid transparent', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', color: 'rgba(26,26,26,0.5)', boxSizing: 'border-box' }} />
            </div>
            <button style={{ alignSelf: 'flex-start', background: '#556b5b', color: '#fdfcfa', border: 'none', padding: '10px 22px', borderRadius: 8, fontSize: 14, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' }}>
              Save changes
            </button>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #d4d2cc', borderRadius: 12, padding: 28 }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 20, margin: '0 0 8px', color: '#1a1a1a' }}>Password</h2>
          <p style={{ fontSize: 14, color: 'rgba(26,26,26,0.65)', margin: '0 0 20px' }}>Change your account password.</p>
          <button style={{ background: 'transparent', color: '#1a1a1a', border: '1px solid #d4d2cc', padding: '10px 22px', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}>
            Change password
          </button>
        </div>

        <div style={{ background: '#fff', border: '1px solid rgba(212,24,61,0.20)', borderRadius: 12, padding: 28 }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 20, margin: '0 0 8px', color: '#1a1a1a' }}>Delete account</h2>
          <p style={{ fontSize: 14, color: 'rgba(26,26,26,0.65)', margin: '0 0 20px' }}>Permanently delete your account and all your kinlooms. This cannot be undone.</p>
          <button style={{ background: 'transparent', color: '#d4183d', border: '1px solid rgba(212,24,61,0.30)', padding: '10px 22px', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}>
            Delete account
          </button>
        </div>

      </div>
    </div>
  );
}
