const axios = require("axios");

(async () => {
  try {
    const prs = getContext("aiExplainedPRs");
    const teamSummary = getContext("teamSummary");
    const recipients = process.env.EMAIL_RECIPIENTS;
    const slackWebhook = process.env.SLACK_WEBHOOK;

    if (!prs || !Array.isArray(prs)) {
      throw new Error("No data available");
    }

    const sortedPRs = [...prs].sort((a, b) => b.score - a.score);

    // =========================
    // 1️⃣ EMAIL REPORT
    // =========================
    if (recipients) {
      try {
        let html = `
          <h2>Detailed Repository Risk Audit</h2>
          <p><strong>Repository Health:</strong> ${teamSummary?.repository_health || "N/A"}</p>
          <p><strong>Average Risk Score:</strong> ${teamSummary?.averageScore || "N/A"}</p>
          <table border="1" cellpadding="6" style="border-collapse: collapse; width: 100%;">
            <tr style="background-color: #f2f2f2;">
              <th>PR</th>
              <th>Score</th>
              <th>Structural Signals</th>
              <th>Technical Risk</th>
              <th>Recommendation</th>
            </tr>
        `;

        sortedPRs.forEach((pr) => {
          const rowColor =
            pr.score > 70
              ? "#ffe6e6"
              : pr.score > 40
              ? "#fff9e6"
              : "#e6ffe6";

          const structuralSignals = [];

          if (pr.breakdown?.volatilityRisk > 50) {
            structuralSignals.push("Volatile modules");
          }

          if (pr.breakdown?.familiarityRisk > 40) {
            structuralSignals.push("Low familiarity");
          }

          if (pr.stats?.contentionCount > 0) {
            structuralSignals.push("Contention");
          }

          html += `
            <tr style="background-color: ${rowColor};">
              <td><a href="${pr.html_url}">#${pr.number}: ${pr.title}</a></td>
              <td>${pr.score}</td>
              <td>${structuralSignals.join(", ") || "Stable"}</td>
              <td>${pr.technical_risk}</td>
              <td>${pr.recommendation}</td>
            </tr>
          `;
        });

        html += `</table>`;

        if (typeof sendEmailViaTurbotic === "function") {
          await sendEmailViaTurbotic({
            to: recipients.split(","),
            subject: `Repo Risk Audit: ${teamSummary?.repository_health || "Report"}`,
            html,
          });
        }
      } catch (emailErr) {
        console.error("Email delivery failed:", emailErr.message);
      }
    }

    // =========================
    // 2️⃣ SLACK REPORT
    // =========================
    if (slackWebhook) {
      if (sortedPRs.length === 0) {
        await axios.post(slackWebhook, {
          text: "✅ No actionable risks today.",
        });
        return;
      }

      const CHUNK_SIZE = 5;

      for (let i = 0; i < sortedPRs.length; i += CHUNK_SIZE) {
        const chunk = sortedPRs.slice(i, i + CHUNK_SIZE);
        const blocks = [];

        if (i === 0) {
          blocks.push({
            type: "header",
            text: {
              type: "plain_text",
              text: "🚨 Repository Risk Intelligence",
              emoji: true,
            },
          });

          if (teamSummary) {
            const healthEmoji =
              teamSummary.repository_health === "Healthy"
                ? "🟢"
                : teamSummary.repository_health === "Critical"
                ? "🔴"
                : "🟡";

            blocks.push({
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*Health:* ${healthEmoji} ${teamSummary.repository_health}  |  *Avg Score:* ${teamSummary.averageScore}\n\n${teamSummary.summary}\n`,
              },
            });
          }

          blocks.push({ type: "divider" });
        }

        chunk.forEach((pr) => {
          const emoji =
            pr.score > 70
              ? "🔴"
              : pr.score > 40
              ? "🟡"
              : "🟢";

          blocks.push({
            type: "section",
            text: {
              type: "mrkdwn",
              text:
                `${emoji} *<${pr.html_url}|#${pr.number} ${pr.title}>* (Score: ${pr.score})\n` +
                `*Risk:* ${pr.technical_risk}\n` +
                `*Reason:* _${pr.risk_reason || "Calculated structural risk"}_\n` +
                `*Rec:* _${pr.recommendation}_`,
            },
          });

          const contextElements = [];

          if (pr.stats?.openDays > 0) {
            contextElements.push({
              type: "mrkdwn",
              text: `🕒 ${pr.stats.openDays}d old`,
            });
          }

          if (pr.stats?.contentionCount > 0) {
            contextElements.push({
              type: "mrkdwn",
              text: `⚔ ${pr.stats.contentionCount} contention`,
            });
          }

          if (pr.breakdown?.volatilityRisk > 50) {
            contextElements.push({
              type: "mrkdwn",
              text: `🔥 Volatile modules`,
            });
          }

          if (pr.breakdown?.familiarityRisk > 40) {
            contextElements.push({
              type: "mrkdwn",
              text: `🧭 Low familiarity`,
            });
          }

          if (contextElements.length > 0) {
            blocks.push({
              type: "context",
              elements: contextElements,
            });
          }

          blocks.push({ type: "divider" });
        });

        await axios.post(slackWebhook, { blocks });
      }
    }
  } catch (err) {
    console.error("Risk reporting pipeline failed:", err.message);
  }
})();