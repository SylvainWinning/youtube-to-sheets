import React from 'react';

type PossibleRef =
  | React.RefObject<HTMLElement | null>
  | React.MutableRefObject<HTMLElement | null>;

export function useClickOutside<T extends HTMLElement>(
  callback: () => void,
  additionalRefs: PossibleRef[] = [],
) {
  const ref = React.useRef<T>(null);

  const latestCallback = React.useRef(callback);
  latestCallback.current = callback;

  const trackedAdditionalRefs = React.useRef(additionalRefs);
  trackedAdditionalRefs.current = additionalRefs;

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;

      if (!ref.current) {
        return;
      }

      if (ref.current.contains(target)) {
        return;
      }

      const isInsideAdditional = trackedAdditionalRefs.current.some((extraRef) =>
        extraRef.current ? extraRef.current.contains(target) : false,
      );

      if (isInsideAdditional) {
        return;
      }

      latestCallback.current();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  return ref;
}
