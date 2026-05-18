// ═══════════════════════════════════════════════════════
//  InlineEditCell — Click-to-edit text cell
// ═══════════════════════════════════════════════════════
import React, { useState, useRef, useEffect } from 'react';

interface InlineEditCellProps {
  value: string;
  onCommit: (newValue: string) => void;
  placeholder?: string;
}

export const InlineEditCell: React.FC<InlineEditCellProps> = ({
  value, onCommit, placeholder = 'Edit...',
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onCommit(trimmed);
    else setDraft(value);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') { setDraft(value); setEditing(false); }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={{
          width: '100%', fontSize: 12, height: 28,
          background: 'rgba(10,132,255,0.12)',
          border: '1px solid var(--color-neon-blue)',
          borderRadius: 6, padding: '0 8px',
          color: 'var(--color-text-primary)',
        }}
      />
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      title="Click to edit"
      style={{
        fontSize: 12, cursor: 'text',
        color: 'var(--color-text-primary)',
        padding: '2px 4px',
        borderRadius: 4,
        transition: 'background 0.1s',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: 260,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {value || placeholder}
    </div>
  );
};
