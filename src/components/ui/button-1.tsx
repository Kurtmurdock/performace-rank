import React from "react";
import { Spinner } from "@/components/ui/spinner-1";

// Botão adaptado do componente do 21st.dev. A versão original trazia um
// design system de cores próprio (gray-1000, red-800 etc, do Vercel/21st.dev)
// que ficaria desconectado da paleta já usada pelo PERFORMACE. Aqui as
// variantes usam as mesmas classes Tailwind que o resto do site (bg-accent,
// bg-white/5, border-white/10) para o botão se encaixar em qualquer tela
// sem criar uma segunda paleta paralela.

const sizes = {
  small: "px-3 h-8 text-xs",
  medium: "px-4 h-10 text-sm",
  large: "px-5 h-11 text-sm",
};

const types = {
  primary: "bg-accent text-white hover:opacity-90",
  secondary: "bg-white/5 border border-white/10 text-foreground hover:border-accent",
  outline: "bg-transparent border border-accent/40 text-accent hover:bg-accent/10",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: keyof typeof sizes;
  variant?: keyof typeof types;
  loading?: boolean;
  fullWidth?: boolean;
  prefix?: React.ReactNode;
}

export const Button = ({
  size = "medium",
  variant = "primary",
  loading = false,
  fullWidth = false,
  disabled = false,
  prefix,
  children,
  className = "",
  ...rest
}: ButtonProps) => {
  return (
    <button
      disabled={disabled || loading}
      className={[
        "flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors duration-150",
        sizes[size],
        disabled || loading ? "opacity-60 cursor-not-allowed" : types[variant],
        fullWidth ? "w-full" : "",
        className,
      ].join(" ")}
      {...rest}
    >
      {loading ? <Spinner size={size === "large" ? 16 : 14} /> : prefix}
      <span className="whitespace-nowrap">{children}</span>
    </button>
  );
};
