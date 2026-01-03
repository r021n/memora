import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

interface Option {
  id: string;
  label: string;
}

interface CustomSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select...",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.id === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (optionId: string) => {
    onChange(optionId);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-3 font-medium border-2 rounded-xl transition-all duration-200 ${
          isOpen
            ? "border-indigo-400 ring-2 ring-indigo-50 bg-white"
            : "border-slate-200 bg-white hover:border-indigo-200"
        } focus:outline-none`}
      >
        <span className={selectedOption ? "text-slate-700" : "text-slate-400"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={20}
          className={`text-slate-400 transition-transform duration-200 ${
            isOpen ? "transform rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 overflow-hidden bg-white border-2 border-indigo-100 shadow-xl rounded-xl animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-60 overflow-y-auto">
            {/* "None" option if you want to allow deselecting */}
            <button
              type="button"
              onClick={() => handleSelect("")}
              className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
                value === ""
                  ? "bg-slate-50 text-indigo-500 font-bold"
                  : "text-slate-500"
              }`}
            >
              <span>{placeholder}</span>
              {value === "" && <Check size={18} />}
            </button>

            {options.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSelect(option.id)}
                className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-indigo-50/50 ${
                  value === option.id
                    ? "bg-indigo-50 text-indigo-600 font-bold"
                    : "text-slate-700"
                }`}
              >
                <span>{option.label}</span>
                {value === option.id && <Check size={18} />}
              </button>
            ))}

            {options.length === 0 && (
              <div className="px-4 py-3 text-sm text-center text-slate-400 italic">
                No options available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
