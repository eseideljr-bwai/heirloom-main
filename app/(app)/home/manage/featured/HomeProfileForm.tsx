'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../../lib/auth-context';
import { updateHome, type Home, type HomeUpdateBody } from '../../../../../lib/home-manage';
import { errorText } from '../../../../../lib/settings';
import { revalidateFamilyData } from '../../../../actions';

type Saved = Pick<Home, 'name' | 'motto' | 'description' | 'established_year'>;

/**
 * The Home's profile: name, motto, description and year established, as Home
 * shows them. Owner and co-owner only (`viewer.can_edit`); the page doesn't
 * render this for anyone else. The avatar waits on the API.
 */
export default function HomeProfileForm({ homeId, initial }: { homeId: string; initial: Saved }) {
  const { refresh: refreshAuth } = useAuth();
  const router = useRouter();

  // `saved` is what the API last returned, so Save only lights up for a real
  // change and only changed fields are sent.
  const [saved, setSaved] = useState<Saved>(initial);
  const [name, setName] = useState(initial.name);
  const [motto, setMotto] = useState(initial.motto ?? '');
  const [description, setDescription] = useState(initial.description ?? '');
  const [year, setYear] = useState(initial.established_year != null ? String(initial.established_year) : '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const yearNum = year.trim() === '' ? null : Number(year.trim());
  const yearInvalid = yearNum !== null && (!Number.isInteger(yearNum) || yearNum < 1 || yearNum > new Date().getFullYear());

  function changes(): HomeUpdateBody {
    const out: HomeUpdateBody = {};
    if (name.trim() !== saved.name) out.name = name.trim();
    if (motto.trim() !== (saved.motto ?? '')) out.motto = motto.trim() || null;
    if (description.trim() !== (saved.description ?? '')) out.description = description.trim() || null;
    if (yearNum !== (saved.established_year ?? null)) out.established_year = yearNum;
    return out;
  }
  const diff = changes();
  const dirty = Object.keys(diff).length > 0;
  const canSave = dirty && name.trim().length > 0 && !yearInvalid && !saving;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setMsg(null);
    setSaving(true);
    try {
      const next = await updateHome(homeId, diff);
      setSaved(next);
      setName(next.name);
      setMotto(next.motto ?? '');
      setDescription(next.description ?? '');
      setYear(next.established_year != null ? String(next.established_year) : '');
      // The Home's name is on /me too, so the nav picks up a rename.
      if ('name' in diff) await refreshAuth();
      await revalidateFamilyData();
      router.refresh();
      setMsg({ kind: 'ok', text: 'Saved.' });
      setTimeout(() => setMsg(curr => (curr && curr.kind === 'ok' ? null : curr)), 2500);
    } catch (err) {
      setMsg({ kind: 'error', text: errorText(err, 'Could not save your home’s profile.') });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="mg-card home-profile">
      <div className="mg-card__head">
        <span className="mg-card__title">Home profile</span>
      </div>
      <div className="settings-fields home-profile__body">
        <div>
          <label className="field-label" htmlFor="home-name">Name</label>
          <input
            id="home-name"
            className="field-input"
            placeholder="Your home’s name"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={255}
            required
          />
        </div>
        <div>
          <label className="field-label" htmlFor="home-motto">Motto</label>
          <input
            id="home-motto"
            className="field-input"
            placeholder="Leave the porch light on."
            value={motto}
            onChange={e => setMotto(e.target.value)}
            maxLength={255}
          />
          <p className="field-hint">A line shown under your home’s name.</p>
        </div>
        <div>
          <label className="field-label" htmlFor="home-description">Description</label>
          <textarea
            id="home-description"
            className="field-input field-input--area"
            rows={4}
            placeholder="Who lives here, where it is, what it’s like."
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={2000}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="home-year">Year established</label>
          <input
            id="home-year"
            className="field-input"
            inputMode="numeric"
            placeholder="e.g. 1987"
            value={year}
            onChange={e => setYear(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
          />
          {yearInvalid && <p className="form-status form-status--error">Enter a year no later than this one.</p>}
        </div>
        <button type="submit" className="btn-save" disabled={!canSave}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {msg && (
          <p className={msg.kind === 'ok' ? 'form-status form-status--ok' : 'form-status form-status--error'}>
            {msg.text}
          </p>
        )}
      </div>
    </form>
  );
}
