// Vercel Serverless Function — genera preguntas de examen con Claude API
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY no configurada en Vercel' });

  const { unitTitle, unitTopics, unitContent, mcCount, tfCount, shortCount } = req.body || {};

  const totalQ = (mcCount || 0) + (tfCount || 0) + (shortCount || 0);
  if (!unitTitle || totalQ === 0) {
    return res.status(400).json({ error: 'Faltan datos: título de unidad y al menos 1 pregunta' });
  }

  const topicsStr = Array.isArray(unitTopics) && unitTopics.length
    ? unitTopics.join(', ')
    : '(temas no especificados)';

  const prompt = `Sos docente de Electrotecnia y generás preguntas de evaluación en español rioplatense.

Unidad: ${unitTitle}
Temas: ${topicsStr}
${unitContent ? `Descripción: ${unitContent}` : ''}

Generá exactamente:
- ${mcCount || 0} pregunta(s) de múltiple opción (4 opciones: a, b, c, d)
- ${tfCount || 0} pregunta(s) de verdadero/falso
- ${shortCount || 0} pregunta(s) de respuesta corta

Requisitos:
- Preguntas técnicas, claras y adecuadas al nivel secundario/terciario
- En múltiple opción, las opciones incorrectas deben ser plausibles pero erróneas
- En V/F, la afirmación debe ser una sola idea concreta
- En respuesta corta, el enunciado debe guiar una respuesta de 2-4 oraciones
- Puntaje: múltiple opción y V/F = 1 punto; respuesta corta = 2 puntos

Devolvé SOLO el siguiente JSON (sin texto antes ni después, sin markdown):

{
  "questions": [
    {
      "question_text": "Enunciado",
      "type": "multiple_choice",
      "options": ["opción a", "opción b", "opción c", "opción d"],
      "correct_answer": "texto exacto de la opción correcta",
      "points": 1
    },
    {
      "question_text": "Enunciado V/F",
      "type": "true_false",
      "options": ["Verdadero", "Falso"],
      "correct_answer": "Verdadero",
      "points": 1
    },
    {
      "question_text": "Enunciado respuesta corta",
      "type": "short_answer",
      "options": null,
      "correct_answer": "REVISAR",
      "points": 2
    }
  ]
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(500).json({ error: `Error de Anthropic API: ${errText}` });
    }

    const aiData = await response.json();
    const rawText = aiData.content?.[0]?.text || '';

    // Extract JSON even if there's surrounding text
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'La IA no devolvió JSON válido', raw: rawText });

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed.questions)) {
      return res.status(500).json({ error: 'Formato inesperado en la respuesta', raw: rawText });
    }

    return res.status(200).json({ questions: parsed.questions });
  } catch (e) {
    return res.status(500).json({ error: `Error interno: ${e.message}` });
  }
};
