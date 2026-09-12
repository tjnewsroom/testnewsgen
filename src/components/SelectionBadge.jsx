import { useEffect, useState } from 'react';
import { WPS } from '../lib/prompts';

export default function SelectionBadge() {
  const [text, setText] = useState('');

  useEffect(() => {
    const onSelect = () => {
      const t = (window.getSelection() || '').toString().trim();
      setText(t);
    };
    document.addEventListener('selectionchange', onSelect);
    return () => document.removeEventListener('selectionchange', onSelect);
  }, []);

  if (!text) return null;
  const words = text.split(/\s+/).filter(Boolean).length;
  return (
    <div className="sel-badge">
      {words} words · {Math.round(words / WPS)} sec
    </div>
  );
}
