import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ModalPortalProps {
  children: React.ReactNode;
  onClose?: () => void;
}

/**
 * ModalPortal mounts its children directly onto `document.body`.
 * This guarantees:
 * 1. The modal is completely escaped from any parent layout, transforms, scroll containers, or CSS stacking contexts.
 * 2. `fixed inset-0` correctly targets the entire browser window (100vw x 100vh).
 * 3. The backdrop covers the entire viewport including navbar and sidebar.
 * 4. Modals are perfectly centered horizontally and vertically on screen.
 * 5. Background body scroll is safely locked while open and restored upon close.
 */
export const ModalPortal: React.FC<ModalPortalProps> = ({ children, onClose }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Save and lock body scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Optional Escape key listener
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (!mounted) return null;
  return createPortal(children, document.body);
};

export default ModalPortal;
