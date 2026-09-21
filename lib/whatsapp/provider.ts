// WhatsApp provider abstraction.
// NOW (web/Vercel): LogProvider — queues only, no real send.
// LATER (admin APP on local PC): LocalGatewayProvider via whatsapp-web.js/Baileys.

export type WhatsAppMode = "web" | "local";

export interface WhatsAppMessage {
  to: string; // E.164 e.g. 2010xxxxxxx
  body: string;
}

export interface WhatsAppProvider {
  readonly mode: WhatsAppMode;
  send(msg: WhatsAppMessage): Promise<{ ok: boolean; id?: string; error?: string }>;
}

class LogProvider implements WhatsAppProvider {
  readonly mode: WhatsAppMode = "web";
  async send(msg: WhatsAppMessage) {
    console.log("[whatsapp:queue-only]", msg.to, msg.body.slice(0, 80));
    return { ok: true, id: `queued-${Date.now()}` };
  }
}

// Future: local free sender runs only on the admin PC.
// import WhatsAppLocalClient and implement send() with delay + session.
class LocalGatewayProvider implements WhatsAppProvider {
  readonly mode: WhatsAppMode = "local";
  async send(_msg: WhatsAppMessage): Promise<{ ok: boolean; id?: string; error?: string }> {
    throw new Error(
      "LocalGateway not wired yet — will be enabled when admin moves to APP."
    );
  }
}

export function getWhatsAppProvider(): WhatsAppProvider {
  return process.env.WHATSAPP_MODE === "local"
    ? new LocalGatewayProvider()
    : new LogProvider();
}
