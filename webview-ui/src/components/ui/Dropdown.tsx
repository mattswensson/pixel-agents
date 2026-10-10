import type { ReactNode } from 'react';

interface DropdownProps {
  isOpen: boolean;
  children: ReactNode;
  className?: string;
  /** Open downward from the trigger instead of upward (for triggers at the top of the screen). */
  below?: boolean;
}

export function Dropdown({ isOpen, children, className = '', below = false }: DropdownProps) {
  if (!isOpen) return null;

  return (
    <div className={`absolute left-0 z-10 ${below ? 'top-full pt-10' : 'bottom-full pb-10'}`}>
      <div
        className={`bg-bg border-2 border-border rounded-none shadow-pixel p-4 max-w-[calc(100vw-20px)] ${className}`}
      >
        {children}
      </div>
    </div>
  );
}

interface DropdownItemProps {
  onClick: () => void;
  children: ReactNode;
  className?: string;
}

export function DropdownItem({ onClick, children, className = '' }: DropdownItemProps) {
  return (
    <button
      onClick={onClick}
      className={`block w-full text-left py-2 px-12 bg-transparent border-none rounded-none cursor-pointer whitespace-nowrap hover:bg-btn-bg ${className}`}
    >
      {children}
    </button>
  );
}
