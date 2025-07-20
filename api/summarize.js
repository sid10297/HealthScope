const fetch = require("node-fetch");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { allResults } = req.body;

  if (!allResults || !Array.isArray(allResults)) {
    return res
      .status(400)
      .json({ message: "Missing or invalid allResults array" });
  }

  const messages = [
    {
      role: "system",
      content: "You are a clinical assistant summarizing lab test results.",
    },
    {
      role: "user",
      content: `From these test results, give:\n\n1. recommendations\n2. urgent_flags (test names)\n3. overall_status\n\n${JSON.stringify(
        allResults
      )}\n\nRespond with JSON like:\n{\n  "recommendations": ["..."],\n  "urgent_flags": ["..."],\n  "overall_status": "..." \n}`,
    },
  ];

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo",
        messages,
        temperature: 0.2,
        max_tokens: 800,
      }),
    });

    const result = await response.json();
    const raw = result.choices?.[0]?.message?.content;

    if (!raw) {
      return res
        .status(500)
        .json({ message: "No response from OpenRouter.", openrouter_raw: result });
    }

    const clean = raw.replace(/^```json|^```|```$/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (err) {
      return res.status(500).json({
        message: "Failed to parse summary JSON",
        error: clean,
      });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error("Summary error:", err);
    return res
      .status(500)
      .json({ message: "Summary error", error: err.message });
  }
};
