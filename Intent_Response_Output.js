const axios = require("axios");

(async () => {
  try {
    const teamSummary = getContext("teamSummary");
    const aiExplainedPRs = getContext("aiExplainedPRs");
    const groqKey = process.env.GROQ_API_KEY;

    if (!teamSummary || !aiExplainedPRs?.length || !groqKey) {
      setContext("intentResponse", {
        intent: "Repository overview",
        response: "Intent response unavailable."
      });
      return;
    }

    const userQuery =
      process.env.QUERY_PROMPT ||
      "What is the current health and key risks for the repository?";

    const topStructural = [...aiExplainedPRs]
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(p =>
        `${p.title} (Score ${p.score}, Volatility ${p.volatilityRisk}, Familiarity ${p.familiarityRisk}, Contention ${p.overlappingFiles})`
      )
      .join("; ");

    const prompt = `
You are a Repository Risk Intelligence assistant.

Use ONLY the provided structural signals.
Do NOT fabricate additional repository metrics.
No markdown tables.
Respond concisely and directly.

Repository Health: ${teamSummary.repository_health}
Average Score: ${teamSummary.averageScore}
High Risk PR Count: ${teamSummary.highRiskCount}
Executive Summary: ${teamSummary.summary}

Top Structural Drivers:
${topStructural}

User Query: ${userQuery}

Return ONLY JSON:
{
  "intent": "Short description of query intent",
  "response": "Direct answer referencing structural signals."
}
`;

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "openai/gpt-oss-20b",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 300
      },
      {
        headers: {
          Authorization: `Bearer ${groqKey}`,
          "Content-Type": "application/json"
        },
        timeout: 15000
      }
    );

    let parsed;

    try {
      parsed = JSON.parse(response.data.choices[0].message.content);
    } catch {
      parsed = {
        intent: "Repository overview",
        response: response.data.choices[0].message.content
      };
    }

    setContext("intentResponse", parsed);

  } catch (e) {
    console.error("Intent response failed:", e.message);
    setContext("intentResponse", {
      intent: "Repository overview",
      response: "Intent generation failed."
    });
  }
})();