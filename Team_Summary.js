const axios = require("axios");

(async () => {
  try {
    const aiExplained = getContext("aiExplainedPRs") || [];
    const groqKey = process.env.GROQ_API_KEY;

    if (!aiExplained.length) {
      setContext("teamSummary", {
        repository_health: "Healthy",
        summary: "No open pull requests detected.",
        highRiskCount: 0,
        averageScore: 0,
      });
      return;
    }

    const sorted = [...aiExplained].sort((a, b) => b.score - a.score);
    const highRisk = sorted.filter((p) => p.score > 70);

    const avgScore = Math.round(
      sorted.reduce((sum, p) => sum + p.score, 0) / sorted.length
    );

    const repoHealth =
      avgScore > 60
        ? "Critical"
        : avgScore > 35
        ? "Moderate Risk"
        : "Healthy";

    // 🔹 Deterministic structural drivers (code-controlled)
    const driverList = sorted
      .slice(0, 3)
      .map(
        (p, i) =>
          `${i + 1}. ${p.title} (` +
          `Volatility ${p.breakdown?.volatilityRisk || 0}, ` +
          `Familiarity ${p.breakdown?.familiarityRisk || 0}, ` +
          `Contention ${p.stats?.contentionCount || 0})`
      )
      .join("\n");

    // 🔹 AI only writes executive paragraph
    const prompt = `
You are evaluating repository stability.

Provide a concise executive summary (3–5 sentences).
Use ONLY the provided statistics.
Do NOT restate structural driver metrics.

Total Open PRs: ${sorted.length}
High Risk PRs: ${highRisk.length}
Average Risk Score: ${avgScore}
Pre-classified Health: ${repoHealth}
`;

    if (!groqKey) {
      setContext("teamSummary", {
        repository_health: repoHealth,
        summary:
          `Average PR risk score is ${avgScore}. ` +
          `${highRisk.length} high-risk PRs detected.\n\n` +
          `Key Structural Drivers:\n${driverList}`,
        highRiskCount: highRisk.length,
        averageScore: avgScore,
      });
      return;
    }

    try {
      const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: "openai/gpt-oss-20b",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.15,
          max_tokens: 180,
        },
        {
          headers: {
            Authorization: `Bearer ${groqKey}`,
            "Content-Type": "application/json",
          },
          timeout: 15000,
        }
      );

      const aiContent =
        response?.data?.choices?.[0]?.message?.content?.trim();

      const executiveSummary =
        aiContent && aiContent.length > 10
          ? aiContent
          : `Average PR risk score is ${avgScore}. ${highRisk.length} high-risk PRs detected.`;

      const finalSummary =
        executiveSummary +
        "\n\nKey Structural Drivers:\n" +
        driverList;

      setContext("teamSummary", {
        repository_health: repoHealth,
        summary: finalSummary,
        highRiskCount: highRisk.length,
        averageScore: avgScore,
      });

    } catch (err) {
      console.error(
        "AI summary failed:",
        err.response?.data || err.message
      );

      setContext("teamSummary", {
        repository_health: repoHealth,
        summary:
          `Average PR risk score is ${avgScore}. ` +
          `${highRisk.length} high-risk PRs detected.\n\n` +
          `Key Structural Drivers:\n${driverList}`,
        highRiskCount: highRisk.length,
        averageScore: avgScore,
      });
    }
  } catch (e) {
    console.error("Team summary step crashed:", e.message);
  }
})();