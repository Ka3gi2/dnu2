// Shared WhatsApp gateway helpers (admin app only — never Vercel).

// Egypt mobile 01xxxxxxxxx -> 201xxxxxxxxx (E.164 without +)
export function toWaNumber(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("01")) return "2" + d;
  return d;
}

export function gatewayConfig() {
  if ((process.env.WHATSAPP_MODE ?? "web") !== "local") {
    throw Object.assign(
      new Error("الإرسال التلقائي من تطبيق الأدمن فقط — افتح الصفحة من جهاز الأدمن."),
      { status: 403 },
    );
  }
  const perMinute = Number(process.env.WHATSAPP_RATE_PER_MINUTE ?? 40) || 40;
  return {
    gateway: (process.env.WHATSAPP_GATEWAY_URL ?? "http://localhost:3001").replace(/\/$/, ""),
    secret: process.env.WHATSAPP_GATEWAY_SECRET ?? "",
    perMinute,
    gapMs: Math.max(1000, Math.floor(60000 / perMinute)),
  };
}

export async function checkGateway(gateway: string): Promise<boolean> {
  try {
    const h = await fetch(`${gateway}/status`, { signal: AbortSignal.timeout(8000) });
    return h.ok;
  } catch {
    return false;
  }
}

export async function sendOne(gateway: string, secret: string, to: string, message: string) {
  const res = await fetch(`${gateway}/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { "x-gateway-secret": secret } : {}),
    },
    body: JSON.stringify({ to: toWaNumber(to), message }),
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error((d as { error?: string }).error ?? `gateway ${res.status}`);
  }
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Send a file (e.g. Excel sheet) as a WhatsApp document via the gateway.
export async function sendFile(gateway: string, secret: string, to: string, filename: string, buf: Buffer) {
  const res = await fetch(`${gateway}/send-file`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { "x-gateway-secret": secret } : {}),
    },
    body: JSON.stringify({
      to: toWaNumber(to),
      filename,
      mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      data: buf.toString("base64"),
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error((d as { error?: string }).error ?? `gateway ${res.status}`);
  }
}
