import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ModalPortalProps {
  children: React.ReactNode;
  onClose?: () => void;
}

// Global modal stack for topmost Escape key dismissal
const modalStack: (() => void)[] = [];
let initialBodyOverflow: string | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      const topClose = modalStack[modalStack.length - 1];
      if (topClose) {
        topClose();
      }
    }
  });
}

/**
 * ModalPortal mounts its children directly onto `document.body`.
 * Manages modal stack so Esc key dismisses ONLY the topmost modal.
 */
export const ModalPortal: React.FC<ModalPortalProps> = ({ children, onClose }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    if (modalStack.length === 0) {
      initialBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }

    if (onClose) {
      modalStack.push(onClose);
    }

    return () => {
      if (onClose) {
        const idx = modalStack.lastIndexOf(onClose);
        if (idx !== -1) {
          modalStack.splice(idx, 1);
        }
      }

      if (modalStack.length === 0 && initialBodyOverflow !== null) {
        document.body.style.overflow = initialBodyOverflow;
        initialBodyOverflow = null;
      }
    };
  }, [onClose]);

  if (!mounted) return null;
  return createPortal(children, document.body);
};

export default ModalPortal;
