import { ipcMain } from 'electron'
import { app } from 'electron'
import path from 'path'
import { appendFile, mkdir, readFile } from 'fs/promises'
import type { OpenRouterSettings } from './settings'

const AI_REQUEST_LOG_FILE = 'ai-api-requests.jsonl'

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
  ipcMain.handle('generator:magicRandom', async (_, input?: { theme?: string; presetName?: string; greylistEnabled?: boolean; greylistWords?: string[] }) => {
    const requestId = crypto.randomUUID()
    const startedAt = Date.now()
    let requestModel = ''
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

      const theme = input?.theme?.trim()
      const presetName = input?.presetName?.trim()
      const greylistEnabled = input?.greylistEnabled !== false
      const greylistWords = (input?.greylistWords ?? [])
        .map((word) => word.trim().toLowerCase())
        .filter((word) => word.length > 0)
      const uniqueGreylistWords = Array.from(new Set(greylistWords)).slice(0, 30)
      const hasGreylist = greylistEnabled && uniqueGreylistWords.length > 0

      const promptParts = [
        'Create one random, vivid text-to-image prompt.',
        presetName ? `Use this NightCafe preset as style guidance: ${presetName}.` : '',
        theme ? `Theme to include: ${theme}.` : 'Pick any surprising subject.',
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
            content:
              'You generate exactly one high-quality text-to-image prompt. Return only the final prompt text with no numbering, no quotes, and no explanation.',
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
            theme: input?.theme?.trim() || null,
            presetName: input?.presetName?.trim() || null,
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
              content:
                'You rewrite and improve text-to-image prompts. Keep the user\'s intent. Make it more vivid, specific, and usable for image generation. Return only the improved prompt text with no quotes and no explanation.',
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
            content:
              'You rewrite and improve text-to-image prompts. Keep the user\'s intent. Make it more vivid, specific, and usable for image generation. Return only the improved prompt text with no quotes and no explanation.',
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
}
