import React from 'react';

type Props = {
  value?: number;
  onChange: (val: number | undefined) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
};

const nf = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });

export default function CurrencyInput({ value, onChange, placeholder, className = '', ariaLabel }: Props) {
  const [text, setText] = React.useState<string>('');

  React.useEffect(() => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      setText(nf.format(value));
    } else {
      setText('');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // solo dígitos para CLP
    const digits = raw.replace(/\D+/g, '');
    if (!digits) {
      setText('');
      onChange(undefined);
      return;
    }
    const num = Number(digits);
    setText(nf.format(num));
    onChange(num);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // permitir navegación/borrado; bloquear letras
    const allowed = [
      'Backspace','Delete','ArrowLeft','ArrowRight','Home','End','Tab'
    ];
    if (allowed.includes(e.key)) return;
    if (!/\d/.test(e.key)) {
      e.preventDefault();
    }
  };

  return (
    <div className={`relative ${className}`}>
      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400">$</span>
      <input
        aria-label={ariaLabel || 'Precio (CLP)'}
        inputMode="numeric"
        className="w-full text-right bg-slate-900 border border-slate-700 rounded px-2 pl-6 py-1 tabular-nums"
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />
    </div>
  );
}
