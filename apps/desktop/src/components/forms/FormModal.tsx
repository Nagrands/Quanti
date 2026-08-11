import { type KeyboardEvent as ReactKeyboardEvent, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

const CLOSE_ANIMATION_MS = 180;
const FOCUSABLE_SELECTOR = [
  "button:not([disabled])", "[href]", "input:not([disabled])", "select:not([disabled])",
  "textarea:not([disabled])", "[tabindex]:not([tabindex='-1'])"
].join(",");

let bodyLockCount = 0;
let previousBodyOverflow = "";

interface FormModalProps {
  ariaLabel: string;
  children: (requestClose: () => void) => ReactNode;
  onClose: () => void;
  size?: "compact" | "wide" | "large";
}

export function FormModal({ ariaLabel, children, onClose, size = "compact" }: FormModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const closingRef = useRef(false);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const titleId = useId();

  const requestClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    setIsClosing(true);
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    closeTimerRef.current = window.setTimeout(onClose, reduceMotion ? 0 : CLOSE_ANIMATION_MS);
  };

  useEffect(() => {
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>("[data-autofocus], " + FOCUSABLE_SELECTOR)?.focus();

    if (bodyLockCount === 0) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    bodyLockCount += 1;

    return () => {
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
      bodyLockCount = Math.max(0, bodyLockCount - 1);
      if (bodyLockCount === 0) document.body.style.overflow = previousBodyOverflow;
      restoreFocusRef.current?.focus();
    };
  }, []);

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const openModals = document.querySelectorAll<HTMLElement>("[role='dialog'][aria-modal='true']");
    if (openModals.item(openModals.length - 1) !== dialog) return;

    if (event.key === "Escape") {
      event.preventDefault();
      requestClose();
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      .filter((element) => element.getClientRects().length > 0 || element === document.activeElement);
    if (focusable.length === 0) {
      event.preventDefault();
      dialog.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return createPortal(
    <div
      className={`form-modal-backdrop${isClosing ? " form-modal-backdrop--closing" : ""}`}
      onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose(); }}
    >
      <div ref={dialogRef} className={`form-modal form-modal--${size}${isClosing ? " form-modal--closing" : ""}`}
        role="dialog" aria-modal="true" aria-labelledby={titleId} aria-label={ariaLabel} tabIndex={-1}
        onKeyDown={handleKeyDown}>
        <span id={titleId} className="visually-hidden">{ariaLabel}</span>
        {children(requestClose)}
      </div>
    </div>,
    document.body
  );
}
