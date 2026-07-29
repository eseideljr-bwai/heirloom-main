'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth-context';
import { useActiveFamilySpace } from '../../../lib/active-family-space';
import { onboardingFirstKinloom } from '../../../lib/kinloom';
import { ApiError } from '../../../lib/api';

export default function OnboardingFirstKinloom() {
  const router = useRouter();
  const { refresh } = useAuth();
  const { activeSpaceId: familySpaceId } = useActiveFamilySpace();

  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familySpaceId) {
      setError('No family space found. Please finish setting up your profile first.');
      return;
    }
    if (!content.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onboardingFirstKinloom(familySpaceId, { body: content.trim() });
      await refresh();
      router.push('/home');
    } catch (err) {
      const msg = err instanceof ApiError ? (err.firstFieldError() || err.message) : 'Could not save your kinloom.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 640, margin: '64px auto', padding: '0 32px' }}>
      <p style={{ fontSize: 13, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#556b5b', margin: '0 0 16px' }}>
        Your first kinloom
      </p>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 40, lineHeight: 1.15, margin: '0 0 8px', color: '#1a1a1a' }}>
        Capture something worth preserving.
      </h1>
      <p style={{ fontSize: 16, lineHeight: 1.65, color: 'rgba(26,26,26,0.7)', margin: '0 0 40px' }}>
        Start with a story. You can always create more later.
      </p>

      <div style={{ background: '#fff', border: '1px solid #d4d2cc', borderRadius: 16, padding: 32, boxShadow: '0 4px 12px -2px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'inline-block', background: 'rgba(85,107,91,0.10)', color: '#556b5b', borderRadius: 9999, padding: '4px 12px', fontSize: 13, fontWeight: 500, marginBottom: 24 }}>
          Story
        </div>

        <div className="prompt-block" style={{ marginBottom: 24 }}>
          <p>&ldquo;What story from your childhood still shapes who you are?&rdquo;</p>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Write your story here…"
            rows={8}
            maxLength={65000}
            style={{ width: '100%', padding: '14px', background: '#f5f4f1', border: '1px solid transparent', borderRadius: 8, fontSize: 15, fontFamily: 'inherit', lineHeight: 1.65, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
          />
          {error && <p className="create-banner create-banner--error" style={{ margin: 0 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="submit"
              disabled={saving || !content.trim()}
              className="btn-disabled-soft"
              style={{ background: '#556b5b', color: '#fdfcfa', border: 'none', padding: '12px 28px', borderRadius: 8, fontSize: 15, fontWeight: 500, fontFamily: 'inherit', cursor: (saving || !content.trim()) ? 'not-allowed' : 'pointer' }}
            >
              {saving ? 'Saving…' : 'Save kinloom'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/home')}
              disabled={saving}
              style={{ background: 'transparent', color: 'rgba(26,26,26,0.6)', border: '1px solid #d4d2cc', padding: '12px 28px', borderRadius: 8, fontSize: 15, fontFamily: 'inherit', cursor: saving ? 'not-allowed' : 'pointer' }}
            >
              Skip for now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
