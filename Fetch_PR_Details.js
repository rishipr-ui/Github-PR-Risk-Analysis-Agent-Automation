const axios = require("axios");
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

(async () => {
  try {
    const owner = process.env.GITHUB_REPO_OWNER;
    const repo = process.env.GITHUB_REPO_NAME;
    const token = process.env.GITHUB_TOKEN;

    const openPRs = getContext("openPRs") || [];

    if (!owner || !repo || !token || !openPRs.length) {
      setContext("prDetails", []);
      return;
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      "User-Agent": "Repo-Risk-Intelligence"
    };

    const lightweightDetails = [];

    for (let pr of openPRs) {
      try {
        const prUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${pr.number}`;

        const [prRes, filesRes] = await Promise.all([
          axios.get(prUrl, { headers }),
          axios.get(`${prUrl}/files`, { headers })
        ]);

        lightweightDetails.push({
          number: pr.number,
          title: pr.title,
          user: pr.user?.login,
          html_url: pr.html_url,
          base: prRes.data.base,
          head: prRes.data.head,
          created_at: prRes.data.created_at,
          updated_at: prRes.data.updated_at,
          commits: prRes.data.commits,
          additions: prRes.data.additions,
          deletions: prRes.data.deletions,
          changed_files: prRes.data.changed_files,
          mergeable_state: prRes.data.mergeable_state,
          requested_reviewers: prRes.data.requested_reviewers,
          files: filesRes.data,
          fileVolatility: {},
          authorFamiliarity: {}
        });

      } catch (innerErr) {
        console.error(`Failed PR #${pr.number}`, innerErr.message);
      }
    }

    setContext("prDetails", lightweightDetails);
    console.log("PR details processed.");

  } catch (e) {
    console.error("Fetch_PR_Details failed:", e.message);
    setContext("prDetails", []);
  }
})();