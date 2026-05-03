/* Section tabs (rooms / flows / variables) with per-tab counts and metadata. */
const TABS = [
  { id: 'rooms', num: '02', label: 'Rooms' },
  { id: 'flows', num: '03', label: 'Automations' },
  { id: 'vars',  num: '04', label: 'Variables' },
];

export { TABS };

export default function HomeyTabs({ tab, setTab, counts, metas }) {
  return (
    <nav className="homey-tabs" role="tablist" aria-label="Homey sections">
      {TABS.map(t => (
        <button
          key={t.id}
          role="tab"
          type="button"
          aria-selected={tab === t.id}
          className={"homey-tab" + (tab === t.id ? ' active' : '')}
          onClick={() => setTab(t.id)}
        >
          <span className="num">{t.num}</span>
          <span className="lbl">{t.label}</span>
          <span className="cnt">{counts[t.id]}</span>
          {metas[t.id] && <span className="meta">{metas[t.id]}</span>}
        </button>
      ))}
    </nav>
  );
}
