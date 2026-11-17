import SettingsNav from './SettingsNav';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="settings-layout">
      {/* Settings sub-nav */}
      <aside className="settings-layout__aside">
        <p className="settings-layout__label">Settings</p>
        <SettingsNav />
      </aside>

      {/* Page content */}
      <div className="settings-layout__body">
        {children}
      </div>
    </div>
  );
}
