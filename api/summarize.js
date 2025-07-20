export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end("Method Not Allowed");

    const { allResults } = req.body;

    const messages = [
        {
            role: "system",
            content: "You are a clinical assistant summarizing lab test results."
        },
        {
            role: "user",
            content: `From these test results, give:\n\n1. recommendations\n2. urgent_flags (test names)\n3. overall_status\n\n${JSON.stringify(allResults)}\n\nRespond with:\n{\n  "recommendations": ["..."],\n  "urgent_flags": ["..."],\n  "overall_status": "..." \n}`
        }
    ];

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
                max_tokens: 800
            })
        });

        const result = await response.json();
        const content = result.choices?.[0]?.message?.content?.replace(/^```json|^```|```$/g, '').trim();
        const parsed = JSON.parse(content);
        return res.status(200).json(parsed);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Summary error", error: err.message });
    }
}
