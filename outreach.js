#!/usr/bin/env node
/**
 * site-outreach — Generate outreach messages from a URL or just a request
 *
 * Usage:
 *   node outreach.js "https://example.com"                  ← scrape + linkedin-dm
 *   node outreach.js "https://example.com" email            ← scrape + email
 *   node outreach.js "She needs a website revamp" comment   ← no URL, just context
 *   node outreach.js "Dog groomer looking for SEO help"     ← no URL, linkedin-dm
 */

const { spawnSync } = require('child_process');

function run(cmd) {
  const result = spawnSync('sh', ['-c', cmd], {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  return (result.stdout || '').trim();
}

function isUrl(str) {
  return /^https?:\/\//i.test(str) || /^www\./i.test(str) || /\.[a-z]{2,}$/i.test(str);
}

// ─── Firecrawl scraping (only when URL provided) ─────────────────────────────

function scrapeWithFirecrawl(url) {
  console.log('🔍 Scraping site with Firecrawl...');
  const result = run(`curl -s -X POST "https://api.firecrawl.dev/v1/scrape" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer fc-9da3ca29082e4b04b9ea99ed091935bd" \
    -d '${JSON.stringify({ url, formats: ["markdown", "branding"], waitFor: 3000 }).replace(/'/g, "'\\''")}'`);

  try {
    return JSON.parse(result).data || {};
  } catch {
    console.error('Firecrawl parse error');
    return {};
  }
}

function scrapeSubpages(baseUrl) {
  const pages = ['about', 'services', 'contact'];
  const results = {};

  for (const page of pages) {
    const url = `${baseUrl.replace(/\/$/, '')}/${page}`;
    console.log(`  📄 Checking /${page}...`);

    const result = run(`curl -s -X POST "https://api.firecrawl.dev/v1/scrape" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer fc-9da3ca29082e4b04b9ea99ed091935bd" \
      -d '${JSON.stringify({ url, formats: ["markdown"], waitFor: 2000 }).replace(/'/g, "'\\''")}'`);

    try {
      const md = JSON.parse(result).data?.markdown || '';
      if (md.length > 100) results[page] = md.substring(0, 5000);
    } catch {}

    spawnSync('sleep', ['2']);
  }

  return results;
}

// ─── Message generation ──────────────────────────────────────────────────────

function generateWithSiteData(siteData, subpages, url, format) {
  const branding = siteData.branding ? JSON.stringify(siteData.branding, null, 2).substring(0, 2000) : 'none';
  const markdown = (siteData.markdown || '').substring(0, 8000);
  const meta = siteData.metadata || {};
  const subpageText = Object.entries(subpages)
    .map(([page, content]) => `--- /${page} ---\n${content}`)
    .join('\n\n')
    .substring(0, 5000);

  const prompt = buildPrompt({
    mode: 'site-analysis',
    url,
    meta,
    markdown,
    subpageText,
    branding,
    format,
  });

  console.log('✍️  Generating outreach message via Claude...');
  return run(`claude -p ${JSON.stringify(prompt)} --output-format text`);
}

function generateFromRequest(request, format) {
  const prompt = buildPrompt({
    mode: 'request-only',
    request,
    format,
  });

  console.log('✍️  Generating outreach message via Claude...');
  return run(`claude -p ${JSON.stringify(prompt)} --output-format text`);
}

function buildPrompt({ mode, url, meta, markdown, subpageText, branding, request, format }) {
  const formatInstructions = {
    'linkedin-dm': `Generate a LinkedIn DM. Include "Subject: ..." on the first line. Keep under 150 words. No hard sell. Specific and personal. End with a soft offer.`,
    'email': `Generate a cold email. Include "Subject: ..." on the first line. Keep under 200 words. Professional but warm. Clear but soft CTA.`,
    'comment': `Generate a social media comment reply. Under 80 words. 2-3 specific points. Offer to share more. No sales pitch. No subject line needed.`,
  };

  if (mode === 'site-analysis') {
    return `You are a web consultant writing a personalised outreach message after analysing a potential client's website.

SITE URL: ${url}
META TITLE: ${meta?.title || 'unknown'}
META DESCRIPTION: ${meta?.description || 'none'}

HOMEPAGE CONTENT:
${markdown}

SUBPAGE CONTENT:
${subpageText}

BRANDING DATA:
${branding}

ANALYSE FOR:
1. Design issues (outdated look, poor mobile, inconsistent styling)
2. SEO problems (missing meta, poor titles, no schema)
3. Content gaps (missing testimonials, no CTAs, vague descriptions, no social proof)
4. Technical bugs (placeholder text, duplicate nav, missing favicon)
5. Missing trust signals (no reviews, no certifications)
6. What they're doing well (always find something positive first)

FORMAT: ${format}
${formatInstructions[format]}

RULES:
- UK English spelling
- Never condescending — they're a business owner
- Sound human, not a template
- Mention their business name and what they do
- Only include findings provable from the data
- No generic advice — every point must be specific

Return ONLY the message. No explanation. No markdown fences.`;
  }

  // Request-only mode — no site data
  return `You are a web consultant writing a personalised outreach message to a potential client.

You do NOT have their website. You only have context about what they need.

CLIENT REQUEST / CONTEXT:
"${request}"

Based on this context, write an outreach message that:
1. Acknowledges what they're looking for
2. Shows you understand their industry/situation
3. Offers 2-3 specific things you could help with (based on what's common for their type of business)
4. Keeps it personal — not a template

FORMAT: ${format}
${formatInstructions[format]}

RULES:
- UK English spelling
- Never condescending
- Sound human, not a template
- If they mentioned their business name or type, use it
- Be specific to their industry — a dog groomer needs different things than a solicitor
- No generic "we can help with your website" — say WHAT you'd do
- If they're asking for a revamp, suggest what specifically you'd improve for businesses like theirs
- Keep it conversational, not corporate

Return ONLY the message. No explanation. No markdown fences.`;
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node outreach.js <url> [format]           — scrape site + generate message');
    console.log('  node outreach.js "<request>" [format]     — generate from context only');
    console.log('');
    console.log('Formats: linkedin-dm (default), email, comment');
    console.log('');
    console.log('Examples:');
    console.log('  node outreach.js "https://example.com"');
    console.log('  node outreach.js "https://example.com" email');
    console.log('  node outreach.js "Dog groomer needs a website revamp" comment');
    console.log('  node outreach.js "She runs a bakery, posted looking for SEO help"');
    process.exit(1);
  }

  const input = args[0];
  const format = ['linkedin-dm', 'email', 'comment'].includes(args[1]) ? args[1] : 'linkedin-dm';
  const hasUrl = isUrl(input);

  console.log(`\n📋 Site Outreach`);
  console.log(`📨 Format: ${format}`);
  console.log(`🔗 Mode: ${hasUrl ? 'Site analysis' : 'Request-based'}`);
  console.log('─'.repeat(50));

  let message;

  if (hasUrl) {
    const url = input.startsWith('http') ? input : `https://${input}`;
    const siteData = scrapeWithFirecrawl(url);
    console.log(`✅ Homepage: ${(siteData.markdown || '').length} chars${siteData.branding ? ' + branding' : ''}`);

    console.log('📄 Checking subpages...');
    const subpages = scrapeSubpages(url);
    console.log(`✅ Subpages: ${Object.keys(subpages).join(', ') || 'none found'}`);

    message = generateWithSiteData(siteData, subpages, url, format);
  } else {
    message = generateFromRequest(input, format);
  }

  console.log('\n' + '═'.repeat(50));
  console.log('📨 OUTREACH MESSAGE');
  console.log('═'.repeat(50) + '\n');
  console.log(message);
  console.log('\n' + '═'.repeat(50));

  try {
    spawnSync('pbcopy', { input: message });
    console.log('📋 Copied to clipboard');
  } catch {}
}

main().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
