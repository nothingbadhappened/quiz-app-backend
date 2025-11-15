import { GenItem } from './types'

export class QuestionValidator {
  /**
   * Validates question format
   */
  validateFormat(item: any): boolean {
    return (
      item.options?.length === 4 &&
      item.correct_idx >= 1 &&
      item.correct_idx <= 4 &&
      item.prompt &&
      item.category &&
      item.lang
    )
  }

  /**
   * Validates sources are present and formatted correctly
   */
  validateSources(sources: any[]): boolean {
    if (!Array.isArray(sources) || sources.length === 0) return false
    return sources.every((s) => s.url && typeof s.url === 'string')
  }

  /**
   * Simple duplicate check based on prompt similarity
   */
  isDuplicate(prompt: string, existingPrompts: Set<string>): boolean {
    const normalized = prompt
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    return existingPrompts.has(normalized)
  }

  /**
   * Creates a normalized hash for deduplication
   * Combines language, category, and normalized prompt
   */
  normalizePromptHash(lang: string, category: string, prompt: string): string {
    const p = prompt
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    return `${lang}:${category}:${p}`.slice(0, 240)
  }

  /**
   * Light verification by fetching URL and checking title
   */
  async lightVerify(url: string, answerSnippet: string): Promise<{ ok: boolean; title?: string }> {
    try {
      const r = await fetch(url, { method: 'GET', cf: { cacheTtl: 3600 } as any })
      if (!r.ok) return { ok: false }

      const html = await r.text()
      const title = (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || '').trim()
      const ok =
        !!title && title.toLowerCase().includes(answerSnippet.toLowerCase().slice(0, 30))

      return { ok, title }
    } catch {
      return { ok: false }
    }
  }
}
