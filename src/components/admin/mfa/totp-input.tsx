"use client";

import { useRef, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";

interface TotpInputProps {
  onComplete: (code: string) => void;
  disabled?: boolean;
}

export function TotpInput({ onComplete, disabled = false }: TotpInputProps) {
  const [values, setValues] = useState<string[]>(Array(6).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const setRef = useCallback(
    (index: number) => (el: HTMLInputElement | null) => {
      inputRefs.current[index] = el;
    },
    []
  );

  const handleChange = (index: number, value: string) => {
    // Only accept digits
    const digit = value.replace(/\D/g, "").slice(-1);
    const newValues = [...values];
    newValues[index] = digit;
    setValues(newValues);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if all fields are filled
    const code = newValues.join("");
    if (code.length === 6) {
      onComplete(code);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !values[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 0) return;

    const newValues = [...values];
    for (let i = 0; i < pasted.length; i++) {
      newValues[i] = pasted[i];
    }
    setValues(newValues);

    const focusIndex = Math.min(pasted.length, 5);
    inputRefs.current[focusIndex]?.focus();

    if (pasted.length === 6) {
      onComplete(pasted);
    }
  };

  return (
    <div className="flex gap-2 justify-center">
      {values.map((value, index) => (
        <Input
          key={index}
          ref={setRef(index)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={index === 0 ? handlePaste : undefined}
          disabled={disabled}
          className="w-12 h-14 text-center text-xl font-mono border-zinc-700 bg-zinc-800 text-zinc-100 focus:border-zinc-500"
          autoComplete="one-time-code"
        />
      ))}
    </div>
  );
}
