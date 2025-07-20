const fetch = require("node-fetch");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { chunk } = req.body;

  if (!chunk) {
    return res.status(400).json({ message: "Missing chunk" });
  }

  const messages = [
    {
      role: "system",
      content: `You are a medical report analyzer. Extract key lab values and return a clean JSON array.`,
    },
    {
      role: "user",
      content: `Analyze this report:\n\n${chunk}\n\nReturn only:\n[{"test":"..."}]`,
    },
  ];

  try {
    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`
      },
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo",
        messages,
        temperature: 0.2,
        max_tokens: 1500,
      }),
    });

    const result = await aiResponse.json();
    const raw = result.choices?.[0]?.message?.content;

    if (!raw) {
      return res.status(500).json({ message: "No response from AI", openrouter_raw: result });
    }

    const clean = raw.replace(/^```json|^```|```$/g, "").trim();
    const parsed = JSON.parse(clean);

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ message: "OpenRouter error", error: err.message });
  }
};
