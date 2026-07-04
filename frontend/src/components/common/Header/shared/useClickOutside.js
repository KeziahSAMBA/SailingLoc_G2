import { useEffect, useRef } from 'react';

/**
 * Closes each ref's menu when a click lands outside of it.
 * @param {Array<[React.RefObject, () => void]>} entries
 */
export function useClickOutside(entries) {
  const entriesRef = useRef(entries);
  entriesRef.current = entries;

  useEffect(() => {
    function onClickOutside(e) {
      entriesRef.current.forEach(([ref, close]) => {
        if (ref.current && !ref.current.contains(e.target)) close();
      });
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);
}
