export type Sessao = {
  nome: string;
  cargo: string;
  loja: string;
  fotoPerfilUrl?: string;
  tipoVenda?: string;
};

export function getSessao(): Sessao | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("performace_sessao");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const API_URL =
  "https://script.google.com/macros/s/AKfycbzRPeZO6kTKnnKD6KOtsBG3YuRbKMLUO9m0Nc4rUTb0ECG_UsW_qiwgzp1hc2q6meBUvQ/exec";

export async function chamarApi(payload: Record<string, unknown>) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });
  return res.json();
}
