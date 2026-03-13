import { ipcMain } from 'electron'
import { app } from 'electron'
import path from 'path'
import { appendFile, mkdir } from 'fs/promises'
import type { OpenRouterSettings } from './settings'

const AI_REQUEST_LOG_FILE = 'ai-api-requests.jsonl'

function getAiRequestLogPath() {
  return path.join(app.getPath('userData'), 'logs', AI_REQUEST_LOG_FILE)
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
}
