const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_HOUR = 60 * 60 * 1000;

// Configurable Constants
const NOISE_EXTENSIONS = ['.md', '.txt', '.json', '.yml', '.yaml', '.lock'];
const HIGH_RISK_THRESHOLD = 70;
const MEDIUM_RISK_THRESHOLD = 40;

(function () {
  try {
    const details = getContext("prDetails") || [];

    if (!details.length) {
      setContext("scoredPRs", []);
      return;
    }

    const now = new Date();
    const fileContentionMap = {};

    // 1. Build Global Contention Map
    details.forEach(pr => {
      (pr.files || []).forEach(f => {
        if (f.filename) {
          fileContentionMap[f.filename] = (fileContentionMap[f.filename] || 0) + 1;
        }
      });
    });

    const results = details.map(pr => {
      let velocityRisk = 0;
      let complexityRisk = 0;
      let integrationRisk = 0;
      let reviewRisk = 0;
      let volatilityRisk = 0;
      let familiarityRisk = 0;

      const created = new Date(pr.created_at);
      const updated = new Date(pr.updated_at);
      const isDraft = pr.draft === true;

      // --- 1. VELOCITY RISK (Rot/Staleness) ---
      const openDays = Math.floor((now - created) / MS_PER_DAY);
      const hoursSinceUpdate = Math.floor((now - updated) / MS_PER_HOUR);
      
      velocityRisk += Math.min(openDays * 5, 50);
      velocityRisk += Math.min(Math.floor(hoursSinceUpdate / 12) * 5, 50);

      // --- 2. COMPLEXITY RISK (Logic Density) ---
      // Filter out non-code files to avoid "Lockfile/Docs" bias
      const codeFiles = (pr.files || []).filter(f => 
        !NOISE_EXTENSIONS.some(ext => f.filename.endsWith(ext))
      );

      const totalChanges = (pr.additions || 0) + (pr.deletions || 0);
      complexityRisk += Math.min(totalChanges / 15, 70); // Slightly more lenient divisor
      complexityRisk += Math.min(codeFiles.length * 8, 30);

      // --- 3. INTEGRATION RISK (Conflicts/Overlaps) ---
      if (pr.mergeable_state === "dirty") integrationRisk += 60;

      let overlappingFiles = (pr.files || []).filter(f => fileContentionMap[f.filename] > 1);
      integrationRisk += Math.min(overlappingFiles.length * 10, 40);

      // --- 4. REVIEW RISK (Accountability) ---
      // Only penalize missing reviewers if the PR is NOT a draft
      if (!isDraft && (!pr.requested_reviewers || pr.requested_reviewers.length === 0)) {
        reviewRisk += 50;
      }
      if (hoursSinceUpdate > 48) reviewRisk += 50;

      // --- 5. VOLATILITY & FAMILIARITY (Deep Context) ---
      Object.values(pr.fileVolatility || {}).forEach(count => {
        volatilityRisk += Math.min(count * 3, 20);
      });

      Object.values(pr.authorFamiliarity || {}).forEach(count => {
        if (count === 0) familiarityRisk += 15; // First time touching this file
        else if (count < 3) familiarityRisk += 8; // Low experience
      });

      // --- FINAL SCORING ---
      let score = Math.round(
        (velocityRisk * 0.15) +
        (complexityRisk * 0.20) +
        (integrationRisk * 0.20) +
        (reviewRisk * 0.15) +
        (volatilityRisk * 0.15) +
        (familiarityRisk * 0.15)
      );

      return {
        ...pr,
        score: Math.min(score, 100),
        riskLevel: score > HIGH_RISK_THRESHOLD ? "Red" :
                   score > MEDIUM_RISK_THRESHOLD ? "Yellow" : "Green",
        stats: {
          openDays,
          hoursSinceUpdate,
          contentionCount: overlappingFiles.length,
          isDraft
        },
        breakdown: {
          velocityRisk, complexityRisk, integrationRisk, 
          reviewRisk, volatilityRisk, familiarityRisk
        }
      };
    });

    // Sort by highest risk score first
    results.sort((a, b) => b.score - a.score);

    setContext("scoredPRs", results);

  } catch (e) {
    console.error("Risk scoring error:", e.stack);
    setContext("scoredPRs", []);
  }
})();