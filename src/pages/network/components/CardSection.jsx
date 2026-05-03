import Section from './Section.jsx';

export default function CardSection({ idx, title, sub, items, render }) {
  if (!items || items.length === 0) return null;
  return (
    <Section idx={idx} title={title} sub={sub} count={items.length}>
      <div className="net-grid">{items.map(render)}</div>
    </Section>
  );
}
