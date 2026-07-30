// Magic bytes de imagem — checagem real do conteúdo, não confia no MIME
// declarado pelo cliente (falsificável em multipart/form-data). Usado por toda
// rota de upload que aceita imagem, pra impedir SVG/HTML disfarçado de imagem
// (stored XSS via Blob público) ou qualquer outro tipo não suportado.
const IMAGE_MAGIC: { bytes: number[]; mime: string }[] = [
  { bytes: [0xFF, 0xD8, 0xFF],             mime: "image/jpeg" },
  { bytes: [0x89, 0x50, 0x4E, 0x47],       mime: "image/png"  },
  { bytes: [0x47, 0x49, 0x46, 0x38],       mime: "image/gif"  }, // GIF8
  { bytes: [0x25, 0x50, 0x44, 0x46],       mime: "application/pdf" }, // %PDF
];

export function detectMime(buf: Uint8Array): string | null {
  for (const { bytes, mime } of IMAGE_MAGIC) {
    if (bytes.every((b, i) => buf[i] === b)) return mime;
  }
  // WebP precisa de checagem extra: RIFF????WEBP
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return "image/webp";
  return null;
}

// Só imagens (sem PDF) — usado nas rotas de foto onde só faz sentido imagem.
export function detectImageMime(buf: Uint8Array): string | null {
  const mime = detectMime(buf);
  return mime && mime !== "application/pdf" ? mime : null;
}
