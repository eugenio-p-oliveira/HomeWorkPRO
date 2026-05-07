import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("pt-BR");
}

export function formatDateTime(date: string | Date) {
  return new Date(date).toLocaleString("pt-BR");
}

export function examTypeLabel(type: string) {
  const map: Record<string, string> = { enem: "ENEM", simulado: "Simulado", traditional: "Prova", homework: "Atividade" };
  return map[type] ?? type;
}

export function examStatusLabel(status: string) {
  const map: Record<string, string> = { draft: "Rascunho", scheduled: "Agendada", active: "Ativa", closed: "Encerrada" };
  return map[status] ?? status;
}

export function shiftLabel(shift: string) {
  const map: Record<string, string> = { manha: "Manhã", tarde: "Tarde", noite: "Noite", integral: "Integral" };
  return map[shift] ?? shift;
}

export function educationalLevelLabel(level: string) {
  const map: Record<string, string> = { infantil: "Infantil", fundamental: "Fundamental", medio: "Médio", tecnico: "Técnico", superior: "Superior" };
  return map[level] ?? level;
}

export function roleLabel(role: string) {
  const map: Record<string, string> = { admin: "Administrador", coordinator: "Coordenador", teacher: "Professor", student: "Aluno" };
  return map[role] ?? role;
}

export function getScoreColor(pct: number) {
  if (pct >= 70) return "text-emerald-600";
  if (pct >= 50) return "text-amber-600";
  return "text-red-600";
}

export function getScoreBg(pct: number) {
  if (pct >= 70) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (pct >= 50) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
}
