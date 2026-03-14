import { ipcMain } from 'electron'
import { app } from 'electron'
import path from 'path'
import { appendFile, mkdir, readFile } from 'fs/promises'
import type { OpenRouterSettings } from './settings'

const AI_REQUEST_LOG_FILE = 'ai-api-requests.jsonl'
const TITLE_MAX_LENGTH = 140
const DEFAULT_MAX_WORDS = 70
const MAX_ALLOWED_WORDS = 100

const LANGUAGE_INSTRUCTION = "CRITICAL: All output, including descriptions, reasoning, and analysis, MUST use English (UK) spelling and terminology (e.g., 'colour', 'centre', 'maximise')."

const BASE_PERSONA = `You are an expert AI Art Prompt Engineer specializing in NightCafe Studio. Your goal is to craft highly detailed, optimized text-to-image prompts for advanced generative AI models. ${LANGUAGE_INSTRUCTION}

Construct your prompts using the following elements, blending them seamlessly into a single, cohesive paragraph:
- Subject & Action: Clear, specific description of the main focus and what is happening.
- Style & Medium: Defined art form (e.g., 'digital concept art', 'oil on canvas', 'macro photography').
- Setting & Composition: Background, environment, camera angle (e.g., 'low angle shot', 'rule of thirds'), and framing.
- Lighting & Atmosphere: Specific lighting setups (e.g., 'volumetric lighting', 'golden hour') and mood.
- Technical Modifiers: Enhancement tags (e.g., '8k resolution', 'masterpiece', 'trending on ArtStation', 'intricate details').

STRICT FORMATTING RULE: Output ONLY the final prompt text. Do NOT use bullet points, line breaks, labels (like 'Subject:'), or introductory/concluding remarks. The output must be a single, flowing descriptive paragraph.`

const IMPROVE_INSTRUCTION = `Analyze the following basic concept and elevate it into a professional, highly detailed prompt following all your persona rules. Expand on missing elements (such as style, lighting, and composition) while strictly preserving the original intent.`
const IMPROVE_NEGATIVE_INSTRUCTION = `Improve the following negative prompt for AI image generation. Keep it concise, high-signal, comma-separated, and focused on common visual defects and unwanted artifacts. Remove duplicates, keep original intent, and return only the final negative prompt text.`
const NEGATIVE_PROMPT_INSTRUCTION = `Based on the following positive prompt, generate a concise negative prompt for NightCafe Studio. ${LANGUAGE_INSTRUCTION}

The negative prompt should list elements, styles, and artefacts to actively avoid in the generated image. Focus on:
- Technical flaws: blurry, out of focus, low resolution, jpeg artefacts, noise, grain, pixelated
- Compositional issues: cropped, cut off, bad framing, watermark, text, signature, border
- Anatomical errors (if figures are present): extra limbs, deformed hands, bad anatomy, mutated, disfigured
- Style conflicts: anything that contradicts the intended art style of the positive prompt
- Quality indicators: low quality, worst quality, draft, sketch (unless the style is intentionally sketch-like)

STRICT FORMATTING RULE: Output ONLY a comma-separated list of negative keywords and short phrases. No bullet points, no labels, no explanations. Single line output only.`

const TITLE_SYSTEM_INSTRUCTION = `You generate concise, descriptive library titles for AI art prompts. ${LANGUAGE_INSTRUCTION} Return only the final title text with no quotes, no labels, and no extra commentary. Keep it under ${TITLE_MAX_LENGTH} characters and aim for 4 to 10 words.`

const QUICK_EXPAND_CREATIVITY: Record<string, string> = {
  focused: 'Expand the following concept into a detailed AI art prompt. Stay true to the original idea — add specific art style, lighting, and composition details that faithfully serve the concept without straying from it.',
  balanced: 'Expand the following concept into a rich, vivid AI art prompt. Add complementary style, atmospheric lighting, interesting composition, and mood while preserving the original intent.',
  wild: 'Take bold creative liberties with the following concept. Push it in an unexpected artistic direction — unusual combinations, striking visual contrasts, or a unique aesthetic twist. Use the concept as a loose starting point, not a strict constraint.',
}

const QUICK_EXPAND_TEMPERATURES: Record<string, number> = {
  focused: 0.7,
  balanced: 1.0,
  wild: 1.4,
}

function normalizeGeneratedTitle(value: string) {
  return value
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .slice(0, TITLE_MAX_LENGTH)
    .trim()
}

function getAiRequestLogPath() {
  return path.join(app.getPath('userData'), 'logs', AI_REQUEST_LOG_FILE)
}

function getSettingsFilePath() {
  return path.join(app.getPath('userData'), 'settings.json')
}

async function readStoredSettings(): Promise<{ openRouter?: Partial<OpenRouterSettings>; aiConfig?: { dashboardRoleRouting?: unknown }; localEndpoints?: unknown }> {
  try {
    const raw = await readFile(getSettingsFilePath(), 'utf-8')
    return JSON.parse(raw) as { openRouter?: Partial<OpenRouterSettings>; aiConfig?: { dashboardRoleRouting?: unknown }; localEndpoints?: unknown }
  } catch (error) {
    const err = error as NodeJS.ErrnoException
    if (err.code === 'ENOENT') return {}
    throw error
  }
}

function normalizeBaseUrl(input: string) {
  return input.replace(/\/+$/, '')
}

async function appendAiRequestLog(record: Record<string, unknown>) {
  const logPath = getAiRequestLogPath()
  await mkdir(path.dirname(logPath), { recursive: true })
  await appendFile(logPath, `${JSON.stringify(record)}\n`, 'utf-8')
}

export function registerAiIpc({
  getOpenRouterSettings,
  getAiApiRequestLoggingEnabled,
}: {
  getOpenRouterSettings: () => Promise<OpenRouterSettings>
  getAiApiRequestLoggingEnabled: () => Promise<boolean>
}) {
  ipcMain.handle('generator:magicRandom', async (_, input?: { presetName?: string; maxWords?: number; greylistEnabled?: boolean; greylistWords?: string[] }) => {
    const requestId = crypto.randomUUID()
    const startedAt = Date.now()
    let requestModel = ''
    let appliedMaxWords = DEFAULT_MAX_WORDS
    let requestPayload: Record<string, unknown> | null = null
    let responseStatus: number | null = null
    let resultPrompt = ''
    let errorMessage: string | null = null

    try {
      const settings = await getOpenRouterSettings()
      requestModel = settings.model

      if (!settings.apiKey) {
        return { error: 'OpenRouter API key is missing. Add it in Settings first.' }
      }

      const presetName = input?.presetName?.trim()
      const maxWords = Number.isFinite(input?.maxWords)
        ? Math.max(1, Math.min(MAX_ALLOWED_WORDS, Math.floor(input?.maxWords as number)))
        : DEFAULT_MAX_WORDS
      appliedMaxWords = maxWords
      const greylistEnabled = input?.greylistEnabled !== false
      const greylistWords = (input?.greylistWords ?? [])
        .map((word) => word.trim().toLowerCase())
        .filter((word) => word.length > 0)
      const uniqueGreylistWords = Array.from(new Set(greylistWords)).slice(0, 30)
      const hasGreylist = greylistEnabled && uniqueGreylistWords.length > 0

      const promptParts = [
        'Create one random, vivid text-to-image prompt.',
        `Limit the final prompt to a maximum of ${maxWords} words.`,
        presetName ? `Use this NightCafe preset as mandatory style guidance: ${presetName}.` : '',
        'Pick any surprising subject.',
        hasGreylist
          ? `Avoid these words when writing the prompt (or keep their probability very low): ${uniqueGreylistWords.join(', ')}.`
          : '',
        'Return only the final prompt text.',
      ].filter(Boolean)

      const userPrompt = promptParts.join(' ')

      requestPayload = {
        model: settings.model,
        temperature: 1.2,
        max_tokens: 220,
        messages: [
          {
            role: 'system',
            content: BASE_PERSONA,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${settings.apiKey}`,
          'Content-Type': 'application/json',
          ...(settings.siteUrl ? { 'HTTP-Referer': settings.siteUrl } : {}),
          ...(settings.appName ? { 'X-Title': settings.appName } : {}),
        },
        body: JSON.stringify(requestPayload),
      })

      responseStatus = response.status

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`OpenRouter request failed (${response.status}): ${errText.slice(0, 300)}`)
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>
      }

      const prompt = payload.choices?.[0]?.message?.content?.trim()
      if (!prompt) {
        throw new Error('No prompt content returned from OpenRouter.')
      }

      resultPrompt = prompt

      return { data: { prompt } }
    } catch (error) {
      errorMessage = String(error)
      return { error: String(error) }
    } finally {
      try {
        const loggingEnabled = await getAiApiRequestLoggingEnabled()
        if (loggingEnabled) await appendAiRequestLog({
          timestamp: new Date().toISOString(),
          requestId,
          endpoint: 'generator:magicRandom',
          provider: 'openrouter',
          model: requestModel,
          durationMs: Date.now() - startedAt,
          status: responseStatus,
          input: {
            presetName: input?.presetName?.trim() || null,
            maxWords: appliedMaxWords,
            greylistEnabled: input?.greylistEnabled !== false,
            greylistWordCount: (input?.greylistWords ?? []).filter((word) => word.trim().length > 0).length,
          },
          requestPayload,
          responsePrompt: resultPrompt || null,
          error: errorMessage,
        })
      } catch (loggingError) {
        console.error('Failed to write AI request log:', loggingError)
      }
    }
  })

  ipcMain.handle('generator:improvePrompt', async (_, input?: { prompt?: string }) => {
    const requestId = crypto.randomUUID()
    const startedAt = Date.now()
    let requestModel = ''
    let requestProvider = ''
    let requestPayload: Record<string, unknown> | null = null
    let responseStatus: number | null = null
    let resultPrompt = ''
    let errorMessage: string | null = null

    try {
      const prompt = input?.prompt?.trim() || ''
      if (!prompt) return { error: 'No prompt to improve.' }

      const stored = await readStoredSettings()
      const roleRouting = stored.aiConfig?.dashboardRoleRouting
      const improveRoute = typeof roleRouting === 'object' && roleRouting !== null
        ? (roleRouting as Record<string, unknown>).improvement
        : undefined

      const providerId = typeof improveRoute === 'object' && improveRoute !== null
        ? String((improveRoute as Record<string, unknown>).providerId || '')
        : ''
      const modelId = typeof improveRoute === 'object' && improveRoute !== null
        ? String((improveRoute as Record<string, unknown>).modelId || '')
        : ''

      if (!providerId || !modelId) {
        return { error: 'No improvement model is selected. Set it in AI Configuration → Improvement.' }
      }

      requestProvider = providerId
      requestModel = modelId

      if (providerId === 'openrouter') {
        const settings = await getOpenRouterSettings()
        if (!settings.apiKey) {
          return { error: 'OpenRouter API key is missing. Add it in Settings first.' }
        }

        requestPayload = {
          model: modelId,
          temperature: 0.7,
          max_tokens: 420,
          messages: [
            {
              role: 'system',
              content: BASE_PERSONA,
            },
            {
              role: 'user',
              content: `${IMPROVE_INSTRUCTION}\n\n${prompt}`,
            },
          ],
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${settings.apiKey}`,
            'Content-Type': 'application/json',
            ...(settings.siteUrl ? { 'HTTP-Referer': settings.siteUrl } : {}),
            ...(settings.appName ? { 'X-Title': settings.appName } : {}),
          },
          body: JSON.stringify(requestPayload),
        })

        responseStatus = response.status

        if (!response.ok) {
          const errText = await response.text()
          throw new Error(`OpenRouter request failed (${response.status}): ${errText.slice(0, 300)}`)
        }

        const payload = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>
        }

        const improved = payload.choices?.[0]?.message?.content?.trim()
        if (!improved) throw new Error('No improved prompt content returned.')

        resultPrompt = improved
        return { data: { prompt: improved } }
      }

      const localEndpointsRaw = stored.localEndpoints
      const localEndpoints = Array.isArray(localEndpointsRaw)
        ? (localEndpointsRaw as Array<Record<string, unknown>>)
        : []
      const endpoint = localEndpoints.find((item) => String(item.provider || '') === providerId)
      const baseUrl = endpoint && typeof endpoint.baseUrl === 'string' ? endpoint.baseUrl : ''
      if (!baseUrl) {
        return { error: `Local provider "${providerId}" is not configured. Set its Base URL in AI Configuration → Configure Providers.` }
      }

      requestPayload = {
        model: modelId,
        temperature: 0.7,
        max_tokens: 420,
        messages: [
          {
            role: 'system',
            content: BASE_PERSONA,
          },
          {
            role: 'user',
            content: `${IMPROVE_INSTRUCTION}\n\n${prompt}`,
          },
        ],
      }

      const response = await fetch(`${normalizeBaseUrl(baseUrl)}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      })

      responseStatus = response.status

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Local AI request failed (${response.status}): ${errText.slice(0, 300)}`)
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>
      }

      const improved = payload.choices?.[0]?.message?.content?.trim()
      if (!improved) throw new Error('No improved prompt content returned.')

      resultPrompt = improved
      return { data: { prompt: improved } }
    } catch (error) {
      errorMessage = String(error)
      return { error: String(error) }
    } finally {
      try {
        const loggingEnabled = await getAiApiRequestLoggingEnabled()
        if (loggingEnabled) await appendAiRequestLog({
          timestamp: new Date().toISOString(),
          requestId,
          endpoint: 'generator:improvePrompt',
          provider: requestProvider,
          model: requestModel,
          durationMs: Date.now() - startedAt,
          status: responseStatus,
          requestPayload,
          responsePrompt: resultPrompt || null,
          error: errorMessage,
        })
      } catch (loggingError) {
        console.error('Failed to write AI request log:', loggingError)
      }
    }
  })

  ipcMain.handle('generator:improveNegativePrompt', async (_, input?: { negativePrompt?: string }) => {
    const requestId = crypto.randomUUID()
    const startedAt = Date.now()
    let requestModel = ''
    let requestProvider = ''
    let requestPayload: Record<string, unknown> | null = null
    let responseStatus: number | null = null
    let resultPrompt = ''
    let errorMessage: string | null = null

    try {
      const negativePrompt = input?.negativePrompt?.trim() || ''
      if (!negativePrompt) return { error: 'No negative prompt to improve.' }

      const stored = await readStoredSettings()
      const roleRouting = stored.aiConfig?.dashboardRoleRouting
      const improveRoute = typeof roleRouting === 'object' && roleRouting !== null
        ? (roleRouting as Record<string, unknown>).improvement
        : undefined

      const providerId = typeof improveRoute === 'object' && improveRoute !== null
        ? String((improveRoute as Record<string, unknown>).providerId || '')
        : ''
      const modelId = typeof improveRoute === 'object' && improveRoute !== null
        ? String((improveRoute as Record<string, unknown>).modelId || '')
        : ''

      if (!providerId || !modelId) {
        return { error: 'No improvement model is selected. Set it in AI Configuration → Improvement.' }
      }

      requestProvider = providerId
      requestModel = modelId

      if (providerId === 'openrouter') {
        const settings = await getOpenRouterSettings()
        if (!settings.apiKey) {
          return { error: 'OpenRouter API key is missing. Add it in Settings first.' }
        }

        requestPayload = {
          model: modelId,
          temperature: 0.4,
          max_tokens: 220,
          messages: [
            {
              role: 'system',
              content: LANGUAGE_INSTRUCTION,
            },
            {
              role: 'user',
              content: `${IMPROVE_NEGATIVE_INSTRUCTION}\n\n${negativePrompt}`,
            },
          ],
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${settings.apiKey}`,
            'Content-Type': 'application/json',
            ...(settings.siteUrl ? { 'HTTP-Referer': settings.siteUrl } : {}),
            ...(settings.appName ? { 'X-Title': settings.appName } : {}),
          },
          body: JSON.stringify(requestPayload),
        })

        responseStatus = response.status

        if (!response.ok) {
          const errText = await response.text()
          throw new Error(`OpenRouter request failed (${response.status}): ${errText.slice(0, 300)}`)
        }

        const payload = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>
        }

        const improved = payload.choices?.[0]?.message?.content?.trim()
        if (!improved) throw new Error('No improved negative prompt content returned.')

        resultPrompt = improved
        return { data: { negativePrompt: improved } }
      }

      const localEndpointsRaw = stored.localEndpoints
      const localEndpoints = Array.isArray(localEndpointsRaw)
        ? (localEndpointsRaw as Array<Record<string, unknown>>)
        : []
      const endpoint = localEndpoints.find((item) => String(item.provider || '') === providerId)
      const baseUrl = endpoint && typeof endpoint.baseUrl === 'string' ? endpoint.baseUrl : ''
      if (!baseUrl) {
        return { error: `Local provider "${providerId}" is not configured. Set its Base URL in AI Configuration → Configure Providers.` }
      }

      requestPayload = {
        model: modelId,
        temperature: 0.4,
        max_tokens: 220,
        messages: [
          {
            role: 'system',
            content: LANGUAGE_INSTRUCTION,
          },
          {
            role: 'user',
            content: `${IMPROVE_NEGATIVE_INSTRUCTION}\n\n${negativePrompt}`,
          },
        ],
      }

      const response = await fetch(`${normalizeBaseUrl(baseUrl)}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      })

      responseStatus = response.status

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Local AI request failed (${response.status}): ${errText.slice(0, 300)}`)
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>
      }

      const improved = payload.choices?.[0]?.message?.content?.trim()
      if (!improved) throw new Error('No improved negative prompt content returned.')

      resultPrompt = improved
      return { data: { negativePrompt: improved } }
    } catch (error) {
      errorMessage = String(error)
      return { error: String(error) }
    } finally {
      try {
        const loggingEnabled = await getAiApiRequestLoggingEnabled()
        if (loggingEnabled) await appendAiRequestLog({
          timestamp: new Date().toISOString(),
          requestId,
          endpoint: 'generator:improveNegativePrompt',
          provider: requestProvider,
          model: requestModel,
          durationMs: Date.now() - startedAt,
          status: responseStatus,
          requestPayload,
          responsePrompt: resultPrompt || null,
          error: errorMessage,
        })
      } catch (loggingError) {
        console.error('Failed to write AI request log:', loggingError)
      }
    }
  })

  ipcMain.handle('generator:generateNegativePrompt', async (_, input?: { prompt?: string }) => {
    const requestId = crypto.randomUUID()
    const startedAt = Date.now()
    let requestModel = ''
    let requestProvider = ''
    let requestPayload: Record<string, unknown> | null = null
    let responseStatus: number | null = null
    let resultPrompt = ''
    let errorMessage: string | null = null

    try {
      const prompt = input?.prompt?.trim() || ''
      if (!prompt) return { error: 'No positive prompt available to generate a negative prompt.' }

      const stored = await readStoredSettings()
      const roleRouting = stored.aiConfig?.dashboardRoleRouting
      const improveRoute = typeof roleRouting === 'object' && roleRouting !== null
        ? (roleRouting as Record<string, unknown>).improvement
        : undefined

      const providerId = typeof improveRoute === 'object' && improveRoute !== null
        ? String((improveRoute as Record<string, unknown>).providerId || '')
        : ''
      const modelId = typeof improveRoute === 'object' && improveRoute !== null
        ? String((improveRoute as Record<string, unknown>).modelId || '')
        : ''

      if (!providerId || !modelId) {
        return { error: 'No improvement model is selected. Set it in AI Configuration → Improvement.' }
      }

      requestProvider = providerId
      requestModel = modelId

      if (providerId === 'openrouter') {
        const settings = await getOpenRouterSettings()
        if (!settings.apiKey) {
          return { error: 'OpenRouter API key is missing. Add it in Settings first.' }
        }

        requestPayload = {
          model: modelId,
          temperature: 0.4,
          max_tokens: 220,
          messages: [
            {
              role: 'system',
              content: LANGUAGE_INSTRUCTION,
            },
            {
              role: 'user',
              content: `${NEGATIVE_PROMPT_INSTRUCTION}\n\n${prompt}`,
            },
          ],
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${settings.apiKey}`,
            'Content-Type': 'application/json',
            ...(settings.siteUrl ? { 'HTTP-Referer': settings.siteUrl } : {}),
            ...(settings.appName ? { 'X-Title': settings.appName } : {}),
          },
          body: JSON.stringify(requestPayload),
        })

        responseStatus = response.status

        if (!response.ok) {
          const errText = await response.text()
          throw new Error(`OpenRouter request failed (${response.status}): ${errText.slice(0, 300)}`)
        }

        const payload = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>
        }

        const generated = payload.choices?.[0]?.message?.content?.trim()
        if (!generated) throw new Error('No generated negative prompt content returned.')

        resultPrompt = generated
        return { data: { negativePrompt: generated } }
      }

      const localEndpointsRaw = stored.localEndpoints
      const localEndpoints = Array.isArray(localEndpointsRaw)
        ? (localEndpointsRaw as Array<Record<string, unknown>>)
        : []
      const endpoint = localEndpoints.find((item) => String(item.provider || '') === providerId)
      const baseUrl = endpoint && typeof endpoint.baseUrl === 'string' ? endpoint.baseUrl : ''
      if (!baseUrl) {
        return { error: `Local provider "${providerId}" is not configured. Set its Base URL in AI Configuration → Configure Providers.` }
      }

      requestPayload = {
        model: modelId,
        temperature: 0.4,
        max_tokens: 220,
        messages: [
          {
            role: 'system',
            content: LANGUAGE_INSTRUCTION,
          },
          {
            role: 'user',
            content: `${NEGATIVE_PROMPT_INSTRUCTION}\n\n${prompt}`,
          },
        ],
      }

      const response = await fetch(`${normalizeBaseUrl(baseUrl)}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      })

      responseStatus = response.status

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Local AI request failed (${response.status}): ${errText.slice(0, 300)}`)
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>
      }

      const generated = payload.choices?.[0]?.message?.content?.trim()
      if (!generated) throw new Error('No generated negative prompt content returned.')

      resultPrompt = generated
      return { data: { negativePrompt: generated } }
    } catch (error) {
      errorMessage = String(error)
      return { error: String(error) }
    } finally {
      try {
        const loggingEnabled = await getAiApiRequestLoggingEnabled()
        if (loggingEnabled) await appendAiRequestLog({
          timestamp: new Date().toISOString(),
          requestId,
          endpoint: 'generator:generateNegativePrompt',
          provider: requestProvider,
          model: requestModel,
          durationMs: Date.now() - startedAt,
          status: responseStatus,
          requestPayload,
          responsePrompt: resultPrompt || null,
          error: errorMessage,
        })
      } catch (loggingError) {
        console.error('Failed to write AI request log:', loggingError)
      }
    }
  })

  ipcMain.handle('generator:generateTitle', async (_, input?: { prompt?: string }) => {
    const requestId = crypto.randomUUID()
    const startedAt = Date.now()
    let requestModel = ''
    let requestProvider = ''
    let requestPayload: Record<string, unknown> | null = null
    let responseStatus: number | null = null
    let resultTitle = ''
    let errorMessage: string | null = null

    try {
      const prompt = input?.prompt?.trim() || ''
      if (!prompt) return { error: 'No prompt available to title.' }

      const stored = await readStoredSettings()
      const roleRouting = stored.aiConfig?.dashboardRoleRouting
      const improveRoute = typeof roleRouting === 'object' && roleRouting !== null
        ? (roleRouting as Record<string, unknown>).improvement
        : undefined

      const providerId = typeof improveRoute === 'object' && improveRoute !== null
        ? String((improveRoute as Record<string, unknown>).providerId || '')
        : ''
      const modelId = typeof improveRoute === 'object' && improveRoute !== null
        ? String((improveRoute as Record<string, unknown>).modelId || '')
        : ''

      if (!providerId || !modelId) {
        return { error: 'No improvement model is selected. Set it in AI Configuration → Improvement.' }
      }

      requestProvider = providerId
      requestModel = modelId

      if (providerId === 'openrouter') {
        const settings = await getOpenRouterSettings()
        if (!settings.apiKey) {
          return { error: 'OpenRouter API key is missing. Add it in Settings first.' }
        }

        requestPayload = {
          model: modelId,
          temperature: 0.4,
          max_tokens: 60,
          messages: [
            {
              role: 'system',
              content: TITLE_SYSTEM_INSTRUCTION,
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${settings.apiKey}`,
            'Content-Type': 'application/json',
            ...(settings.siteUrl ? { 'HTTP-Referer': settings.siteUrl } : {}),
            ...(settings.appName ? { 'X-Title': settings.appName } : {}),
          },
          body: JSON.stringify(requestPayload),
        })

        responseStatus = response.status

        if (!response.ok) {
          const errText = await response.text()
          throw new Error(`OpenRouter request failed (${response.status}): ${errText.slice(0, 300)}`)
        }

        const payload = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>
        }

        const title = normalizeGeneratedTitle(payload.choices?.[0]?.message?.content?.trim() || '')
        if (!title) throw new Error('No title content returned.')

        resultTitle = title
        return { data: { title } }
      }

      const localEndpointsRaw = stored.localEndpoints
      const localEndpoints = Array.isArray(localEndpointsRaw)
        ? (localEndpointsRaw as Array<Record<string, unknown>>)
        : []
      const endpoint = localEndpoints.find((item) => String(item.provider || '') === providerId)
      const baseUrl = endpoint && typeof endpoint.baseUrl === 'string' ? endpoint.baseUrl : ''
      if (!baseUrl) {
        return { error: `Local provider "${providerId}" is not configured. Set its Base URL in AI Configuration → Configure Providers.` }
      }

      requestPayload = {
        model: modelId,
        temperature: 0.4,
        max_tokens: 60,
        messages: [
          {
            role: 'system',
            content: TITLE_SYSTEM_INSTRUCTION,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      }

      const response = await fetch(`${normalizeBaseUrl(baseUrl)}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      })

      responseStatus = response.status

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Local AI request failed (${response.status}): ${errText.slice(0, 300)}`)
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>
      }

      const title = normalizeGeneratedTitle(payload.choices?.[0]?.message?.content?.trim() || '')
      if (!title) throw new Error('No title content returned.')

      resultTitle = title
      return { data: { title } }
    } catch (error) {
      errorMessage = String(error)
      return { error: String(error) }
    } finally {
      try {
        const loggingEnabled = await getAiApiRequestLoggingEnabled()
        if (loggingEnabled) await appendAiRequestLog({
          timestamp: new Date().toISOString(),
          requestId,
          endpoint: 'generator:generateTitle',
          provider: requestProvider,
          model: requestModel,
          durationMs: Date.now() - startedAt,
          status: responseStatus,
          requestPayload,
          responsePrompt: resultTitle || null,
          error: errorMessage,
        })
      } catch (loggingError) {
        console.error('Failed to write AI request log:', loggingError)
      }
    }
  })

  ipcMain.handle('generator:quickExpand', async (_, input?: {
    idea?: string
    creativity?: 'focused' | 'balanced' | 'wild'
    character?: { name: string; description?: string }
  }) => {
    const requestId = crypto.randomUUID()
    const startedAt = Date.now()
    let requestModel = ''
    let requestProvider = ''
    let requestPayload: Record<string, unknown> | null = null
    let responseStatus: number | null = null
    let resultPrompt = ''
    let errorMessage: string | null = null

    try {
      const idea = input?.idea?.trim() || ''
      if (!idea) return { error: 'No idea provided for expansion.' }

      const creativity = input?.creativity || 'balanced'
      const character = input?.character

      const creativityInstruction = QUICK_EXPAND_CREATIVITY[creativity]
      const temperature = QUICK_EXPAND_TEMPERATURES[creativity]

      const characterContext = character?.name
        ? `\n\nCharacter context: The prompt should feature "${character.name}".${character.description ? ` Character description: ${character.description}` : ''}`
        : ''

      const userPrompt = `${creativityInstruction}\n\nUser's concept: ${idea}${characterContext}`

      const stored = await readStoredSettings()
      const roleRouting = stored.aiConfig?.dashboardRoleRouting
      const genRoute = typeof roleRouting === 'object' && roleRouting !== null
        ? (roleRouting as Record<string, unknown>).generation
        : undefined

      const providerId = typeof genRoute === 'object' && genRoute !== null
        ? String((genRoute as Record<string, unknown>).providerId || '')
        : ''
      const modelId = typeof genRoute === 'object' && genRoute !== null
        ? String((genRoute as Record<string, unknown>).modelId || '')
        : ''

      // Fall back to main OpenRouter settings if no generation route configured
      if (!providerId || !modelId) {
        const settings = await getOpenRouterSettings()
        if (!settings.apiKey) return { error: 'OpenRouter API key is missing. Add it in Settings first.' }

        requestProvider = 'openrouter'
        requestModel = settings.model

        requestPayload = {
          model: settings.model,
          temperature,
          max_tokens: 350,
          messages: [
            { role: 'system', content: BASE_PERSONA },
            { role: 'user', content: userPrompt },
          ],
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${settings.apiKey}`,
            'Content-Type': 'application/json',
            ...(settings.siteUrl ? { 'HTTP-Referer': settings.siteUrl } : {}),
            ...(settings.appName ? { 'X-Title': settings.appName } : {}),
          },
          body: JSON.stringify(requestPayload),
        })

        responseStatus = response.status

        if (!response.ok) {
          const errText = await response.text()
          throw new Error(`OpenRouter request failed (${response.status}): ${errText.slice(0, 300)}`)
        }

        const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }
        const prompt = payload.choices?.[0]?.message?.content?.trim()
        if (!prompt) throw new Error('No prompt content returned from OpenRouter.')

        resultPrompt = prompt
        return { data: { prompt } }
      }

      requestProvider = providerId
      requestModel = modelId

      if (providerId === 'openrouter') {
        const settings = await getOpenRouterSettings()
        if (!settings.apiKey) return { error: 'OpenRouter API key is missing. Add it in Settings first.' }

        requestPayload = {
          model: modelId,
          temperature,
          max_tokens: 350,
          messages: [
            { role: 'system', content: BASE_PERSONA },
            { role: 'user', content: userPrompt },
          ],
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${settings.apiKey}`,
            'Content-Type': 'application/json',
            ...(settings.siteUrl ? { 'HTTP-Referer': settings.siteUrl } : {}),
            ...(settings.appName ? { 'X-Title': settings.appName } : {}),
          },
          body: JSON.stringify(requestPayload),
        })

        responseStatus = response.status

        if (!response.ok) {
          const errText = await response.text()
          throw new Error(`OpenRouter request failed (${response.status}): ${errText.slice(0, 300)}`)
        }

        const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }
        const prompt = payload.choices?.[0]?.message?.content?.trim()
        if (!prompt) throw new Error('No prompt content returned from OpenRouter.')

        resultPrompt = prompt
        return { data: { prompt } }
      }

      const localEndpointsRaw = stored.localEndpoints
      const localEndpoints = Array.isArray(localEndpointsRaw)
        ? (localEndpointsRaw as Array<Record<string, unknown>>)
        : []
      const endpoint = localEndpoints.find((item) => String(item.provider || '') === providerId)
      const baseUrl = endpoint && typeof endpoint.baseUrl === 'string' ? endpoint.baseUrl : ''
      if (!baseUrl) {
        return { error: `Local provider "${providerId}" is not configured. Set its Base URL in AI Configuration → Configure Providers.` }
      }

      requestPayload = {
        model: modelId,
        temperature,
        max_tokens: 350,
        messages: [
          { role: 'system', content: BASE_PERSONA },
          { role: 'user', content: userPrompt },
        ],
      }

      const response = await fetch(`${normalizeBaseUrl(baseUrl)}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      })

      responseStatus = response.status

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Local AI request failed (${response.status}): ${errText.slice(0, 300)}`)
      }

      const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }
      const prompt = payload.choices?.[0]?.message?.content?.trim()
      if (!prompt) throw new Error('No prompt content returned from local provider.')

      resultPrompt = prompt
      return { data: { prompt } }
    } catch (error) {
      errorMessage = String(error)
      return { error: String(error) }
    } finally {
      try {
        const loggingEnabled = await getAiApiRequestLoggingEnabled()
        if (loggingEnabled) await appendAiRequestLog({
          timestamp: new Date().toISOString(),
          requestId,
          endpoint: 'generator:quickExpand',
          provider: requestProvider,
          model: requestModel,
          durationMs: Date.now() - startedAt,
          status: responseStatus,
          input: {
            idea: input?.idea?.trim() || null,
            creativity: input?.creativity || 'balanced',
            hasCharacter: !!(input?.character?.name),
          },
          requestPayload,
          responsePrompt: resultPrompt || null,
          error: errorMessage,
        })
      } catch (loggingError) {
        console.error('Failed to write AI request log:', loggingError)
      }
    }
  })
}
