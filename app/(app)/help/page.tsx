const FAQS = [
  {
    q: 'What is a kinloom?',
    a: 'A kinloom is the smallest unit of a person\'s legacy — a meaningful piece of your life captured to be shared with your family and preserved across generations.',
  },
  {
    q: 'Who can see my kinlooms?',
    a: 'Only the family members you\'ve invited to your private family space. Kinloom is invite-only by design — nothing you create is public.',
  },
  {
    q: 'How does the AI Legacy Bank work?',
    a: 'The AI Legacy Bank lets family members ask questions about a person\'s stories, lessons, and beliefs. It responds only using what that person has actually captured in their kinlooms — no invented facts, no impersonation.',
  },
  {
    q: 'Can I edit or delete a kinloom after saving?',
    a: 'Yes. Open any kinloom from your library and use the edit or delete actions. Deleted kinlooms are removed permanently.',
  },
  {
    q: 'How do I invite family members?',
    a: 'Go to Family → Members and use the invite button. Invited members receive an email with a link to join your family space.',
  },
  {
    q: 'Can I export my kinlooms?',
    a: 'Yes. Visit Settings → Export & backup to download all your kinlooms as PDF or JSON.',
  },
];

export default function HelpPage() {
  return (
    <div style={{ padding: '48px', maxWidth: 720 }}>

      <div style={{ marginBottom: 48 }}>
        <p style={{ fontSize: 13, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#556b5b', margin: '0 0 12px' }}>
          Help
        </p>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 48, lineHeight: 1.1, margin: '0 0 16px', color: '#1a1a1a' }}>
          How can we help?
        </h1>
        <p style={{ fontSize: 18, lineHeight: 1.65, color: 'rgba(26,26,26,0.7)', margin: 0 }}>
          Answers to the most common questions about Kinloom.
        </p>
      </div>

      {/* FAQ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 64 }}>
        {FAQS.map((item, i) => (
          <div key={i} style={{ padding: '24px 0', borderBottom: '1px solid #d4d2cc' }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 20, margin: '0 0 10px', color: '#1a1a1a' }}>
              {item.q}
            </h3>
            <p style={{ fontSize: 15, lineHeight: 1.65, color: 'rgba(26,26,26,0.7)', margin: 0 }}>
              {item.a}
            </p>
          </div>
        ))}
      </div>

      {/* Contact */}
      <div style={{ background: 'rgba(85,107,91,0.05)', border: '1px solid rgba(85,107,91,0.15)', borderRadius: 12, padding: '32px 36px' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 24, margin: '0 0 8px', color: '#1a1a1a' }}>
          Still have questions?
        </h2>
        <p style={{ fontSize: 15, color: 'rgba(26,26,26,0.7)', margin: '0 0 20px' }}>
          Reach out and we'll get back to you.
        </p>
        <a href="mailto:hello@kinloom.com" style={{ display: 'inline-block', background: '#556b5b', color: '#fdfcfa', padding: '12px 24px', borderRadius: 8, fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
          Contact support
        </a>
      </div>

    </div>
  );
}
