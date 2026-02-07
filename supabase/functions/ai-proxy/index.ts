import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { z } from "npm:zod@3.22.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ProxyRequestSchema = z.object({
  provider: z.enum(["openai", "gemini", "anthropic", "openrouter"]),
  endpoint: z.string().min(1).max(500),
  method: z.enum(["GET", "POST", "PUT", "DELETE"]).default("POST"),
  body: z.record(z.unknown()).optional(),
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}

async function deriveKey(passphrase: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode("nightcafe-companion-v1"),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );
}

async function decrypt(encrypted: string, passphrase: string): Promise<string> {
  const key = await deriveKey(passphrase);
  const combined = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const dec = new TextDecoder();
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext,
  );
  return dec.decode(decrypted);
}

const PROVIDER_BASE_URLS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
  gemini: "https://generativelanguage.googleapis.com/v1",
  openrouter: "https://openrouter.ai/api/v1",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("Missing authorization", 401);
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return errorResponse("Unauthorized", 401);
    }

    const body = await req.json();
    const validated = ProxyRequestSchema.safeParse(body);
    if (!validated.success) {
      return errorResponse(validated.error.errors[0].message);
    }

    const { provider, endpoint, method, body: requestBody } = validated.data;

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceRoleKey,
    );

    const { data: keyData, error: keyError } = await adminClient
      .from("user_api_keys")
      .select("encrypted_key")
      .eq("user_id", user.id)
      .eq("provider", provider)
      .eq("is_active", true)
      .maybeSingle();

    if (keyError || !keyData) {
      return errorResponse(
        `No active API key configured for ${provider}`,
        404,
      );
    }

    const apiKey = await decrypt(keyData.encrypted_key, serviceRoleKey);

    const baseUrl = PROVIDER_BASE_URLS[provider];
    if (!baseUrl) {
      return errorResponse("Unsupported provider");
    }

    const targetUrl = `${baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (provider === "openai" || provider === "openrouter") {
      headers["Authorization"] = `Bearer ${apiKey}`;
    } else if (provider === "anthropic") {
      headers["x-api-key"] = apiKey;
      headers["anthropic-version"] = "2023-06-01";
    } else if (provider === "gemini") {
    }

    const fetchUrl = provider === "gemini" ? `${targetUrl}?key=${apiKey}` : targetUrl;

    const response = await fetch(fetchUrl, {
      method,
      headers,
      body: requestBody ? JSON.stringify(requestBody) : undefined,
    });

    const responseData = await response.json();

    if (!response.ok) {
      return jsonResponse(
        {
          error: "API request failed",
          details: responseData,
          status: response.status,
        },
        response.status,
      );
    }

    return jsonResponse(responseData);
  } catch (err) {
    console.error("Proxy error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500,
    );
  }
});
