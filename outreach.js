#!/usr/bin/env node
/**
 * site-outreach — Analyse a website and generate a curated outreach message
 * Usage: node outreach.js "https://example.com" "linkedin-dm"
 * Formats: linkedin-dm, email, comment
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

function scrapeWithFirecrawl(url) {
  console.log('🔍 Scraping site with Firecrawl...');
  const result = run(`curl -s -X POST "https://api.firecrawl.dev/v1/scrape" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer fc-9da3ca29082e4b04b9ea99ed091935bd" \
    -d '${JSON.stringify({ url, formats: ["markdown", "branding"], waitFor: 3000 }).replace(/'/g, "'\\''")}'`);

  try {
    const parsed = JSON.parse(result);
    return parsed.data || {};
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
      const parsed = JSON.parse(result);
      const md = parsed.data?.markdown || '';
      if (md.length > 100) {
        results[page] = md.substring(0, 5000);
      }
    } catch {}

    // 2s delay between requests
    spawnSync('sleep', ['2']);
  }

  return results;
}

function generateMessage(siteData, subpages, url, format) {
  const branding = siteData.branding ? JSON.stringify(siteData.branding, null, 2) : 'No branding data extracted';
  const markdown = siteData.markdown || 'No content extracted';
  const meta = siteData.metadata || {};

  const subpageText = Object.entries(subpages)
    .map(([page, content]) => `--- /${page} ---\n${content}`)
    .join('\n\n');

  const formatInstructions = {
    'linkedin-dm': `Generate a LinkedIn DM message. Include a subject line (short, specific — not salesy). Keep the message under 150 words. No hard sell. Specific findings only. End with a soft offer to share more.`,
    'email': `Generate a cold email. Include a subject line (specific to their business). Keep body under 200 words. Professional but warm. Specific findings. Clear but soft CTA.`,
    'comment': `Generate a social media comment (Facebook/LinkedIn post reply). Under 80 words. 3 specific findings as a numbered list. Offer to share more. No sales pitch.`,
  };

  const prompt = `You are a web consultant analysing a potential client's website to write a personalised outreach message.

SITE URL: ${url}
META TITLE: ${meta.title || 'unknown'}
META DESCRIPTION: ${meta.description || 'none'}

HOMEPAGE CONTENT:
${markdown.substring(0, 8000)}

SUBPAGE CONTENT:
${subpageText.substring(0, 5000)}

BRANDING DATA:
${typeof branding === 'string' ? branding.substring(0, 2000) : 'none'}

ANALYSE THIS SITE FOR:
1. Design issues (outdated look, poor mobile, inconsistent styling, bad colour choices)
2. SEO problems (missing meta, no schema, poor titles, no sitemap reference)
3. Content gaps (missing testimonials, no CTAs, vague service descriptions, no social proof)
4. Technical bugs (broken elements, placeholder text showing, duplicate nav, missing favicon)
5. Missing trust signals (no reviews, no certifications, no case studies)
6. What they're doing well (always find something positive first)

Then generate the outreach message.

FORMAT: ${format}
${formatInstructions[format] || formatInstructions['linkedin-dm']}

RULES:
- UK English spelling (colour, organisation, realise)
- Never be condescending — they're a business owner, not a developer
- Sound like a human, not a template
- Mention their actual business name and what they do
- Only include findings you can prove from the data above
- No generic advice — every point must reference something specific from their site

Return ONLY the message. No explanation. No markdown fences.
If format is linkedin-dm or email, first line should be "Subject: ..." then blank line then the message body.`;

  console.log('✍️  Generating outreach message via Claude...');
  const raw = run(`claude -p ${JSON.stringify(prompt)} --output-format text`);
  return raw;
}

async function main() {
  const url = process.argv[2];
  const format = process.argv[3] || 'linkedin-dm';

  if (!url) {
    console.log('Usage: node outreach.js <url> [format]');
    console.log('Formats: linkedin-dm (default), email, comment');
    console.log('');
    console.log('Examples:');
    console.log('  node outreach.js "https://example.com"');
    console.log('  node outreach.js "https://example.com" email');
    console.log('  node outreach.js "https://example.com" comment');
    process.exit(1);
  }

  if (!['linkedin-dm', 'email', 'comment'].includes(format)) {
    console.error(`Invalid format: ${format}. Use: linkedin-dm, email, comment`);
    process.exit(1);
  }

  console.log(`\n📋 Site Outreach — ${url}`);
  console.log(`📨 Format: ${format}`);
  console.log('─'.repeat(50));

  // 1. Scrape homepage with branding
  const siteData = scrapeWithFirecrawl(url);
  const mdLen = (siteData.markdown || '').length;
  console.log(`✅ Homepage: ${mdLen} chars${siteData.branding ? ' + branding data' : ''}`);

  // 2. Scrape subpages
  console.log('📄 Checking subpages...');
  const subpages = scrapeSubpages(url);
  console.log(`✅ Subpages found: ${Object.keys(subpages).join(', ') || 'none'}`);

  // 3. Generate message
  const message = generateMessage(siteData, subpages, url, format);

  // 4. Output
  console.log('\n' + '═'.repeat(50));
  console.log('📨 OUTREACH MESSAGE');
  console.log('═'.repeat(50) + '\n');
  console.log(message);
  console.log('\n' + '═'.repeat(50));

  // 5. Copy to clipboard
  try {
    spawnSync('pbcopy', { input: message });
    console.log('📋 Copied to clipboard');
  } catch {}
}

main().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
