import { useEffect, useState } from 'react';

export function VariableCard({ variable, onSave }) {
  const [draft, setDraft] = useState(variable.value);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!dirty) setDraft(variable.value);
  }, [variable.value, dirty]);

  const editable = !!onSave;

  const setBool = (val) => {
    setDraft(val);
    setDirty(val !== variable.value);
    setError(null);
  };
  const setText = (val) => {
    setDraft(val);
    setDirty(val !== variable.value);
    setError(null);
  };
  const setNumber = (raw) => {
    if (raw === '') { setDraft(''); setDirty(true); setError(null); return; }
    const n = Number(raw);
    setDraft(Number.isFinite(n) ? n : raw);
    setDirty(true);
    setError(null);
  };

  const save = async () => {
    if (!editable || pending || !dirty) return;
    let value = draft;
    if (variable.type === 'number') {
      const n = Number(value);
      if (!Number.isFinite(n)) { setError('not a number'); return; }
      value = n;
    } else if (variable.type === 'string') {
      value = String(value ?? '');
    } else if (variable.type === 'boolean') {
      value = !!value;
    }
    setPending(true);
    setError(null);
    try {
      await onSave(variable.id, value);
      setDirty(false);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="variable" role="group" aria-label={`variable ${variable.name}`}>
      <div className="variable-head">
        <div className="variable-name">{variable.name}</div>
        <span className="type-chip">{variable.type}</span>
      </div>

      <div className="variable-body">
        {variable.type === 'boolean' ? (
          <button
            type="button"
            className={"dev-toggle" + (draft ? " on" : " off") + (pending ? " pending" : "")}
            onClick={() => editable && setBool(!draft)}
            disabled={!editable || pending}
            aria-pressed={!!draft}
            aria-label={`set ${variable.name} ${draft ? 'false' : 'true'}`}
          >
            <span className="knob" />
          </button>
        ) : variable.type === 'number' ? (
          <input
            type="number"
            className="variable-input"
            value={draft ?? ''}
            onChange={(e) => setNumber(e.target.value)}
            disabled={!editable || pending}
          />
        ) : (
          <input
            type="text"
            className="variable-input"
            value={draft ?? ''}
            onChange={(e) => setText(e.target.value)}
            disabled={!editable || pending}
          />
        )}

        <button
          type="button"
          className={"variable-save" + (pending ? " pending" : "")}
          onClick={save}
          disabled={!editable || !dirty || pending}
        >
          {pending ? 'saving…' : 'save'}
        </button>
      </div>

      {error && <div className="variable-error">{error}</div>}
    </div>
  );
}
