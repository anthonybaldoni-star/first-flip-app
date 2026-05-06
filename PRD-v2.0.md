1. PRODUCT REQUIREMENTS DOCUMENT (PRD) v2.0
First Flip All-in-One App
Version 2.0 – May 2026
Author: Jack Harlan (Real Estate / Construction Expert + Product & Engineering Leadership)
Status: Final
Executive Summary
Product Vision
A nationwide, mobile-first, offline-capable flip analysis and pipeline secure SaaS platform that automatically scans for the best fixer-upper deals and ranks them using LLM scoring. The app follows a clear Freemium model with feature gating: free users get basic manual analysis, while paid subscribers unlock the Automatic Deal Scanner, full LLM features, AI Vision, unlimited comps, and more.
Core Value Proposition

Proactively finds and ranks the best deals using real-time comps + LLM scoring
Freemium SaaS model with clear upgrade path
In-app LLM chat, AI Vision, educational flyovers
Secure, multi-tenant architecture deployable on AWS, GCP, or Azure

Feature Gating Matrix























































































































FeatureFree TierPro Tier ($19/mo)Team/Enterprise ($49+/mo per user)Manual property entry (any listing link)YesYesYesBasic ARV + 70% Rule + Sensitivity TableYes (limited comps)Yes (unlimited real-time comps)YesTimestamped estimates + confidence factorsYesYesYesFlyovers / educational tooltipsYesYesYesGoogle Maps integrationYesYesYesOffline modeYesYesYesAutomatic Deal ScannerNoYes (daily scans + notifications)Yes (custom frequency + team sharing)LLM Scoring for Deal RankingNoYesYesFull in-app LLM ChatLimited (basic questions)Yes (unlimited, contextual)YesAdaptive LLM learning (user feedback)NoYesYesAI Vision Renovation AnalyzerNoYesYesUnlimited photos & storageLimited (5 per property)UnlimitedUnlimitedRehab budget with local cost indexingBasicFull AI suggestionsFull + team templatesPush notifications for new dealsNoYesYes + custom alertsTeam collaboration & shared dealsNoNoYesAdvanced MLS integrationNoNoYesExport / reportingBasic PDFFull reportsFull + white-labelPriority supportCommunityEmailDedicated + SLA
Gating Enforcement
All features are enforced server-side for security. Free users see prominent “Upgrade to Pro” buttons/paywalls on locked features. Subscription status is checked on every protected API call.
Functional Requirements

Property Intake – Paste any listing URL (Zillow, Redfin, Realtor.com, or any other public site). Auto-parse address, sqft, price, photos.
Real-Time Comps & ARV Engine – Returns timestamped ARV with confidence factor and clickable comps.
70% Rule + Sensitivity Table – Nationwide.
Expanded Rehab Budget Tracker – 20+ granular categories with AI-suggested items, local cost indexing, photo upload per line item.
In-App LLM Chat – Contextual chat window on every deal screen.
Dashboard – Live summary with timestamped, confidence-scored ARV, risk score, 70% rule status, and quick-access LLM chat.
Visit Log – Visited checkbox, detailed notes, photo gallery + AI Vision Renovation Analyzer button.
Google Maps Integration – Full map view, driving directions, comp radius search, route optimization.
Flyover / Tooltip System – Small [ℹ️] icons next to every key term. Tapping shows popover definition.
Automatic Deal Scanner with LLM Scoring – Geography-based scanning and LLM-ranked recommendations.
Offline-First – 100% functionality without internet.

Non-Functional Requirements

Deployable on AWS, Google Cloud, or Azure with identical functionality.
Multi-tenancy, encryption at rest/transit, SOC 2 readiness, GDPR/CCPA compliance.
Rate limiting, audit logging, prompt injection protection.
Least-privilege IAM, WAF, DDoS protection.

Wireframes
Dashboard – ARV with timestamp, clickable comps, flyovers, Recommended Deals section with LLM scores.
Visit Log – Photo gallery + prominent AI Vision Renovation Analyzer button.
Glossary of Flyover Definitions

ARV: After Repair Value – The estimated market value of the property after all renovations are complete. Always based on current real-time comps.
70% Rule: Maximum safe purchase price = (ARV × 0.70) – Repair Costs. Helps ensure you leave room for profit and unexpected costs.
Status: Shows how your offer compares to the 70% Rule (Safe / On the Line / Over). Green = conservative and lower risk.
Risk Score: 1–10 score evaluating overall deal risk (market, rehab scope, timeline, margin cushion). Lower = safer.
Confidence Factor: How reliable the ARV/repair estimate is (e.g. ±6%). Higher = more recent, similar comps available.
Timestamp: Exact date and time the estimate was created from real-time data.
Total Invested: Purchase price + repairs + holding costs (8% of ARV). Your full cash outlay before sale.
Gross Profit: ARV minus Total Invested. Your expected profit before selling costs and taxes.
Net Margin %: Gross Profit divided by Total Invested, shown as a percentage. Target 25%+ for a strong deal.
Comps: Recently sold similar homes used to calculate ARV. Always real-time and clickable to view full listings.

Monetization
Freemium model as shown in the Feature Gating Matrix.