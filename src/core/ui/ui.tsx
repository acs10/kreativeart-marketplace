"use client";

import { X } from "lucide-react";
import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

// ---------- Botões ----------

const VARIANTS = {
  primary: "brand-gradient text-white hover:opacity-90",
  secondary: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
  success: "bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:opacity-90",
  danger: "border border-red-400 bg-white text-red-600 hover:bg-red-50",
  ghost: "text-gray-600 hover:bg-gray-100",
} as const;

export function Button({ variant = "primary", size = "md", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof VARIANTS; size?: "sm" | "md" }) {
  const sizing = size === "sm" ? "px-3 py-1.5 text-caption" : "px-4 py-2.5 text-small";
  return <button className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${sizing} ${VARIANTS[variant]} ${className}`} {...props} />;
}

// ---------- Campos ----------

export const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-small text-gray-900 outline-none transition focus:border-brand-purple focus:ring-2 focus:ring-purple-100 disabled:bg-gray-50 aria-invalid:border-red-400";

function Shell({ label, error, hint, className = "", children }: { label: string; error?: string; hint?: string; className?: string; children: ReactNode }) {
  return (
    <label className={`grid gap-1.5 ${className}`}>
      <span className="text-small font-medium text-gray-700">{label}</span>
      {children}
      {error ? <span className="text-caption text-red-600">{error}</span> : hint && <span className="text-caption text-gray-500">{hint}</span>}
    </label>
  );
}

type Common = { label: string; error?: string; hint?: string; className?: string };

export function Field({ label, error, hint, className, ...props }: InputHTMLAttributes<HTMLInputElement> & Common) {
  return (
    <Shell label={label} error={error} hint={hint} className={className}>
      <input className={inputClass} aria-invalid={error ? true : undefined} {...props} />
    </Shell>
  );
}

export function SelectField({ label, error, hint, className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & Common) {
  return (
    <Shell label={label} error={error} hint={hint} className={className}>
      <select className={inputClass} aria-invalid={error ? true : undefined} {...props}>
        {children}
      </select>
    </Shell>
  );
}

export function TextArea({ label, error, hint, className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & Common) {
  return (
    <Shell label={label} error={error} hint={hint} className={className}>
      <textarea className={`${inputClass} resize-y`} aria-invalid={error ? true : undefined} {...props} />
    </Shell>
  );
}

// ---------- Cartões e selos ----------

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-xl border border-gray-200 bg-white shadow-sm ${className}`}>{children}</div>;
}

export function Badge({ className = "bg-gray-100 text-gray-700", children }: { className?: string; children: ReactNode }) {
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-caption font-semibold ${className}`}>{children}</span>;
}

export function StatCard({ label, value, icon, color = "text-gray-900", note, noteClass = "text-gray-500" }: { label: string; value: ReactNode; icon: ReactNode; color?: string; note?: ReactNode; noteClass?: string }) {
  return (
    <Card className="p-5">
      <div className="mb-2 flex items-center justify-between text-small font-medium text-gray-600">
        {label}
        <span className="text-gray-400">{icon}</span>
      </div>
      <div className={`text-2xl font-bold sm:text-3xl ${color}`}>{value}</div>
      {note && <p className={`mt-1 text-caption ${noteClass}`}>{note}</p>}
    </Card>
  );
}

// ---------- Modal ----------

export function Modal({ title, description, onClose, children, footer, size = "md" }: { title: ReactNode; description?: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; size?: "md" | "lg" | "xl" }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const width = { md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" className={`my-6 w-full ${width} animate-pop rounded-xl bg-white shadow-2xl`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            {description && <div className="mt-1 text-small text-gray-500">{description}</div>}
          </div>
          <button onClick={onClose} aria-label="Fechar" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <X className="size-5" />
          </button>
        </div>
        <div className="space-y-5 p-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 p-5">{footer}</div>}
      </div>
    </div>
  );
}

// ---------- Estado vazio ----------

export function EmptyState({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4">{icon}</div>
      <h3 className="mb-2 text-xl font-semibold">{title}</h3>
      <p className="max-w-md text-gray-600">{text}</p>
    </Card>
  );
}

// ---------- Cabeçalho de página e abas ----------

export function PageHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-gray-600">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; count?: number }[] }) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto rounded-lg bg-white p-1 shadow-sm">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)} className={`flex flex-shrink-0 items-center gap-2 rounded-md px-3 py-2 text-small font-medium transition-colors ${value === o.value ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
          {o.label}
          {o.count ? <span className={`rounded-full px-2 text-caption font-bold ${value === o.value ? "bg-white/20" : "bg-purple-100 text-purple-700"}`}>{o.count}</span> : null}
        </button>
      ))}
    </div>
  );
}
