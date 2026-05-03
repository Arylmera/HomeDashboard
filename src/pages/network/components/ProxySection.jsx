import Section from './Section.jsx';
import ProxyTable from './ProxyTable.jsx';

function SubGroup({ title, hosts, certsById, anomaly }) {
  if (hosts.length === 0) return null;
  return (
    <div className={'net-subsection' + (anomaly ? ' is-anomaly' : '')}>
      <div className="net-subsection-head">
        <h3>{title}</h3>
        <span className="net-subsection-count">{hosts.length}</span>
      </div>
      <ProxyTable hosts={hosts} certsById={certsById} />
    </div>
  );
}

export default function ProxySection({ idx, total, split, certsById }) {
  if (total === 0) return null;
  return (
    <Section
      idx={idx}
      title="proxy hosts"
      sub={split.anomalies.length ? `${split.anomalies.length} need attention` : null}
      count={total}
    >
      <SubGroup title="healthy" hosts={split.healthy} certsById={certsById} />
      <SubGroup title="needs attention" hosts={split.anomalies} certsById={certsById} anomaly />
    </Section>
  );
}
