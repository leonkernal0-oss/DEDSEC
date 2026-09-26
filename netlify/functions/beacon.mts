import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";

const SECRET = "axion-remote-2026";

export default async (req: Request) => {
  const store = getStore({ name: "hosts", consistency: "strong" });
  const url = new URL(req.url);

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Secret",
    "Content-Type": "application/json",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (req.method === "POST") {
    try {
      const body = await req.json();
      if (!body || !body.id || body.secret !== SECRET) {
        return new Response(JSON.stringify({ ok: false, error: "bad payload" }), { status: 403, headers });
      }
      const key = `host:${body.id}`;
      const data = {
        id: body.id,
        hostname: body.hostname || "",
        local_ip: body.local_ip || "",
        public_url: body.public_url || "",
        user: body.user || "",
        ts: body.ts || new Date().toISOString(),
      };
      await store.setJSON(key, data);
      let index: string[] = [];
      try {
        const raw = await store.get("index", { type: "json" });
        if (Array.isArray(raw)) index = raw;
      } catch {}
      if (!index.includes(body.id)) {
        index.push(body.id);
        if (index.length > 50) index = index.slice(-50);
        await store.setJSON("index", index);
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
    } catch (e: any) {
      return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers });
    }
  }

  if (req.method === "GET") {
    try {
      let index: string[] = [];
      try {
        const raw = await store.get("index", { type: "json" });
        if (Array.isArray(raw)) index = raw;
      } catch {}
      const hosts = [];
      for (const id of index) {
        const h = await store.get(`host:${id}`, { type: "json" });
        if (h) hosts.push(h);
      }
      hosts.sort((a: any, b: any) => (b.ts || "").localeCompare(a.ts || ""));
      return new Response(JSON.stringify({ hosts }), { status: 200, headers });
    } catch (e: any) {
      return new Response(JSON.stringify({ hosts: [], error: String(e) }), { status: 200, headers });
    }
  }

  return new Response(JSON.stringify({ error: "method" }), { status: 405, headers });
};

export const config: Config = {
  path: "/api/beacon",
};
