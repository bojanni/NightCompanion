import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

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
    ["encrypt", "decrypt"],
  );
}

async function decrypt(
  ciphertext: string,
  passphrase: string,
): Promise<string> {
  const key = await deriveKey(passphrase);
  const combined = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    data,
  );
  return new TextDecoder().decode(decrypted);
}

async function fetchImageAsBase64(
  url: string,
): Promise<{ data: string; mimeType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const buffer = await res.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return {
    data: btoa(binary),
    mimeType: res.headers.get("content-type") || "image/jpeg",
  };
}

interface ImageData {
  url?: string;
  base64?: string;
  mimeType?: string;
}

async function callOpenAI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  images?: ImageData[],
  maxTokens = 1500,
) {
  let userContent: unknown;
  if (images && images.length > 0) {
    const parts: unknown[] = [{ type: "text", text: userPrompt }];
    for (const img of images) {
      if (img.url) {
        parts.push({ type: "image_url", image_url: { url: img.url } });
      } else if (img.base64) {
        parts.push({
          type: "image_url",
          image_url: {
            url: `data:${img.mimeType || "image/jpeg"};base64,${img.base64}`,
          },
        });
      }
    }
    userContent = parts;
  } else {
    userContent = userPrompt;
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      temperature: 0.7,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error: ${res.status} - ${err}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

async function callGemini(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  images?: ImageData[],
  maxTokens = 1500,
) {
  const parts: unknown[] = [{ text: userPrompt }];

  if (images && images.length > 0) {
    for (const img of images) {
      let b64 = img.base64;
      let mime = img.mimeType || "image/jpeg";
      if (img.url && !b64) {
        const fetched = await fetchImageAsBase64(img.url);
        b64 = fetched.data;
        mime = fetched.mimeType;
      }
      if (b64) {
        parts.push({ inlineData: { mimeType: mime, data: b64 } });
      }
    }
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts }],
        generationConfig: { temperature: 0.7, maxOutputTokens: maxTokens },
      }),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error: ${res.status} - ${err}`);
  }

  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}

async function callAnthropic(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  images?: ImageData[],
  maxTokens = 1500,
) {
  let content: unknown;
  if (images && images.length > 0) {
    const blocks: unknown[] = [];
    for (const img of images) {
      if (img.url) {
        blocks.push({
          type: "image",
          source: { type: "url", url: img.url },
        });
      } else if (img.base64) {
        blocks.push({
          type: "image",
          source: {
            type: "base64",
            media_type: img.mimeType || "image/jpeg",
            data: img.base64,
          },
        });
      }
    }
    blocks.push({ type: "text", text: userPrompt });
    content = blocks;
  } else {
    content = userPrompt;
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error: ${res.status} - ${err}`);
  }

  const data = await res.json();
  return data.content[0].text;
}

async function callOpenRouter(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  images?: ImageData[],
  maxTokens = 1500,
) {
  let userContent: unknown;
  if (images && images.length > 0) {
    const parts: unknown[] = [{ type: "text", text: userPrompt }];
    for (const img of images) {
      if (img.url) {
        parts.push({ type: "image_url", image_url: { url: img.url } });
      } else if (img.base64) {
        parts.push({
          type: "image_url",
          image_url: {
            url: `data:${img.mimeType || "image/jpeg"};base64,${img.base64}`,
          },
        });
      }
    }
    userContent = parts;
  } else {
    userContent = userPrompt;
  }

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.0-flash-001",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      temperature: 0.7,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter API error: ${res.status} - ${err}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

async function callLocalLLM(
  endpointUrl: string,
  modelName: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 1500,
) {
  const endpoint = endpointUrl.endsWith('/') ? endpointUrl.slice(0, -1) : endpointUrl;
  const url = `${endpoint}/v1/chat/completions`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Local LLM API error: ${res.status} - ${err}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

async function callProvider(
  provider: string,
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  images?: ImageData[],
  maxTokens = 1500,
): Promise<string> {
  switch (provider) {
    case "openai":
      return callOpenAI(apiKey, systemPrompt, userPrompt, images, maxTokens);
    case "gemini":
      return callGemini(apiKey, systemPrompt, userPrompt, images, maxTokens);
    case "anthropic":
      return callAnthropic(apiKey, systemPrompt, userPrompt, images, maxTokens);
    case "openrouter":
      return callOpenRouter(apiKey, systemPrompt, userPrompt, images, maxTokens);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

const MODEL_CATALOG = `Available NightCafe Models:
1. sdxl | Stable Diffusion XL | All-rounder: landscapes, portraits, wide style range | Cost: Medium | Quality: 4/5 | Best for: landscape, portrait, concept art, photography, fantasy
2. sd3 | Stable Diffusion 3 | Best photorealism, text rendering, anatomy | Cost: Very High | Quality: 5/5 | Best for: portrait, photography, concept art, architecture
3. flux | Flux | Creative compositions, aesthetic quality, text rendering | Cost: High | Quality: 5/5 | Best for: concept art, illustration, portrait, fantasy
4. sd15 | Stable Diffusion 1.5 | Fast, cheap, anime/abstract, rapid iteration | Cost: Low | Quality: 3/5 | Best for: illustration, anime, abstract, quick drafts
5. dalle3 | DALL-E 3 | Best prompt understanding, creative interpretation | Cost: Very High | Quality: 5/5 | Best for: illustration, concept art, complex scenes
6. dalle2 | DALL-E 2 | Simple compositions, clean aesthetic | Cost: Medium | Quality: 3/5 | Best for: illustration, abstract, simple subjects
7. artistic-v3 | NightCafe Artistic | Painterly effects, style transfer, moody atmospheres | Cost: Low | Quality: 3/5 | Best for: abstract, landscape, fantasy, painterly styles
8. realvisxl | RealVisXL | Photorealism specialist, natural skin/lighting | Cost: Medium | Quality: 4/5 | Best for: portrait, photography, nature, stock photo style
9. dreamshaper-xl | DreamShaper XL | Fantasy, characters, dreamy aesthetics, anime-influenced | Cost: Medium | Quality: 4/5 | Best for: fantasy, character, illustration, anime
10. juggernaut-xl | Juggernaut XL | Exceptional detail, cinematic, complex scenes | Cost: Medium | Quality: 5/5 | Best for: portrait, landscape, concept art, sci-fi`;

const SYSTEM_PROMPTS: Record<string, string> = {
  improve: `You are an expert AI image prompt engineer for NightCafe Studio. Your job is to take a user's image generation prompt and improve it for better results.

Rules:
- Keep the core subject and intent intact
- Add specific technical terms that improve quality (lighting, composition, resolution)
- Add atmosphere and mood descriptors
- Add style-specific terms based on the desired aesthetic
- Keep the improved prompt under 150 words
- Return ONLY the improved prompt text, nothing else
- Do not add quotation marks around the prompt`,

  "analyze-style": `You are an AI art style analyst. You analyze collections of image generation prompts to identify patterns, preferences, and artistic tendencies.

Given a collection of prompts, provide:
1. A brief style profile (2-3 sentences describing their overall aesthetic)
2. Top 3 recurring themes they gravitate toward
3. Top 3 techniques or modifiers they use most
4. 2-3 suggestions for new directions they might enjoy based on their style
5. A "style signature" - a short phrase that captures their unique aesthetic

Format your response as JSON with these keys: profile, themes (array), techniques (array), suggestions (array), signature`,

  generate: `You are a creative AI image prompt generator for NightCafe Studio. You generate detailed, optimized prompts for AI image generation based on the user's natural language description, their style preferences, and their history of successful prompts.

Rules:
- Transform casual descriptions into detailed, technical prompts optimized for NightCafe
- Include subject, setting, lighting, mood, style, and quality modifiers
- When style preferences are provided, weight the prompt toward those preferences
- When successful example prompts are provided, learn from their patterns: note their keywords, structure, lighting choices, and quality modifiers, then apply similar techniques
- When character references are provided, incorporate their descriptions naturally
- Use proper NightCafe keywords: lighting terms (volumetric, rim light, god rays), quality terms (8k, ultra detailed, masterpiece), composition terms (cinematic, wide angle, close-up)
- Include artist style references when appropriate (e.g., "in the style of Studio Ghibli", "Greg Rutkowski style")
- Keep prompts between 60-120 words for optimal NightCafe results
- Return ONLY the prompt text, nothing else
- Do not add quotation marks around the prompt`,

  diagnose: `You are an AI image generation troubleshooting expert. Given a prompt and description of what went wrong, analyze why the generation may have failed or produced poor results.

Provide:
1. Likely cause of the issue (2-3 sentences)
2. 2-3 specific fixes to try
3. An improved version of the prompt that addresses the issues

Format your response as JSON with these keys: cause, fixes (array of strings), improvedPrompt`,

  "recommend-models": `You are a NightCafe Studio model selection expert. Given a user's image generation prompt, analyze it and recommend the best models from the catalog.

${MODEL_CATALOG}

Analyze the prompt's style keywords, subject matter, complexity, quality requirements, and artistic intent. Consider the user's budget preference if provided.

Return a JSON array of the top 3 recommended models:
{
  "recommendations": [
    {
      "modelId": "model-id-from-catalog",
      "modelName": "Full model name",
      "matchScore": 85,
      "reasoning": "2-3 sentence explanation of why this model fits",
      "tips": ["1-2 specific tips for using this prompt with this model"]
    }
  ]
}`,

  "analyze-image": `You are an AI image generation expert and art critic. Analyze this AI-generated image considering composition, technical execution, and artistic merit.

Evaluate:
1. Composition - framing, balance, focal point, rule of thirds
2. Lighting - quality, direction, mood contribution
3. Color palette - harmony, temperature, saturation
4. Technical quality - artifacts, detail consistency, sharpness
5. Subject rendering - proportions, accuracy, appeal
6. How well the image matches the prompt intent (if prompt provided)

Return JSON:
{
  "composition": "Brief evaluation",
  "lighting": "Brief evaluation",
  "colors": "Brief evaluation",
  "technicalQuality": "Brief evaluation",
  "overallScore": 7,
  "promptMatch": 75,
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "suggestions": ["actionable suggestion 1", "actionable suggestion 2", "actionable suggestion 3"],
  "improvedPrompt": "An improved version of the prompt addressing the weaknesses"
}`,

  "batch-analyze": `You are an AI image generation expert comparing multiple AI-generated images created from the same prompt using different models.

For each image (labeled by number and model), evaluate composition, lighting, colors, technical quality, and how well it matches the original prompt intent (promptMatch 0-100).

Then compare all images to determine which is best, identify common issues (likely prompt problems), and what each model uniquely excels at.

Return JSON:
{
  "analyses": [
    {
      "imageIndex": 0,
      "model": "model name",
      "overallScore": 8.5,
      "promptMatch": 85,
      "composition": "evaluation",
      "lighting": "evaluation",
      "colors": "evaluation",
      "technicalQuality": "evaluation",
      "strengths": ["..."],
      "weaknesses": ["..."]
    }
  ],
  "comparison": {
    "winnerIndex": 0,
    "winnerReasoning": "2-3 sentences explaining why this image is best overall",
    "commonIssues": ["issues present across all images, indicating prompt problems"],
    "modelStrengths": {
      "Model Name": ["what this model did uniquely well"]
    }
  },
  "improvedPrompt": "refined prompt that addresses common issues found across all images"
}`,

  "generate-variations": `You are an expert AI image prompt engineer for NightCafe Studio. Generate 6 different variations of the base prompt, each exploring a different aspect:

1. Lighting Variation - Same subject but with dramatically different lighting (e.g., golden hour, dramatic shadows, soft diffused)
2. Style Variation - Same subject but in a completely different art style (e.g., watercolor, cyberpunk, Art Nouveau)
3. Composition Variation - Same subject but different framing, angle, or perspective (e.g., close-up, aerial view, wide cinematic)
4. Mood Variation - Same subject but different emotional tone or atmosphere (e.g., melancholic, energetic, mysterious)
5. Detail Variation - Add or emphasize specific technical details (e.g., ultra-detailed textures, minimalist, macro photography)
6. Color Variation - Same subject but with a different color palette or treatment (e.g., monochrome, vibrant neon, muted earth tones)

Keep the core subject recognizable but explore creative interpretations. Each variation should be 60-120 words.

Return JSON:
{
  "variations": [
    {
      "type": "lighting",
      "prompt": "full variation text here"
    },
    {
      "type": "style",
      "prompt": "full variation text here"
    },
    {
      "type": "composition",
      "prompt": "full variation text here"
    },
    {
      "type": "mood",
      "prompt": "full variation text here"
    },
    {
      "type": "detail",
      "prompt": "full variation text here"
    },
    {
      "type": "color",
      "prompt": "full variation text here"
    }
  ]
}`,
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return errorResponse("Unauthorized", 401);
    }

    const { action, payload } = await req.json();

    if (!action || !SYSTEM_PROMPTS[action]) {
      return errorResponse(
        "Invalid action. Use: improve, analyze-style, generate, diagnose, recommend-models, analyze-image, batch-analyze",
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: activeLocalEndpoint } = await adminClient
      .from("user_local_endpoints")
      .select("provider, endpoint_url, model_name")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    const { data: activeKey } = await adminClient
      .from("user_api_keys")
      .select("provider, encrypted_key")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    let provider = "openai";
    let apiKey: string | null = null;
    let isLocalLLM = false;
    let localEndpointUrl = "";
    let localModelName = "";

    if (activeLocalEndpoint) {
      isLocalLLM = true;
      provider = activeLocalEndpoint.provider;
      localEndpointUrl = activeLocalEndpoint.endpoint_url;
      localModelName = activeLocalEndpoint.model_name;
    } else if (activeKey) {
      provider = activeKey.provider;
      apiKey = await decrypt(activeKey.encrypted_key, serviceRoleKey);
    } else {
      apiKey = Deno.env.get("OPENAI_API_KEY") ?? null;
    }

    if (!isLocalLLM && !apiKey) {
      return errorResponse(
        "No AI provider configured. Go to Settings to add your API key for OpenAI, Gemini, Claude, OpenRouter, or configure a local LLM (Ollama/LM Studio).",
        503,
      );
    }

    let userPrompt = "";
    let images: ImageData[] | undefined;
    let maxTokens = 1500;

    switch (action) {
      case "improve":
        if (!payload?.prompt) return errorResponse("Missing prompt");
        userPrompt = `Improve this image generation prompt:\n\n${payload.prompt}`;
        break;

      case "analyze-style":
        if (!payload?.prompts || !Array.isArray(payload.prompts)) {
          return errorResponse("Missing prompts array");
        }
        userPrompt = `Analyze the style patterns in these image generation prompts:\n\n${payload.prompts.map((p: string, i: number) => `${i + 1}. ${p}`).join("\n")}`;
        break;

      case "generate": {
        if (!payload?.description) return errorResponse("Missing description");
        const sections: string[] = [];

        if (payload.preferences) {
          const prefs = payload.preferences;
          const prefParts: string[] = [];
          if (prefs.style) prefParts.push(`Style preference: ${prefs.style}`);
          if (prefs.mood) prefParts.push(`Mood: ${prefs.mood}`);
          if (prefs.subject) prefParts.push(`Subject type: ${prefs.subject}`);
          if (prefParts.length > 0) {
            sections.push(`USER PREFERENCES:\n${prefParts.join("\n")}`);
          }
        }

        if (
          payload.successfulPrompts &&
          Array.isArray(payload.successfulPrompts) &&
          payload.successfulPrompts.length > 0
        ) {
          sections.push(
            `USER'S TOP-RATED SUCCESSFUL PROMPTS (learn from these patterns):\n${payload.successfulPrompts.map((p: string, i: number) => `${i + 1}. ${p}`).join("\n")}`,
          );
        }

        if (payload.context) {
          sections.push(
            `USER'S CHARACTERS/REFERENCES:\n${payload.context}`,
          );
        }

        sections.push(`GENERATE A PROMPT FOR:\n${payload.description}`);
        userPrompt = sections.join("\n\n");
        break;
      }

      case "diagnose":
        if (!payload?.prompt || !payload?.issue) {
          return errorResponse("Missing prompt or issue description");
        }
        userPrompt = `Prompt used: "${payload.prompt}"\n\nWhat went wrong: ${payload.issue}`;
        break;

      case "recommend-models": {
        if (!payload?.prompt) return errorResponse("Missing prompt");
        const parts: string[] = [
          `Analyze this prompt and recommend the best NightCafe models:\n\n"${payload.prompt}"`,
        ];
        if (payload.budget) {
          parts.push(`\nBudget preference: ${payload.budget} (prefer matching cost models)`);
        }
        if (payload.style) {
          parts.push(`Style preference: ${payload.style}`);
        }
        userPrompt = parts.join("\n");
        break;
      }

      case "analyze-image": {
        if (!payload?.imageUrl && !payload?.imageBase64) {
          return errorResponse("Missing image (provide imageUrl or imageBase64)");
        }
        images = [{
          url: payload.imageUrl,
          base64: payload.imageBase64,
          mimeType: payload.imageMimeType || "image/jpeg",
        }];
        const promptParts: string[] = ["Analyze this AI-generated image."];
        if (payload.promptUsed) {
          promptParts.push(`\nThe prompt used to generate it was: "${payload.promptUsed}"`);
        }
        promptParts.push(
          "\nProvide a detailed analysis with strengths, weaknesses, suggestions, and an improved prompt.",
        );
        userPrompt = promptParts.join("");
        break;
      }

      case "batch-analyze": {
        if (!payload?.images || !Array.isArray(payload.images) || payload.images.length < 2) {
          return errorResponse("Provide at least 2 images for comparison");
        }
        images = payload.images.map((img: { imageUrl?: string; imageBase64?: string; imageMimeType?: string }) => ({
          url: img.imageUrl,
          base64: img.imageBase64,
          mimeType: img.imageMimeType || "image/jpeg",
        }));
        maxTokens = 3000;
        const labels = payload.images
          .map((img: { model?: string }, i: number) => `Image ${i + 1}: ${img.model || "Unknown model"}`)
          .join("\n");
        const batchParts: string[] = [
          `Compare these ${images.length} AI-generated images.\n\nImage labels:\n${labels}`,
        ];
        if (payload.promptUsed) {
          batchParts.push(`\nThe shared prompt used for all images: "${payload.promptUsed}"`);
        }
        batchParts.push(
          "\nAnalyze each image individually, then compare them. Pick a winner and suggest an improved prompt.",
        );
        userPrompt = batchParts.join("");
        break;
      }

      case "generate-variations": {
        if (!payload?.basePrompt) return errorResponse("Missing basePrompt");
        userPrompt = `Generate 6 creative variations of this base prompt:\n\n"${payload.basePrompt}"`;
        maxTokens = 2000;
        break;
      }
    }

    let result: string;
    if (isLocalLLM) {
      if (images && images.length > 0) {
        return errorResponse(
          "Image analysis is not supported with local LLMs. Please configure a cloud provider (OpenAI, Gemini, Claude, or OpenRouter) for image analysis features.",
          400,
        );
      }
      result = await callLocalLLM(
        localEndpointUrl,
        localModelName,
        SYSTEM_PROMPTS[action],
        userPrompt,
        maxTokens,
      );
    } else {
      result = await callProvider(
        provider,
        apiKey!,
        SYSTEM_PROMPTS[action],
        userPrompt,
        images,
        maxTokens,
      );
    }

    let parsed = result;
    if (
      action === "analyze-style" ||
      action === "diagnose" ||
      action === "recommend-models" ||
      action === "analyze-image" ||
      action === "batch-analyze" ||
      action === "generate-variations"
    ) {
      try {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonObj = JSON.parse(jsonMatch[0]);
          if (action === "generate-variations" && jsonObj.variations) {
            parsed = jsonObj.variations;
          } else {
            parsed = jsonObj;
          }
        }
      } catch {
        parsed = result;
      }
    }

    return jsonResponse({ result: parsed });
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500,
    );
  }
});
