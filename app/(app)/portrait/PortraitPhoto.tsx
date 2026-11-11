'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth-context';
import { removeMyAvatar, setMyAvatar } from '../../../lib/avatar';
import { useAvatarPicker } from '../../components/useAvatarPicker';

/**
 * The portrait's frame: the person's photo, or the silhouette (`children`)
 * when they have none. On your own portrait it also changes or removes your
 * photo, and shows the new one from the API's answer at once; the nav avatar
 * and the page catch up in the background.
 */
export default function PortraitPhoto({
  name,
  avatarUrl,
  editable,
  children,
}: {
  name: string;
  avatarUrl: string | null;
  editable: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { refresh } = useAuth();
  const [url, setUrl] = useState(avatarUrl);
  useEffect(() => setUrl(avatarUrl), [avatarUrl]);

  function settle(next: string | null) {
    setUrl(next);
    void refresh();
    router.refresh();
  }

  const picker = useAvatarPicker({
    onUpload: async file => settle((await setMyAvatar(file)).avatar_url),
    onRemove: async () => settle((await removeMyAvatar()).avatar_url),
  });

  return (
    <div>
      <div className={`portrait__frame${picker.busy ? ' is-busy' : ''}`}>
        {url ? <img className="portrait__photo" src={url} alt={name} /> : children}
      </div>

      {editable && (
        <div className="portrait-photo__actions">
          {picker.input}
          <button type="button" className="mg-btn" onClick={picker.open} disabled={!!picker.busy}>
            {picker.busy === 'upload' ? 'Uploading…' : url ? 'Change photo' : 'Add a photo'}
          </button>
          {url && picker.remove && (
            <button type="button" className="mg-btn" onClick={picker.remove} disabled={!!picker.busy}>
              {picker.busy === 'remove' ? 'Removing…' : 'Remove'}
            </button>
          )}
          {picker.error && <p className="form-status form-status--error" role="alert">{picker.error}</p>}
        </div>
      )}
    </div>
  );
}
