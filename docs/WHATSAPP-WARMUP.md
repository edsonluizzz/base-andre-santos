# WhatsApp Warmup — guia pós-ban

> Documento criado após o incidente de 2026-06-01 (~21h BRT) quando o número `+55 41 98704-0966` ficou em soft-ban por enviar 500 mensagens iniciais em ~40 min num evento na igreja.

## Diagnóstico do ban

O WhatsApp detecta **padrões de spam** quando:
- Muitas mensagens iniciadas para números que nunca conversaram com você
- Mensagens muito iguais em sequência (mesmo template repetido)
- Volume desproporcional ao "histórico de uso saudável" do número
- Falta de mensagens recebidas (proporção 1-way alto)

Quando detecta, aplica **soft-ban** (24-72h) que bloqueia:
- Iniciar novas conversas
- Adicionar contatos novos a grupos

Mas permite:
- Responder mensagens recebidas
- Continuar conversas já abertas
- Enviar pra grupos onde você já é admin

## Plano de recuperação (do mais conservador ao otimista)

### Dia 0–2 (24-48h após o ban)
**Não envie nada do número.** Deixa descansar completamente.

Se mandar qualquer coisa nesse período → vira ban permanente (irreversível).

### Dia 2–7 (warmup inicial)
- **Máximo 50 mensagens iniciadas/dia**
- Delay entre mensagens: **10-15 min**
- Variar o template (não repetir mesma mensagem literal)
- Priorizar contatos que JÁ responderam antes (não conta como "iniciar")

### Dia 7–14 (warmup intermediário)
- Subir para **100/dia**
- Delay **7-10 min**
- Misturar com **interações orgânicas** (responder mensagens recebidas, postar status, etc)

### Dia 14+ (regime normal pós-warmup)
- Limite: **200/dia** (padrão default do módulo de disparo)
- Delay: **5-10 min**
- **Evitar bursts** mesmo que a conta tenha capacidade — disparo gradual sempre

### Sinal de alerta
Se em qualquer fase você notar:
- Mensagens demorando >30s para enviar
- Z-API retornando erro 400/403
- Contatos relatando "não recebi"
- Botão de iniciar conversa bloqueado

→ **PARA imediatamente** e aguarda 48h antes de retomar.

## Configuração do módulo de disparo

No `/comunicados/disparar`, os defaults do form já refletem regime normal (5-10 min, 200/dia). Para warmup, ajuste manualmente:

| Fase | Delay min (s) | Delay max (s) | Daily Limit |
|---|---|---|---|
| Dia 2-7 | 600 | 900 | 50 |
| Dia 7-14 | 420 | 600 | 100 |
| Dia 14+ | 300 | 600 | 200 |

## Reativando WF3 (cadastro novo → WhatsApp automático)

WF3 e WF1 foram **desativados** no incidente de 2026-06-01. Para reativar:

```bash
JWT='<n8n API JWT>'
curl -X POST -H "X-N8N-API-KEY: $JWT" \
  https://andresantos.app.n8n.cloud/api/v1/workflows/u7pCdMoHT5uqZKet/activate

# WF1 disparo-agendado
curl -X POST -H "X-N8N-API-KEY: $JWT" \
  https://andresantos.app.n8n.cloud/api/v1/workflows/3zMetjbtuIUt3JGX/activate
```

**Pré-requisitos antes de reativar:**
1. Aguardar 48h após o ban
2. Validar status Z-API: `curl https://api.z-api.io/instances/.../status` retorna `connected:true, smartphoneConnected:true`
3. Editar WF3 e WF1 para aumentar delay de 2-4 min → 5-10 min
4. **Considerar não reativar WF3** se o volume típico de cadastros for >50/dia — usar só WF1 (lote agendado 3x/dia)

## Alternativas pra evitar warmup recorrente

1. **Múltiplos números:** dividir base entre 2-3 chips dedicados (cada um respeita 200/dia → 600/dia total)
2. **WhatsApp Business API oficial** (Meta, não Z-API): R$ 1.500–3.000/mês mas sem ban automático, com selo verificado
3. **Cadastro com opt-in real:** o lead manda "OI" pra você primeiro (via link `wa.me/...`) — daí você não está "iniciando", está respondendo. Zero risco de ban.

## Métricas pra monitorar

Adicionar futuramente ao dashboard:
- Mensagens enviadas hoje (`BroadcastDelivery.status=SENT` com `sentAt > 24h`)
- Taxa de entrega (% que viraram `DELIVERED` em <5min)
- Taxa de leitura (% que viraram `READ` em <24h)
- Bounces (`FAILED` com erro `phone-not-on-whatsapp`)

Se a taxa de entrega cair <80%, é sinal precoce de ban iminente.
