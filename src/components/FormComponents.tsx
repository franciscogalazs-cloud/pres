import React from 'react';

// ====== Componente de número ======

interface NumProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

export const Num: React.FC<NumProps> = React.memo(({ 
  label, 
  value, 
  onChange, 
  min = 0, 
  max, 
  step = 0.01,
  className = ""
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Math.max(min, parseFloat(e.target.value) || 0);
    const finalValue = max ? Math.min(max, newValue) : newValue;
    onChange(finalValue);
  };

  return (
    <label className={`text-sm text-slate-300 grid gap-1 ${className}`}>
      <span>{label}</span>
      <input 
        type="number" 
        step={step} 
        min={min}
        max={max}
        value={value}
        onChange={handleChange}
        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2" 
      />
    </label>
  );
});

Num.displayName = 'Num';

// ====== Componente de checkbox ======

interface ChkProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

export const Chk: React.FC<ChkProps> = React.memo(({ 
  label, 
  checked, 
  onChange,
  className = ""
}) => {
  return (
    <label className={`text-sm text-slate-300 grid gap-1 items-center ${className}`}>
      <span>{label}</span>
      <input 
        type="checkbox" 
        checked={checked} 
        onChange={(e) => onChange(e.target.checked)} 
        className="w-5 h-5 accent-slate-500"
      />
    </label>
  );
});

Chk.displayName = 'Chk';

// ====== Componente de segmento/botón seleccionable ======

interface SegProps {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}

export const Seg: React.FC<SegProps> = React.memo(({ 
  on, 
  onClick, 
  children,
  className = ""
}) => {
  return (
    <button 
      onClick={onClick} 
      className={`px-3 py-1 rounded-xl border transition-colors ${
        on 
          ? 'bg-slate-900 border-slate-600' 
          : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
      } ${className}`}
      title={on ? 'Opción seleccionada' : 'Seleccionar opción'}
      aria-label={on ? 'Opción seleccionada' : 'Seleccionar opción'}
    >
      {children}
    </button>
  );
});

Seg.displayName = 'Seg';

// ====== Componente de preview con botón de uso ======

interface PreviewProps {
  value: number;
  unidad: string;
  onUse: () => void;
  className?: string;
}

export const Preview: React.FC<PreviewProps> = React.memo(({ 
  value, 
  unidad, 
  onUse,
  className = ""
}) => {
  const [justUsed, setJustUsed] = React.useState(false);

  const handleUse = () => {
    onUse();
    setJustUsed(true);
    setTimeout(() => setJustUsed(false), 2000);
  };

  return (
    <div className={`bg-slate-900 border border-slate-700 rounded-xl p-3 h-full grid content-between ${className}`}>
      <div className="text-slate-300 text-sm">Resultado</div>
      <div className="text-xl font-bold">{Number(value || 0).toFixed(4)} {unidad}</div>
      <button 
        onClick={handleUse} 
        className={`mt-2 px-3 py-2 rounded-xl transition-colors ${
          justUsed 
            ? 'bg-green-600 text-white' 
            : 'bg-slate-800 hover:bg-slate-700'
        }`}
        title="Usar en metrados"
        aria-label="Usar en metrados"
      >
        {justUsed ? '✓ Aplicado' : 'Usar en Metrados'}
      </button>
    </div>
  );
});

Preview.displayName = 'Preview';