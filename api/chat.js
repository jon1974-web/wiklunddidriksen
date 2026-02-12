const fs = require('fs');
const path = require('path');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

function sendError(res, status, error, detail) {
  console.error('[Chat API]', status, error, detail);
  return res.status(status).json({ error, detail });
}

module.exports = async function handler(req, res) {
  console.log('[Chat API] Request:', req.method);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return sendError(res, 500, 'Server configuration error', 'GROQ_API_KEY not set');
  }

  try {
    let body = req.body;
    if (body === undefined || body === null) {
      return sendError(res, 400, 'No body', 'Request body is empty or not parsed');
    }
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        return sendError(res, 400, 'Invalid JSON', e.message);
      }
    }
    const { message, pageContent } = body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const cvPaths = [
      path.join(process.cwd(), 'assets', 'cv', 'cv.md'),
      path.join(process.cwd(), 'assets', 'CV', 'cv.md'),
    ];
    let cvText = '';
    for (const cvPath of cvPaths) {
      if (fs.existsSync(cvPath)) {
        cvText = fs.readFileSync(cvPath, 'utf-8');
        break;
      }
    }

    const pageText = pageContent && typeof pageContent === 'string'
      ? pageContent.trim()
      : '';

    const contextParts = [];
    if (cvText) {
      const maxCvChars = 40000;
      const truncatedCv = cvText.length > maxCvChars
        ? cvText.slice(0, maxCvChars) + '\n\n[...truncated]'
        : cvText;
      contextParts.push('## CV / CV-data\n' + truncatedCv);
    }
    if (pageText) {
      contextParts.push('## Informasjon fra nettsiden\n' + pageText);
    }

    const systemPrompt = `Du er en hjelpsom assistent som svarer på spørsmål om Jon Wiklund Didriksen. 
Du får informasjon fra CV-en hans og eventuelt andre kilder fra nettsiden hans.
Svar basert utelukkende på den informasjonen du får. Hvis svaret ikke finnes i materialet, si det tydelig.
Svar på norsk med et vennlig og profesjonelt tonefall. Hold svarene konsise men informative.`;

    const userContent = contextParts.length > 0
      ? `Kontekst:\n${contextParts.join('\n\n')}\n\n---\n\nSpørsmål: ${message}`
      : message;

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error('Groq API error:', response.status, errData);
      let errorMsg = 'Request failed';
      if (response.status === 401) {
        errorMsg = 'Invalid API key - check GROQ_API_KEY in Vercel';
      } else if (response.status === 429) {
        errorMsg = 'Rate limit exceeded - try again later';
      } else if (errData.error && errData.error.message) {
        errorMsg = errData.error.message;
      }
      return res.status(502).json({
        error: 'AI service error',
        detail: errorMsg,
        status: response.status,
      });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || 'Kunne ikke generere svar.';

    return res.status(200).json({ reply });
  } catch (err) {
    const detail = err.message || String(err);
    const stack = err.stack || '';
    console.error('[Chat API] Caught error:', detail, stack);
    return res.status(500).json({
      error: 'An error occurred',
      detail: detail,
    });
  }
}
