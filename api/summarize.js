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
      content: `You are a medical assistant summarizing lab test results into actionable insights. 
  Return a clean JSON object with the following keys only:
  - recommendations (array of 1-line advice)
  - urgent_flags (array of test names that require urgent attention)
  - overall_status (one-line summary of the report condition)

  Respond only with a JSON object.`,
    },
    {
      role: "user",
      content: `Based on the following extracted test results:\n\n${JSON.stringify(
        allResults
      )}\n\nReturn a JSON response like:\n{
    "recommendations": ["..."],
    "urgent_flags": ["..."],
    "overall_status": "..."
  }`,
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
