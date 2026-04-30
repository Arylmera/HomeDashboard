const STAGES = [
  { n: '01', t: 'Request',  d: 'ask' },
  { n: '02', t: 'Index',    d: 'find' },
  { n: '03', t: 'Acquire',  d: 'automate' },
  { n: '04', t: 'Download', d: 'fetch' },
  { n: '05', t: 'Serve',    d: 'stream' },
  { n: '06', t: 'Monitor',  d: 'watch' },
];

export function Pipeline() {
  return (
    <>
      <div className="nas-section-title">
        <span className="numeral">flow</span>
        <h2>From request to play</h2>
        <span className="meta">6 stages</span>
      </div>
      <div className="pipeline">
        {STAGES.map((p) => (
          <div key={p.n} className="stage">
            <span className="num">{p.n} · {p.d}</span>
            <span className="t">{p.t}</span>
            <div className="arrow" />
          </div>
        ))}
      </div>
    </>
  );
}
