import { createPortal } from "react-dom";
import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";

interface ActionIconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "aria-label"> {
  label: string;
  icon: ReactNode;
  tone?: "default" | "danger" | "success";
  loading?: boolean;
}

export function ActionIconButton({ label, icon, tone = "default", loading = false, className = "", ...props }: ActionIconButtonProps) {
  const id = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [tooltip, setTooltip] = useState<{ left: number; top: number } | null>(null);

  function openTooltip() {
    const bounds = buttonRef.current?.getBoundingClientRect();
    if (bounds) setTooltip({ left: bounds.left + bounds.width / 2, top: bounds.top - 8 });
  }

  useEffect(() => {
    if (!tooltip) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setTooltip(null); };
    const closeOnScroll = () => setTooltip(null);
    window.addEventListener("keydown", close);
    window.addEventListener("scroll", closeOnScroll, true);
    return () => {
      window.removeEventListener("keydown", close);
      window.removeEventListener("scroll", closeOnScroll, true);
    };
  }, [tooltip]);

  return (
    <>
      <button
        {...props}
        ref={buttonRef}
        type={props.type ?? "button"}
        className={`action-icon-button action-icon-button--${tone}${loading ? " action-icon-button--loading" : ""} ${className}`.trim()}
        aria-label={label}
        aria-describedby={tooltip ? id : undefined}
        aria-busy={loading || undefined}
        onMouseEnter={(event) => { props.onMouseEnter?.(event); openTooltip(); }}
        onMouseLeave={(event) => { props.onMouseLeave?.(event); setTooltip(null); }}
        onFocus={(event) => { props.onFocus?.(event); openTooltip(); }}
        onBlur={(event) => { props.onBlur?.(event); setTooltip(null); }}
      >
        {icon}
      </button>
      {tooltip ? createPortal(
        <span id={id} role="tooltip" className="action-tooltip" style={{ left: tooltip.left, top: tooltip.top }}>
          {label}
        </span>,
        document.body
      ) : null}
    </>
  );
}
