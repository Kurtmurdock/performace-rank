import React from "react";

interface SpinnerProps {
  size?: number;
  className?: string;
}

// Spinner simples baseado no botão do 21st.dev, mas usando apenas o
// utilitário `animate-spin` já embutido no Tailwind (evita depender de
// keyframes customizados que não existem no CSS global do projeto —
// mesmo tipo de problema que travou o deploy do módulo "xlsx").
export const Spinner = ({ size = 16, className = "" }: SpinnerProps) => {
  return (
    <div
      className={`animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      style={{ width: size, height: size }}
    />
  );
};
