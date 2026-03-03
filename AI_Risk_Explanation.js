const axios = require("axios");

(async () => {
  try {
    const scoredPRs = getContext("scoredPRs") || [];
    const groqKey = process.env.GROQ_API_KEY;

    if (!scoredPRs.length || !groqKey) {
      setContext("aiExplainedPRs", scoredPRs);
      return;
    }

    const sorted = [...scoredPRs].sort((a, b) => b.score - a.score);
    const topRiskPRs = sorted.slice(0, 5);

    const explained = await Promise.all(
      scoredPRs.map(async (pr) => {
        let technicalRisk = "Low structural risk.";
        let riskReason = "No major structural drivers detected.";
        let recommendation = "Proceed with standard review process.";

        if (topRiskPRs.find((p) => p.number === pr.number)) {
          const prompt = `
You are a senior software architect.
Using the provided signals, write THREE short sentences:
1) Technical Risk: One sentence on the structural impact.
2) Reason: One sentence explaining the primary driver (e.g., contention or volatility).
3) Recommendation: One sentence with a direct action.

No markdown, plain text only.

Signals:
Score: ${pr.score}
Volatility: ${pr.breakdown?.volatilityRisk || 0}
Familiarity: ${pr.breakdown?.familiarityRisk || 0}
Contention: ${pr.stats?.contentionCount || 0}
Velocity: ${pr.breakdown?.velocityRisk || 0}
Complexity: ${pr.breakdown?.complexityRisk || 0}
Integration: ${pr.breakdown?.integrationRisk || 0}
`;

          try {
            const response = await axios.post(
              "https://api.groq.com/openai/v1/chat/completions",
              {
                model: "openai/gpt-oss-20b",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.1,
                max_tokens: 120,
              },
              {
                headers: {
                  Authorization: `Bearer ${groqKey}`,
                  "Content-Type": "application/json",
                },
                timeout: 15000,
              }
            );

            const text = response.data.choices[0].message.content.trim();
            const cleaned = text.replace(/\n/g, " ").trim();
            const parts = cleaned.split(". ");

            if (parts.length >= 3) {
              technicalRisk = parts[0].trim();
              riskReason = parts[1].trim();
              recommendation = parts[2].trim();
            } else if (parts.length === 2) {
              technicalRisk = parts[0].trim();
              riskReason =
                "Structural analysis of complexity and contention.";
              recommendation = parts[1].trim();
            } else {
              technicalRisk = cleaned;
              riskReason = "Multi-factor structural risk detected.";
              recommendation = "Review carefully for side effects.";
            }
          } catch (err) {
            console.error(`AI failed for PR #${pr.number}:`, err.message);
          }
        }

        return {
          ...pr,
          risk_flag:
            pr.score > 70
              ? "🔴"
              : pr.score > 40
              ? "🟡"
              : "🟢",
          highlight: pr.score > 70,
          technical_risk: technicalRisk,
          risk_reason: riskReason,
          recommendation,
        };
      })
    );

    setContext("aiExplainedPRs", explained);
  } catch (error) {
    console.error("AI explanation pipeline failed:", error.message);
  }
})();

