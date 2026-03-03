# 🚨 Repository Risk Intelligence Automation

An automated pull request risk analysis pipeline that evaluates structural risk signals across open PRs, generates AI-assisted technical insights, and delivers executive-level reports via Email and Slack.

This system transforms raw GitHub activity into actionable engineering intelligence.

# 🔍 What This Automation Does

Fetches open pull requests from a repository
→ Fetch_Open_PRs.js 

Fetch_Open_PRs

Enriches each PR with structural metadata (files, commits, merge state, reviewers, etc.)
→ Fetch_PR_Details.js 

Fetch_PR_Details

Computes deterministic multi-factor structural risk scores
→ Risk_Scoring.js 

Risk_Scoring

Uses AI to generate technical explanations for high-risk PRs
→ AI_Risk_Explanation.js 

AI_Risk_Explanation

Builds a repository-level health summary
→ Team_Summary.js 

Team_Summary

Generates structured intent-aware responses (optional query-based insight)
→ Intent_Response_Output.js 

Intent_Response_Output

Sends formatted risk reports via Email + Slack
→ Send_Report.js 

Send_Report

# 🧠 Risk Model Overview

Each pull request is evaluated across six structural dimensions:

Dimension	What It Detects
Velocity	Stale PRs & slow iteration
Complexity	High logic density & large diffs
Integration	Merge conflicts & overlapping files
Review Risk	Missing reviewers & inactivity
Volatility	Frequently changing modules
Familiarity	Low contributor experience on touched files

Final Score: Weighted composite (0–100)

Risk Levels:

🟢 Green → Low structural risk

🟡 Yellow → Moderate risk

🔴 Red → High risk (requires attention)

# 🏗 Architecture Flow
Fetch Open PRs
      ↓
Fetch PR Details
      ↓
Risk Scoring Engine
      ↓
AI Risk Explanation (Top Risk PRs)
      ↓
Repository Health Summary
      ↓
Slack / Email Report

Core scoring is deterministic.
AI is used only for explanation — never for scoring.

# ⚙️ Environment Variables

Configure the following:

GITHUB_REPO_OWNER=your-org
GITHUB_REPO_NAME=your-repo
GITHUB_TOKEN=github_personal_access_token

GROQ_API_KEY=your_groq_api_key   # Optional (AI explanations + summaries)

EMAIL_RECIPIENTS=mail1@mail.com,mail2@mail.com
SLACK_WEBHOOK=https://hooks.slack.com/services/xxxx
QUERY_PROMPT=Optional custom query

If GROQ_API_KEY is not provided:

The system still runs

AI explanations fall back to deterministic output

# 📊 Output Capabilities
Slack Report

Risk color-coded PR list

Technical explanation

Structural drivers

Executive health summary

Email Report

HTML formatted audit table

Structural signals

Recommendations

Repository health overview

# 🎯 Why This Exists

Most PR dashboards show activity.

This shows risk concentration and structural instability.

Instead of:

“There are 12 open PRs.”

You get:

“3 PRs are structurally high-risk due to contention and volatility in core modules.”

That’s the difference between tracking work and managing risk.

# 🚀 Use Cases

Engineering leadership reporting

Release readiness assessment

DevOps observability

Hackathon / AI-driven DevEx tools

Internal platform intelligence systems

# 🛡 Failure Handling

Missing GitHub token → Safe exit

No PRs → Healthy repo classification

AI timeout → Fallback deterministic summary

Slack failure → Does not crash pipeline

Email failure → Logged but non-blocking

# 🏁 Summary

This automation converts raw pull request activity into:

Quantified structural risk

Executive-level insight

Actionable recommendations

Automated reporting

If you care about engineering stability, this gives you signal instead of noise.
