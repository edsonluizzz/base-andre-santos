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
  // V1 — Formal, convite direto
  `Olá, {nome}. Tudo bem?\n\nAqui é da equipe do {candidato}. Recebemos seu cadastro de apoio à nossa {periodo} para 2026 e ficamos honrados com seu interesse.\n\nEstamos formando um grupo no WhatsApp com os apoiadores que querem acompanhar de perto cada etapa. Gostaríamos de te incluir.\n\nPodemos contar com você? Responda *SIM* ou *NÃO*.`,

  // V2 — Formal, agradecimento e proposta
  `{nome}, boa tarde.\n\nEm nome de toda a equipe do {candidato}, agradecemos pelo seu cadastro de apoio.\n\nMantemos um grupo no WhatsApp onde compartilhamos as principais novidades da {periodo} e a agenda do candidato. Seria uma honra ter você conosco.\n\nDeseja participar? Responda *SIM* ou *NÃO*.`,

  // V3 — Formal, cordial
  `Olá, {nome}. Esperamos que esteja bem.\n\nSou da equipe do {candidato}, candidato a Deputado Estadual pelo Paraná em 2026. Recebemos seu apoio e gostaríamos de mantê-lo informado sobre cada passo da nossa {periodo}.\n\nTemos um grupo de apoiadores no WhatsApp e gostaríamos de incluir você. Podemos?\n\nResponda *SIM* ou *NÃO*.`,

  // V4 — Formal, foco em proximidade institucional
  `{nome}, olá.\n\nEquipe do {candidato} entrando em contato para agradecer pelo seu cadastro.\n\nO próximo passo é te convidar para o nosso grupo no WhatsApp — espaço reservado aos apoiadores que recebem em primeira mão a agenda, os materiais e os comunicados oficiais.\n\nPodemos te adicionar? Responda *SIM* ou *NÃO*.`,

  // V5 — Formal, com toque pessoal moderado
  `Olá, {nome}.\n\nAqui é da equipe do {candidato}. Acabamos de receber seu cadastro e gostaríamos de te dar as boas-vindas à nossa {periodo}.\n\nMantemos um grupo de apoiadores no WhatsApp para compartilhar comunicados, agenda e oportunidades de participação. Gostaria de fazer parte?\n\nResponda *SIM* ou *NÃO*.`,
];

export const WELCOME_TEMPLATES: string[] = [
  // V1 — Formal, agradecimento institucional
  `{nome}, muito obrigado pela confirmação.\n\nÉ uma honra contar com seu apoio na nossa {periodo}. Segue o link do grupo dos apoiadores:\n\n👉 {groupLink}\n\nJuntos pelo Paraná. 🇵🇷`,

  // V2 — Formal, boas-vindas cordiais
  `{nome}, seja {bem-vindo}.\n\nEm nome de toda a equipe do {candidato}, agradecemos pela sua confiança. Acesse o grupo dos apoiadores pelo link abaixo:\n\n👉 {groupLink}\n\nNos vemos por lá.`,

  // V3 — Formal, sucinto
  `Olá, {nome}.\n\nConfirmamos sua inclusão no grupo dos apoiadores do {candidato}. Acesse pelo link:\n\n👉 {groupLink}\n\nContamos com você nessa {periodo}.`,

  // V4 — Formal, com reconhecimento
  `{nome}, agradecemos seu interesse em apoiar o {candidato}.\n\nVocê faz parte agora do grupo oficial de apoiadores no WhatsApp:\n\n👉 {groupLink}\n\nLá compartilhamos a agenda, os comunicados e os próximos passos da {periodo}.`,

  // V5 — Formal, valorização
  `{nome}, obrigado por confirmar seu apoio.\n\nSua participação é fundamental para a nossa {periodo}. Link do grupo dos apoiadores:\n\n👉 {groupLink}\n\nUm abraço da equipe do {candidato}.`,
];

export const REACTIVATION_TEMPLATES: string[] = [
  // V1 — Formal, retomada cordial
  `Olá, {querido} {nome}. Como tem passado?\n\nAqui é da equipe do {candidato}. Notamos que faz algum tempo desde nosso último contato, e queríamos retomar essa conversa.\n\nCaso ainda tenha interesse em acompanhar nossa {periodo}, estamos à disposição para conversar.\n\nUm abraço.`,

  // V2 — Formal, reabertura de canal
  `Boa tarde, {nome}.\n\nEm nome da equipe do {candidato}, gostaríamos de reabrir esse diálogo.\n\nSabemos que a vida é corrida, mas queremos saber se ainda podemos contar com você nessa caminhada de 2026.\n\nAguardamos seu retorno quando possível.`,

  // V3 — Formal, retomar contato
  `{nome}, tudo bem?\n\nEquipe do {candidato} aqui. Faz algum tempo que não trocamos uma palavra e queremos reabrir esse canal.\n\nSe ainda tiver interesse em receber novidades e participar do nosso grupo de apoiadores, basta nos avisar.\n\nCordialmente.`,

  // V4 — Formal, oferta de grupo
  `Olá, {nome}.\n\nEsperamos que esteja bem. A equipe do {candidato} gostaria de retomar contato com você.\n\nSe for de seu interesse, podemos te incluir no nosso grupo de apoiadores no WhatsApp e mantê-lo informado sobre os próximos passos.\n\nAguardamos sua resposta.`,

  // V5 — Formal, novo olá
  `{nome}, boa tarde.\n\nEm nome do {candidato} e de toda a equipe, queremos dar um novo "olá" e saber como está.\n\nCaso ainda deseje fazer parte da nossa rede de apoiadores, é só nos avisar — temos materiais e informações relevantes pra compartilhar.\n\nUm abraço cordial.`,
];

export const OPTOUT_TEMPLATES: string[] = [
  // V1 — Formal, respeitoso
  `Tudo bem, {nome}. Respeitamos sua decisão.\n\nSe mudar de ideia, basta nos avisar. Um abraço da equipe do {candidato}.`,

  // V2 — Formal, breve
  `{nome}, entendido. Agradecemos pelo retorno.\n\nSe um dia desejar voltar, estaremos à disposição. Um abraço.`,

  // V3 — Formal, cordial
  `Olá, {nome}. Compreendemos perfeitamente.\n\nAgradecemos pelo seu cadastro e pela sinceridade. As portas continuam abertas caso mude de opinião.\n\nUm abraço cordial.`,

  // V4 — Formal, agradecimento
  `{nome}, obrigado pelo retorno.\n\nA equipe do {candidato} respeita sua decisão e fica à disposição para o que precisar no futuro.\n\nUm abraço.`,

  // V5 — Formal, encerramento polido
  `Entendido, {nome}. Agradecemos pela sua atenção.\n\nCaso queira retomar contato no futuro, basta enviar uma mensagem. Um abraço da equipe.`,
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

export type MessageKind = "invite" | "welcome" | "optOut" | "reactivation";

const POOLS: Record<MessageKind, string[]> = {
  invite: INVITE_TEMPLATES,
  welcome: WELCOME_TEMPLATES,
  optOut: OPTOUT_TEMPLATES,
  reactivation: REACTIVATION_TEMPLATES,
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
 * Renderiza todas as 4 mensagens (invite, welcome, optOut, reactivation)
 * com o mesmo contexto. Cada uma sorteia a sua variação independentemente.
 */
export function renderAllMessages(ctx: RenderContext): Record<MessageKind, string> {
  return {
    invite: renderMessage("invite", ctx),
    welcome: renderMessage("welcome", ctx),
    optOut: renderMessage("optOut", ctx),
    reactivation: renderMessage("reactivation", ctx),
  };
}
