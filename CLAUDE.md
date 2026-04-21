# Site Outreach — Automated Website Analysis & Outreach Generator
**Project**: Site Outreach
**Type**: CLI tool — analyse any website, generate curated outreach message
**Created**: 19 April 2026
**GitHub**: https://github.com/aryansideproject/site-outreach
**Git account**: aryansideproject (side project token)
**Push command**: `source ~/.claude/env/side-project.env && git push origin main`

## What It Does
1. Takes a URL
2. Scrapes homepage + subpages (about, services, contact) via Firecrawl
3. Extracts branding (colours, fonts, components)
4. Analyses for design issues, SEO problems, content gaps, technical bugs
5. Generates a personalised outreach message with specific findings
6. Copies to clipboard

## Usage
```bash
cd /Users/aryanchoubey/Documents/SideProjects/site-outreach

# LinkedIn DM (default)
node outreach.js "https://example.com"

# Email
node outreach.js "https://example.com" email

# Social media comment
node outreach.js "https://example.com" comment
```

## Output Formats
- **linkedin-dm** — Subject line + short DM (under 150 words), soft offer
- **email** — Subject line + professional email (under 200 words), clear CTA
- **comment** — Short reply (under 80 words), 3 findings, offer to share more

## How It Works
1. Firecrawl scrapes homepage (markdown + branding format)
2. Firecrawl scrapes /about, /services, /contact (2s delay between each)
3. Claude analyses all data for design, SEO, content, technical issues
4. Claude generates the outreach message in the chosen format
5. Message copied to clipboard via pbcopy

## Requirements
- `claude` CLI (already installed)
- Firecrawl API key (hardcoded — replace if rotated)
- No npm install needed

## Files
```
site-outreach/
├── CLAUDE.md       ← This file
├── outreach.js     ← Main script
└── .gitignore
```
