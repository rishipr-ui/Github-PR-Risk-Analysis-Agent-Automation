const axios = require("axios");

(async () => {
  try {
    const owner = process.env.GITHUB_REPO_OWNER;
    const repo = process.env.GITHUB_REPO_NAME;
    const token = process.env.GITHUB_TOKEN;

    if (!owner || !repo || !token) {
      console.error("Missing GitHub environment variables.");
      setContext("openPRs", []);
      return;
    }

    const url = `https://api.github.com/repos/${owner}/${repo}/pulls?state=open&per_page=100`;

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "Turbotic-OffRoadPR",
        Accept: "application/vnd.github+json"
      },
      timeout: 20000
    });

    const openPRs = response.data || [];

    setContext("openPRs", openPRs);
    console.log(`Fetched ${openPRs.length} open PRs.`);

  } catch (e) {
    console.error("Fetch_Open_PRs error:", e.response?.data || e.message);
    setContext("openPRs", []);
  }
})();
