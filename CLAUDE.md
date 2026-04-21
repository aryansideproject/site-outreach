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

# WITH a URL — scrapes the site first, then generates message
node outreach.js "https://example.com"                    # linkedin-dm
node outreach.js "https://example.com" email              # email
node outreach.js "https://example.com" comment            # comment

# WITHOUT a URL — generates from context/request only
node outreach.js "Dog groomer needs a website revamp"
node outreach.js "She runs a bakery, posted looking for SEO help" comment
node outreach.js "Plumber in London wants more leads" email
```

## Two Modes
### 1. Site Analysis (URL provided)
- Scrapes homepage + /about, /services, /contact via Firecrawl
- Extracts branding (colours, fonts, components)
- Finds specific design, SEO, content, and technical issues
- Generates message referencing actual findings from the site

### 2. Request-Based (no URL)
- Takes a description of what the client needs
- Generates industry-specific suggestions based on their business type
- No scraping — just smart context-based outreach

## Output Formats
- **linkedin-dm** — Subject line + short DM (under 150 words), soft offer
- **email** — Subject line + professional email (under 200 words), clear CTA
- **comment** — Short reply (under 80 words), 2-3 points, offer to share more

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
