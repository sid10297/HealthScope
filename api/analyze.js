export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end("Method Not Allowed");

  const { chunk, fileName } = req.body;

  const messages = [
    {
      role: "system",
      content: `You are a medical report analyzer. Extract key lab values and return a clean JSON array.`
    },
    {
      role: "user",
      content: `Analyze this report:\n\n${chunk}\n\nReturn only:\n[\n  {\n    "test": "...",\n    "value": "...",\n    "unit": "...",\n    "normal_range": "...",\n    "status": "...",\n    "explanation": "...",\n    "urgency": "..." \n  }\n]`
    }
  ];

  try {
    const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://your-vercel-project.vercel.app'
      },
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo",
        messages,
        temperature: 0.2,
        max_tokens: 1500
      })
    });

    const result = await aiResponse.json();
    const content = result.choices?.[0]?.message?.content?.replace(/^```json|^```|```$/g, '').trim();
    const parsed = JSON.parse(content);

    return res.status(200).json(parsed);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "OpenAI error", error: error.message });
  }
}
