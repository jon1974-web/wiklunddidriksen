#!/usr/bin/env node
/**
 * Heuristic scanner for hardcoded (non-i18n) user-visible text strings.
 *
 * Usage: node scripts/find-hardcoded-text.js [--out FILE]
 * Writes a report grouped by file with line numbers and the offending line.
 * Heuristics (false positives possible — verify in context, ignore
 * comments/console-only strings):
 *
 *  1. Literal JSX text in <Text> elements not using {t('...')}
 *  2. placeholder="literal" not passed through t()
 *  3. crossAlert / Alert.alert with literal strings
 *  4. Simple: <Text>…literals…</Text>
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIRS = ['src/screens', 'src/components'];
const OUT_ARG = process.argv.includes('--out')
  ? path.join(ROOT, process.argv[process.argv.indexOf('--out') + 1])
  : null;

// Norwegian-ish word anchors for heuristic scoring
const NORWG = /[æøå]|Feil|Error|Velg|Lagre|Rediger|Slett|Legg til|fant|ingen|Ingen|fornavn|epost/i;

const CANDIDATES = [
  {
    name: 'Text body literal',
    re: /<Text[^>]*>\s*([A-ZÆØÅ][^<>{}\n]{2,})\s*<\//g,
  },
  {
    name: 'placeholder literal',
    re: /placeholder="([^"{][^"]*)"/g,
  },
  {
    name: "crossAlert literal",
    re: /crossAlert\('([^']+)'\s*,\s*('[^']+'|`[^`]+`)/g,
  },
  {
    name: 'Alert.alert literal',
    re: /Alert\.alert\(\s*'([^']+)'\s*,\s*('[^']*'|.showError)/g,
  },
  {
    name: 'tooltip/label literal',
    re: /(title|label|subtitle):\s*'([A-ZÆØÅ][^']{3,})'/g,
  },
];

function scanFile(file, results) {
  const src = fs.readFileSync(file, 'utf8');
  const lines = src.split('\n');
  lines.forEach((line, i) => {
    if (/^\s*(\/\/|\/\*|\*)/.test(line)) return; // skip comments
    if (/console\./.test(line)) return;          // skip console lines
    for (const cand of CANDIDATES) {
      cand.re.lastIndex = 0;
      let m;
      while ((m = cand.re.exec(line))) {
        const text = (m[1] || m[2] || '').trim();
        if (!text) continue;
        // Skip entities, icon-ish, short codes
        if (/&[a-z]+;/i.test(text)) continue;
        // Whitelisted exceptions (see PLAN-hardcoded-text-cleanup.md):
        // brand/proper-noun badges and pure date-format placeholder codes
        if (/^(Spond|Google|Outlook|URL|OK|AI|YYYY-MM-DD|YYYY-MM-DD \([^)]+\)( \(optional\))?|DD|MM|ÅÅÅÅ|https?:\/\/\S+)$/.test(text)) continue;
        if (text.length < 3 && cand.name !== 'placeholder literal') continue;
        if (!NORWG.test(text) && !/^[A-Z]/.test(text)) continue;
        if (/~|^\d|px|%|°|—|–/.test(text)) continue;   // data-only strings
        results.push({
          file: path.relative(ROOT, file),
          line: i + 1,
          kind: cand.name,
          text: line.trim().substring(0, 160),
        });
      }
    }
  });
}

function main() {
  const results = [];
  for (const dir of DIRS) {
    const absDir = path.join(ROOT, dir);
    if (!fs.existsSync(absDir)) continue;
    const files = fs.readdirSync(absDir).filter(f => f.endsWith('.tsx'));
    for (const f of files) scanFile(path.join(absDir, f), results);
  }
  results.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);

  // By-file summary
  const byFile = {};
  results.forEach(r => { byFile[r.file] = (byFile[r.file] || 0) + 1; });

  let out = '';
  out += `Hardcoded text candidates: ${results.length} across ${Object.keys(byFile).length} files\n`;
  out += `(${new Date().toISOString()} — heuristics, verify in context)\n\n`;
  for (const f of Object.keys(byFile).sort()) {
    out += `${f}: ${byFile[f]}\n`;
  }
  out += '\n==== DETAIL ====\n\n';
  let lastFile = '';
  results.forEach(r => {
    if (r.file !== lastFile) {
      out += `\n## ${r.file}\n\n`;
      lastFile = r.file;
    }
    out += `L${r.line}  [${r.kind}]  ${r.text}\n`;
  });

  if (OUT_ARG) fs.writeFileSync(OUT_ARG, out);
  else console.log(out);
  return results;
}

main();
