/**
 * Templates de mensagem WhatsApp com variações + concordância de gênero.
 *
 * Placeholders:
 *   {nome}       — primeiro nome formatado
 *   {querido}    — querido/querida
 *   {amigo}      — amigo/amiga
 *   {bem-vindo}  — bem-vindo/bem-vinda
 *   {candidato}  — Settings.campaignName (André Santos por padrão)
 *   {periodo}    — "base de apoio" antes de 16/08/2026 · "campanha" depois
 *   {groupLink}  — Settings.whatsappGroupLink
 *
 * Cada tipo tem 5 variações — sorteio aleatório a cada chamada.
 *
 * Compliance eleitoral: termo "campanha" só é permitido a partir da campanha
 * oficial (16/08 do ano eleitoral). Antes disso, usar "base de apoio".
 */

import { detectGender, firstName, type Gender } from "./name-utils";

// Início oficial da campanha eleitoral 2026 (Lei 9.504/97, art. 36)
const CAMPAIGN_START = new Date("2026-08-16T00:00:00-03:00");

export function periodoEleitoral(now: Date = new Date()): string {
  return now < CAMPAIGN_START ? "base de apoio" : "campanha";
}

// ─── Concordância ──────────────────────────────────────────────────────────

interface Pronouns {
  querido: string;
  amigo: string;
  bemVindo: string;
}
const PRONOUNS: Record<Gender, Pronouns> = {
  M: { querido: "querido", amigo: "amigo", bemVindo: "bem-vindo" },
  F: { querido: "querida", amigo: "amiga", bemVindo: "bem-vinda" },
};

// ─── Templates ─────────────────────────────────────────────────────────────

export const INVITE_TEMPLATES: string[] = [
  // V1
  `Oi, {nome}! 😊\n\nAqui é da equipe do {candidato} e ficamos super felizes em ver seu interesse em apoiar nossa {periodo} pra 2026!\n\nTô montando um grupo só com {amigo}s que acreditam na nossa causa pra caminhar junto até as eleições.\n\nTopa entrar? É rapidinho, sem compromisso 🙏\n\nManda *SIM* ou *NÃO* 😉`,

  // V2
  `E aí, {nome}! Tudo bom? 😊\n\nVi que você se interessou em apoiar o {candidato} pra Deputado Estadual em 2026 — que alegria ter você com a gente!\n\nTô formando um grupo aqui no WhatsApp com {amigo}s que estão nessa caminhada. Quer fazer parte?\n\nResponde *SIM* ou *NÃO* 🤝`,

  // V3
  `Olá, {querido} {nome}! 😄\n\nEquipe do {candidato} aqui. Recebemos seu cadastro e queríamos chamar você pro nosso grupo de apoiadores no WhatsApp — é onde as coisas acontecem primeiro 🚀\n\nPosso te incluir? Responde *SIM* se topar, ou *NÃO* se preferir 🙏`,

  // V4
  `Oi, {nome}! 👋\n\nTô passando aqui em nome do {candidato} pra agradecer demais pelo apoio e te chamar pro grupo dos apoiadores 💚\n\nA gente compartilha novidades, agenda de eventos, materiais... bem família mesmo.\n\nPosso te adicionar? Responde *SIM* ou *NÃO* 😊`,

  // V5
  `{nome}, oi! 😊\n\nAqui é da equipe do {candidato}. Tava olhando seu cadastro e queria dar um abraço de boas-vindas!\n\nTemos um grupinho no WhatsApp com os {amigo}s mais próximos da {periodo} — gostaria de fazer parte?\n\nManda *SIM* ou *NÃO* 🙏`,
];

export const WELCOME_TEMPLATES: string[] = [
  // V1
  `Aaaa que alegria, {nome}! 🎉💚\n\nDemais ter você nessa caminhada com a gente!\n\nAqui tá o link do grupo dos apoiadores:\n👉 {groupLink}\n\nBora fazer bonito juntos pelo Paraná 🇧🇷`,

  // V2
  `{querido} {nome}, muito obrigado de coração! 🥰\n\nQue coisa boa ter mais um {amigo} no time! Link do grupo:\n👉 {groupLink}\n\nTe vejo lá! 💚`,

  // V3
  `Eba, {nome}! Que legal! 🎊\n\n{bem-vindo} de coração ao nosso grupo:\n👉 {groupLink}\n\nJuntos a gente vai longe 🚀`,

  // V4
  `Sensacional, {nome}! 🙌\n\nTá feita! {bem-vindo} oficialmente ao grupo dos apoiadores 😄\n\n👉 {groupLink}\n\nA {periodo} agradece muito! 💚`,

  // V5
  `{nome}, que alegria! 🤩\n\nVocê acaba de ganhar um lugar especial no nosso grupo de apoiadores 💚\n\n👉 {groupLink}\n\nConta com a gente, {querido}! 🙏`,
];

export const OPTOUT_TEMPLATES: string[] = [
  // V1
  `Tudo bem, {nome}! Sem problema nenhum 😊\n\nSe mudar de ideia, a porta tá sempre aberta. Um abraço da equipe! 🤝`,

  // V2
  `Beleza, {nome}! Respeitamos sua decisão 🙏\n\nQualquer coisa, é só dar um toque. Abraço!`,

  // V3
  `Sem stress, {nome}! 😉\n\nA gente entende. Mas se um dia mudar de ideia, é só falar! Um abraço 💚`,

  // V4
  `Tranquilo, {querido} {nome}! 😊\n\nObrigado pelo retorno. A gente fica por aqui, e se precisar de qualquer coisa, conta com a gente. Abraço!`,

  // V5
  `Ok, {nome}, entendido! 🙏\n\nAgradecemos demais pelo cadastro. Se quiser voltar, é só mandar uma mensagem! 💚`,
];

// ─── Renderização ──────────────────────────────────────────────────────────

export interface RenderContext {
  fullName: string;
  candidateName: string;
  groupLink: string | null;
  now?: Date;
}

function applyPlaceholders(template: string, ctx: RenderContext, pronouns: Pronouns, primeiro: string): string {
  return template
    .replaceAll("{nome}", primeiro)
    .replaceAll("{querido}", pronouns.querido)
    .replaceAll("{amigo}", pronouns.amigo)
    .replaceAll("{bem-vindo}", pronouns.bemVindo)
    .replaceAll("{candidato}", ctx.candidateName)
    .replaceAll("{periodo}", periodoEleitoral(ctx.now))
    .replaceAll("{groupLink}", ctx.groupLink ?? "");
}

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)] ?? arr[0];
}

export type MessageKind = "invite" | "welcome" | "optOut";

const POOLS: Record<MessageKind, string[]> = {
  invite: INVITE_TEMPLATES,
  welcome: WELCOME_TEMPLATES,
  optOut: OPTOUT_TEMPLATES,
};

/**
 * Renderiza uma variação aleatória do tipo solicitado, com concordância de gênero.
 */
export function renderMessage(kind: MessageKind, ctx: RenderContext): string {
  const primeiro = firstName(ctx.fullName);
  const gender = detectGender(ctx.fullName);
  const pronouns = PRONOUNS[gender];
  const template = pickRandom(POOLS[kind]);
  return applyPlaceholders(template, ctx, pronouns, primeiro);
}

/**
 * Renderiza todas as 3 mensagens (invite, welcome, optOut) já com o mesmo contexto.
 * Cada uma sorteia a sua variação independentemente.
 */
export function renderAllMessages(ctx: RenderContext): Record<MessageKind, string> {
  return {
    invite: renderMessage("invite", ctx),
    welcome: renderMessage("welcome", ctx),
    optOut: renderMessage("optOut", ctx),
  };
}
