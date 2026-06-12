// sw.js — KILL-SWITCH (não é um service worker funcional).
//
// Contexto: um SW antigo (gerado por engano pelo build do app "Ovile Igreja",
// com precache de rotas como /ministerios, /membros, /select-church) ficou
// registrado nos dispositivos. Ele interceptava as navegações com NetworkFirst
// e servia páginas autenticadas do cache, fazendo o logout parecer não funcionar.
//
// Este arquivo substitui aquele SW: ao ser instalado, limpa todos os caches,
// se desregistra e recarrega as janelas abertas para buscar tudo da rede.
// O next-pwa está desativado, então nenhum SW novo é registrado depois disso.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      } catch {
        // ignora — mesmo sem limpar o cache, o unregister abaixo encerra o SW
      }
      try {
        await self.registration.unregister();
      } catch {
        // ignora
      }
      const clients = await self.clients.matchAll({ type: "window" });
      clients.forEach((client) => client.navigate(client.url));
    })()
  );
});

// Não intercepta nenhum fetch: tudo vai direto para a rede.
