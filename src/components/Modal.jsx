import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
export default function Modal({ title, children, onClose }) {
  const ref = useRef();
  useEffect(() => {
    const previous = document.activeElement,
      el = ref.current;
    el.querySelector("button")?.focus();
    const key = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const all = [
          ...el.querySelectorAll('button,a[href],input,select,[tabindex="0"]'),
        ].filter((x) => !x.disabled);
        if (e.shiftKey && document.activeElement === all[0]) {
          e.preventDefault();
          all.at(-1)?.focus();
        } else if (!e.shiftKey && document.activeElement === all.at(-1)) {
          e.preventDefault();
          all[0]?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        className="modal"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <button
          className="icon-button close"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X />
        </button>
        <h2 id="modal-title">{title}</h2>
        {children}
      </section>
    </div>
  );
}
