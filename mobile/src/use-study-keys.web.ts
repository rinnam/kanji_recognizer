import { useEffect } from 'react';
import type { StudyKey } from './use-study-keys';

export function useStudyKeys(handle: (event: StudyKey) => boolean) {
  useEffect(() => {
    const listen = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.keyCode === 229 || event.repeat ||
        event.altKey || event.metaKey || event.ctrlKey || document.querySelector('[aria-modal="true"]')) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      const typing = !!target?.matches('input,textarea,select,[contenteditable="true"]');
      if (handle({ key: event.key, typing, button: !!target?.closest('[role="button"],button') })) event.preventDefault();
    };
    document.addEventListener('keydown', listen, true);
    return () => document.removeEventListener('keydown', listen, true);
  }, [handle]);
}
