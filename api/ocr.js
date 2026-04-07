import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an OCR assistant for a Hebrew kitchen management system.
Extract delivery invoice data from the image and return ONLY valid JSON — no markdown, no explanation.
If a field cannot be determined, use null for strings and 0 for numbers.
The JSON must match this schema exactly:
{
  "supplierName": string | null,
  "invoiceNumber": string | null,
  "invoiceDate": "YYYY-MM-DD" | null,
  "items": [
    {
      "name": string,
      "unit": string,
      "orderedQty": number,
      "unitPrice": number
    }
  ]
}
Preserve Hebrew text exactly as it appears. Include all line items, even if price is 0.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const { imageBase64 } = req.body || {};

  if (!imageBase64) {
    return res.status(400).json({ error: 'MISSING_IMAGE' });
  }

  // Detect media type from data URI or default to jpeg
  const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
  const mimeType  = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType, data: base64Data },
            },
            {
              type: 'text',
              text: 'Extract all invoice data from this image and return as JSON.',
            },
          ],
        },
      ],
    });

    const text = response.content[0].text.trim();
    // Strip possible markdown code fences
    const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(clean);
    return res.status(200).json(parsed);

  } catch (err) {
    console.error('[OCR] Error:', err);
    if (err instanceof SyntaxError) {
      return res.status(422).json({ error: 'OCR_PARSE_FAILED', message: 'AI response was not valid JSON' });
    }
    return res.status(500).json({ error: 'OCR_FAILED', message: err.message });
  }
}
