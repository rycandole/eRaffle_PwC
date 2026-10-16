



"use client";

type Option<T extends string> = { value: T; label: string };

export function ToggleSwitch<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-full bg-slate-100 p-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={[
              "px-4 py-1.5 text-sm font-medium rounded-full transition-colors",
              active ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700",
            ].join(" ")}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

