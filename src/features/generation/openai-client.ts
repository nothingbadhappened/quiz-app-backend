export class OpenAIClient {
  constructor(private apiKey: string) {}

  async callOpenAI(
    messages: any[],
    maxTokens: number = 4000,
    model: string = 'gpt-4o-mini'
  ): Promise<string> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: 'text' },
        messages,
        max_tokens: maxTokens,
      }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`OpenAI ${res.status}: ${errorText}`)
    }

    const json = (await res.json()) as any
    return json.choices[0]?.message?.content || ''
  }
}
