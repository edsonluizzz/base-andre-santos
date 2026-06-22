# PLAN — Novo canal de aquisição: ebook "Não Vos Conformeis"

Pedido (Pr. André via WhatsApp + Edson): novo canal de aquisição igual a `casamento` e
`quem-sou-eu`. Ebook sobre **Romanos 12 × marxismo cultural** ("ameaça silenciosa na
formação de adolescentes e jovens", os engodos, e como estar blindado pela Palavra).
Dois formatos: **versão maior** (padrão ebook) e **versão menor** (apostila EBA com QR Code).

## Decisões travadas
- Título: **NÃO VOS CONFORMEIS** (Rm 12:2). Slug: `nao-vos-conformeis`.
- Subtítulo: "Como blindar adolescentes e jovens contra o marxismo cultural — à luz de Romanos 12".
- QR Code → `https://leads.prandresantos.com.br/ebook/nao-vos-conformeis`

## Arquitetura (já genérica — confirmado)
Backend trata qualquer ebook automaticamente: rate-limit (`source` `EBOOK_*` = 100/min),
resolução de source, rótulo Telegram/CRM, segmentação de broadcast, página `/ebook/[slug]`
e formulário. **Único ponto de código: nova entrada em `src/lib/ebooks.ts`.**

## Passos (commit-sized)
1. [x] Mapear funil e confirmar que só `ebooks.ts` precisa mudar.
2. [ ] Gerar QR Code (Python `qrcode`) → `tools/ebooks/nao-vos-conformeis/qr.png`.
3. [ ] Escrever conteúdo + HTML branded das 2 versões em `tools/ebooks/nao-vos-conformeis/`.
4. [ ] Renderizar PDFs via Chromium headless → `public/ebooks/nao-vos-conformeis.pdf`
       (ebook completo) e `public/ebooks/nao-vos-conformeis-apostila-eba.pdf` (apostila).
5. [ ] Adicionar entrada `nao-vos-conformeis` em `src/lib/ebooks.ts`.
6. [ ] `npm run lint` + `npm run build` (gate). Commit + push.

## Pendências para o Edson
- Revisar conteúdo teológico do ebook antes de divulgar (pediram "ajuda da Cláudia").
- A apostila EBA é arquivo de impressão (não servida pelo funil); inserir na diagramação da EBA.
