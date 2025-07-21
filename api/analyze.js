const fetch = require("node-fetch");

function extractJSON(text) {
  const match = text.match(/(```json)?[\s]*([\[{][\s\S]*[\]}])[\s]*(```)?/);
  return match ? match[2].trim() : null;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { chunk } = req.body;

  if (!chunk) {
    return res.status(400).json({ message: "Missing chunk in request body" });
  }

  const messages = [
    {
      role: "system",
      content: `You are a medical report analyzer. Extract key test results from the input and return a structured JSON array.

  Each item should have:
  - test
  - value
  - unit
  - normal_range
  - status
  - explanation
  - urgency (Low, Moderate, High)
  - severity (None, Mild, Moderate, Severe)
  - confidence (High, Medium, Low)

  The confidence level reflects how certain you are about the correctness of the interpretation based on clarity and standardization of the input.

  Avoid medical disclaimers. Respond ONLY with a JSON array.`,
    },
    {
      role: "user",
      content: `Analyze this report:\n\n${chunk}`,
    },
  ];

  try {
    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, // ⛳️ Make sure this is set in your Vercel env vars
      },
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo",
        messages,
        temperature: 0.2,
        max_tokens: 1500,
      }),
    });

    const result = await aiResponse.json();
    const rawContent = result.choices?.[0]?.message?.content;

    if (!rawContent) {
      return res.status(500).json({
        message: "No content from AI response",
        openrouter_raw: result,
      });
    }

    const clean = extractJSON(rawContent);

    if (!clean) {
      return res.status(500).json({
        message: "No valid JSON structure found in AI response",
        rawContent,
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(clean);

      // Ensure it’s an array of objects
      if (!Array.isArray(parsed)) {
        throw new Error("Parsed data is not an array");
      }
    } catch (err) {
      return res.status(500).json({
        message: "Failed to parse extracted JSON",
        error: err.message,
        raw: clean,
      });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error("OpenRouter Error:", err);
    return res.status(500).json({
      message: "OpenRouter error",
      error: err.message,
    });
  }
};
