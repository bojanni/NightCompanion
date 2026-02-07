import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { z } from "npm:zod@3.22.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SaveKeySchema = z.object({
  action: z.literal("save"),
  provider: z.enum(["openai", "gemini", "anthropic", "openrouter"]),
  apiKey: z.string().min(8, "API key too short").max(500, "API key too long"),
});

const DeleteKeySchema = z.object({
  action: z.literal("delete"),
  provider: z.enum(["openai", "gemini", "anthropic", "openrouter"]),
});

const SetActiveSchema = z.object({
  action: z.literal("set-active"),
  provider: z.enum(["openai", "gemini", "anthropic", "openrouter"]),
});

const ListKeysSchema = z.object({
  action: z.literal("list"),
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

const VALID_PROVIDERS = ["openai", "gemini", "anthropic", "openrouter"];

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
    ["encrypt", "decrypt"],
  );
}

async function encrypt(plaintext: string, passphrase: string): Promise<string> {
  const key = await deriveKey(passphrase);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plaintext),
  );
  const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode(...combined));
}

function maskKey(key: string): string {
  if (key.length <= 8) return "****";
  return key.slice(0, 4) + "..." + key.slice(-4);
}

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

    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) {
      return errorResponse("Unauthorized", 401);
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceRoleKey,
    );

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "list": {
        const validated = ListKeysSchema.safeParse(body);
        if (!validated.success) {
          return errorResponse(validated.error.errors[0].message);
        }

        const { data, error } = await adminClient
          .from("user_api_keys")
          .select("provider, key_hint, is_active, updated_at")
          .eq("user_id", user.id)
          .order("provider");

        if (error) throw error;
        return jsonResponse({ keys: data ?? [] });
      }

      case "save": {
        const validated = SaveKeySchema.safeParse(body);
        if (!validated.success) {
          return errorResponse(validated.error.errors[0].message);
        }

        const { provider, apiKey } = validated.data;
        const trimmed = apiKey.trim();
        const encrypted = await encrypt(trimmed, serviceRoleKey);
        const hint = maskKey(trimmed);

        const { data: existing } = await adminClient
          .from("user_api_keys")
          .select("id")
          .eq("user_id", user.id)
          .eq("is_active", true);

        const isFirst = !existing || existing.length === 0;

        const { error } = await adminClient
          .from("user_api_keys")
          .upsert(
            {
              user_id: user.id,
              provider,
              encrypted_key: encrypted,
              key_hint: hint,
              is_active: isFirst,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,provider" },
          );

        if (error) throw error;
        return jsonResponse({ success: true, hint, is_active: isFirst });
      }

      case "delete": {
        const validated = DeleteKeySchema.safeParse(body);
        if (!validated.success) {
          return errorResponse(validated.error.errors[0].message);
        }

        const { provider } = validated.data;
        const { data: toDelete } = await adminClient
          .from("user_api_keys")
          .select("is_active")
          .eq("user_id", user.id)
          .eq("provider", provider)
          .maybeSingle();

        const { error } = await adminClient
          .from("user_api_keys")
          .delete()
          .eq("user_id", user.id)
          .eq("provider", provider);

        if (error) throw error;

        if (toDelete?.is_active) {
          const { data: remaining } = await adminClient
            .from("user_api_keys")
            .select("provider")
            .eq("user_id", user.id)
            .limit(1);

          if (remaining && remaining.length > 0) {
            await adminClient
              .from("user_api_keys")
              .update({ is_active: true })
              .eq("user_id", user.id)
              .eq("provider", remaining[0].provider);
          }
        }

        return jsonResponse({ success: true });
      }

      case "set-active": {
        const validated = SetActiveSchema.safeParse(body);
        if (!validated.success) {
          return errorResponse(validated.error.errors[0].message);
        }

        const { provider } = validated.data;
        const { data: exists } = await adminClient
          .from("user_api_keys")
          .select("id")
          .eq("user_id", user.id)
          .eq("provider", provider)
          .maybeSingle();

        if (!exists) {
          return errorResponse("Provider key not configured");
        }

        await adminClient
          .from("user_api_keys")
          .update({ is_active: false })
          .eq("user_id", user.id);

        const { error } = await adminClient
          .from("user_api_keys")
          .update({ is_active: true })
          .eq("user_id", user.id)
          .eq("provider", provider);

        if (error) throw error;
        return jsonResponse({ success: true });
      }

      default:
        return errorResponse(
          "Invalid action. Use: list, save, delete, set-active",
        );
    }
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500,
    );
  }
});
