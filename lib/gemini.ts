function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }
  return key;
}

/**
 * Generate content with Gemini using REST API
 */
export async function generateContent(
  prompt: string,
  systemInstruction?: string,
  modelName: string = 'gemini-3-flash-preview',
  enableGrounding: boolean = false
): Promise<any> {
  const GEMINI_API_KEY = getApiKey();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
  
  const body: any = {
    contents: [{
      parts: [{ text: prompt }]
    }]
  };
  
  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }
  
  // Add Google Search grounding if enabled
  if (enableGrounding) {
    body.tools = [{ googleSearch: {} }];
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-client': 'genai-js/0.21.0',
    },
    body: JSON.stringify(body)
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }
  
  return await response.json();
}

/**
 * Generate content with JSON output
 */
export async function generateJSON<T = any>(
  prompt: string,
  systemInstruction?: string,
  modelName: string = 'gemini-3-flash-preview',
  enableGrounding: boolean = false
): Promise<{ data: T; tokensIn: number; tokensOut: number }> {
  const GEMINI_API_KEY = getApiKey();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
  
  const body: any = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      responseMimeType: 'application/json'
    }
  };
  
  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }
  
  // Add Google Search grounding if enabled
  if (enableGrounding) {
    body.tools = [{ googleSearch: {} }];
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-client': 'genai-js/0.21.0',
    },
    body: JSON.stringify(body)
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }
  
  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  
  // Extract token counts from usage metadata
  const tokensIn = result.usageMetadata?.promptTokenCount || 0;
  const tokensOut = result.usageMetadata?.candidatesTokenCount || 0;

  try {
    const data = JSON.parse(text) as T;
    return { data, tokensIn, tokensOut };
  } catch (error) {
    throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Extract token usage from Gemini response
 */
export function extractTokenUsage(result: any): {
  tokensIn: number;
  tokensOut: number;
} {
  const metadata = result.usageMetadata;
  return {
    tokensIn: metadata?.promptTokenCount || 0,
    tokensOut: metadata?.candidatesTokenCount || 0
  };
}
