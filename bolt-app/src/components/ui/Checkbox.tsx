import React from 'react';
import { Check } from 'lucide-react';

interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Checkbox({ label, checked, onChange }: CheckboxProps) {
  return (
    <label className="flex items-center gap-3 group cursor-pointer select-none">
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className={`
          w-5 h-5 rounded-md transition-all duration-200
          ${checked 
            ? 'shadow-neu-pressed bg-blue-50' 
            : 'neu-button hover:shadow-neu-concave'
          }
        `}>
          <Check 
            className={`
              w-3 h-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
              transition-all duration-200
              ${checked
                ? 'opacity-100 text-blue-600 scale-100'
                : 'opacity-0 scale-75'
              }
            `}
          />
        </div>
      </div>
      <span className={`
        text-sm transition-colors duration-200
        ${checked ? 'text-blue-600 font-medium' : 'text-gray-600'}
      `}>
        {label}
      </span>
    </label>
  );
}
