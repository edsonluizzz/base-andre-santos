import { handlers } from "@/lib/auth";

// Garante tempo suficiente para Neon cold-start + múltiplas queries no jwt/signIn callbacks
export const maxDuration = 30;

export const { GET, POST } = handlers;
