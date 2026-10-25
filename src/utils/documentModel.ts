import { AUTO_CORRECTIONS } from './documentUtils';

export interface PageSetup {
  margins: { top: number; right: number; bottom: number; left: number };
  orientation: 'portrait' | 'landscape';
  paperSize: 'letter' | 'a4' | 'legal';
}

export interface StoredComment {
  id: string;
  text: string;
  author: string;
  timestamp: string;
  quote: string;
}

export interface BibEntry {
  id: string;
  author: string;
  title: string;
  year: string;
  source: string;
}

export interface DocumentMeta {
  headerText: string;
  footerText: string;
  showHeaders: boolean;
  watermarkText: string;
  showWatermark: boolean;
  columnCount: number;
  themeName: string;
  pageSetup: PageSetup;
  comments: StoredComment[];
  documentProtected: boolean;
  protectionHash: string;
  properties: {
    title: string;
    author: string;
    subject: string;
    keywords: string;
    created: string;
    modified: string;
  };
  language: string;
  showLineNumbers: boolean;
  showPageNumbers: boolean;
  pageNumberStyle: 'bottom-center' | 'bottom-right' | 'top-center' | 'top-right';
  bibliography: BibEntry[];
  trackChangesEnabled: boolean;
}

export const PAPER_SIZES: Record<PageSetup['paperSize'], { width: number; height: number }> = {
  letter: { width: 816, height: 1056 },
  a4: { width: 794, height: 1123 },
  legal: { width: 816, height: 1344 },
};

export const FONT_PT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72];

const META_RE = /^<!--opensuite:([\s\S]*?)-->/;

export function defaultPageSetup(): PageSetup {
  return {
    margins: { top: 72, right: 72, bottom: 72, left: 72 },
    orientation: 'portrait',
    paperSize: 'letter',
  };
}

export function defaultMeta(): DocumentMeta {
  const now = new Date().toISOString();
  return {
    headerText: '',
    footerText: '',
    showHeaders: false,
    watermarkText: '',
    showWatermark: false,
    columnCount: 1,
    themeName: 'Default',
    pageSetup: defaultPageSetup(),
    comments: [],
    documentProtected: false,
    protectionHash: '',
    properties: { title: '', author: '', subject: '', keywords: '', created: now, modified: now },
    language: 'en',
    showLineNumbers: false,
    showPageNumbers: false,
    pageNumberStyle: 'bottom-center',
    bibliography: [],
    trackChangesEnabled: false,
  };
}

export function pageDimensions(setup: PageSetup): { width: number; height: number } {
  const paper = PAPER_SIZES[setup.paperSize] || PAPER_SIZES.letter;
  return setup.orientation === 'landscape'
    ? { width: paper.height, height: paper.width }
    : { width: paper.width, height: paper.height };
}

export function splitDocument(content: string): { html: string; meta: DocumentMeta } {
  const base = defaultMeta();
  if (!content) return { html: '', meta: base };
  const match = content.match(META_RE);
  if (!match) return { html: content, meta: base };
  try {
    const parsed = JSON.parse(decodeURIComponent(match[1])) as Partial<DocumentMeta>;
    return {
      html: content.slice(match[0].length),
      meta: {
        ...base,
        ...parsed,
        pageSetup: { ...base.pageSetup, ...(parsed.pageSetup || {}), margins: { ...base.pageSetup.margins, ...(parsed.pageSetup?.margins || {}) } },
        properties: { ...base.properties, ...(parsed.properties || {}) },
        comments: Array.isArray(parsed.comments) ? parsed.comments : [],
        bibliography: Array.isArray(parsed.bibliography) ? parsed.bibliography : [],
      },
    };
  } catch {
    return { html: content, meta: base };
  }
}

export function joinDocument(html: string, meta: DocumentMeta): string {
  return `<!--opensuite:${encodeURIComponent(JSON.stringify(meta))}-->${html}`;
}

export function hashPassword(password: string): string {
  let hash = 0x811c9dc5;
  const salted = `opensuite:${password}`;
  for (let i = 0; i < salted.length; i++) {
    hash ^= salted.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function readCleanHtml(editor: HTMLElement): string {
  const clone = editor.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.os-cell-selected').forEach(el => el.classList.remove('os-cell-selected'));
  return clone.innerHTML;
}

export function snapFontPt(px: number): number {
  const pt = px * 0.75;
  return FONT_PT_SIZES.reduce((best, size) => Math.abs(size - pt) < Math.abs(best - pt) ? size : best, 12);
}

export function applyFontSize(editor: HTMLElement, pt: number): void {
  const selection = window.getSelection();
  const saved = selection && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
  const before = new Set(editor.querySelectorAll('span, font'));
  editor.focus();
  if (saved && editor.contains(saved.commonAncestorContainer)) {
    selection?.removeAllRanges();
    try { selection?.addRange(saved); } catch { /* the range was detached */ }
  }
  document.execCommand('styleWithCSS', false, 'true');
  document.execCommand('fontSize', false, '7');
  editor.querySelectorAll('font[size="7"], span[style*="font-size"]').forEach(node => {
    const el = node as HTMLElement;
    const marked = el.tagName === 'FONT' && el.getAttribute('size') === '7';
    const huge = el.tagName === 'SPAN' && /xx-large|xxx-large|-webkit-xxx-large/.test(el.style.fontSize);
    const created = !before.has(el);
    if (!marked && !huge && !created) return;
    el.style.fontSize = `${pt}pt`;
    if (el.tagName === 'FONT') {
      const span = document.createElement('span');
      span.style.fontSize = `${pt}pt`;
      span.innerHTML = el.innerHTML;
      el.replaceWith(span);
    } else {
      el.removeAttribute('size');
    }
  });
  document.execCommand('styleWithCSS', false, 'false');
}

const BLOCK_SELECTOR = 'p,h1,h2,h3,h4,h5,h6,li,blockquote,pre';

export function nearestBlock(node: Node | null, root: HTMLElement): HTMLElement | null {
  let current: Node | null = node;
  while (current && current !== root) {
    if (current instanceof HTMLElement && /^(P|H[1-6]|LI|BLOCKQUOTE|PRE)$/.test(current.tagName)) {
      return current;
    }
    current = current.parentNode;
  }
  return null;
}

export function blocksForLineSpacing(editor: HTMLElement): HTMLElement[] {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !editor.contains(selection.anchorNode)) return [];
  const range = selection.getRangeAt(0);
  if (range.collapsed) {
    const block = nearestBlock(range.startContainer, editor);
    return block ? [block] : [];
  }
  return Array.from(editor.querySelectorAll(BLOCK_SELECTOR)).filter(el => range.intersectsNode(el)) as HTMLElement[];
}

export interface TextMatch {
  node: Text;
  start: number;
  end: number;
}

export function findTextMatches(root: HTMLElement, query: string, caseSensitive: boolean): TextMatch[] {
  if (!query) return [];
  const matches: TextMatch[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const needle = caseSensitive ? query : query.toLowerCase();
  let current: Node | null = walker.nextNode();
  while (current) {
    const node = current as Text;
    const text = node.nodeValue || '';
    const hay = caseSensitive ? text : text.toLowerCase();
    let from = 0;
    while (from <= hay.length - needle.length) {
      const index = hay.indexOf(needle, from);
      if (index < 0) break;
      matches.push({ node, start: index, end: index + query.length });
      from = index + Math.max(query.length, 1);
    }
    current = walker.nextNode();
  }
  return matches;
}

export function selectMatch(match: TextMatch): void {
  const range = document.createRange();
  range.setStart(match.node, match.start);
  range.setEnd(match.node, match.end);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  const parent = match.node.parentElement;
  parent?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

export function paintFindHighlights(matches: TextMatch[], current: number): void {
  const css = CSS as unknown as { highlights?: { set: (name: string, highlight: Highlight) => void } };
  if (!css.highlights || typeof Highlight === 'undefined') return;
  const ranges = matches.map(match => {
    const range = document.createRange();
    range.setStart(match.node, match.start);
    range.setEnd(match.node, match.end);
    return range;
  });
  css.highlights.set('os-find', new Highlight(...ranges));
  if (ranges[current]) css.highlights.set('os-find-current', new Highlight(ranges[current]));
}

export function clearFindHighlights(): void {
  const css = CSS as unknown as { highlights?: { delete: (name: string) => void } };
  css.highlights?.delete('os-find');
  css.highlights?.delete('os-find-current');
}

export function replaceMatch(match: TextMatch, replacement: string): void {
  const text = match.node.nodeValue || '';
  match.node.nodeValue = text.slice(0, match.start) + replacement + text.slice(match.end);
}

export function replaceAllText(root: HTMLElement, query: string, replacement: string, caseSensitive: boolean): number {
  if (!query) return 0;
  let count = 0;
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current: Node | null = walker.nextNode();
  while (current) {
    nodes.push(current as Text);
    current = walker.nextNode();
  }
  nodes.forEach(node => {
    const regex = new RegExp(escapeRegExp(query), caseSensitive ? 'g' : 'gi');
    const text = node.nodeValue || '';
    const next = text.replace(regex, () => {
      count += 1;
      return replacement;
    });
    if (next !== text) node.nodeValue = next;
  });
  return count;
}

export function replacePlainTextRange(root: HTMLElement, start: number, length: number, replacement: string): boolean {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let offset = 0;
  let startNode: Text | null = null;
  let startOffset = 0;
  let endNode: Text | null = null;
  let endOffset = 0;
  const endPos = start + length;
  let current: Node | null = walker.nextNode();
  while (current) {
    const text = current.nodeValue || '';
    const nodeStart = offset;
    const nodeEnd = offset + text.length;
    if (!startNode && start >= nodeStart && start <= nodeEnd) {
      startNode = current as Text;
      startOffset = start - nodeStart;
    }
    if (startNode && endPos >= nodeStart && endPos <= nodeEnd) {
      endNode = current as Text;
      endOffset = endPos - nodeStart;
      break;
    }
    offset = nodeEnd;
    current = walker.nextNode();
  }
  if (!startNode || !endNode) return false;
  const range = document.createRange();
  range.setStart(startNode, Math.min(startOffset, startNode.length));
  range.setEnd(endNode, Math.min(endOffset, endNode.length));
  range.deleteContents();
  range.insertNode(document.createTextNode(replacement));
  return true;
}

export function replaceWordInTextNodes(root: HTMLElement, word: string, replacement: string): number {
  let count = 0;
  const regex = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'g');
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current: Node | null = walker.nextNode();
  while (current) {
    nodes.push(current as Text);
    current = walker.nextNode();
  }
  nodes.forEach(node => {
    const text = node.nodeValue || '';
    const next = text.replace(regex, () => {
      count += 1;
      return replacement;
    });
    if (next !== text) node.nodeValue = next;
  });
  return count;
}

export function autoCorrectTextNodes(root: HTMLElement): number {
  let count = 0;
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current: Node | null = walker.nextNode();
  while (current) {
    nodes.push(current as Text);
    current = walker.nextNode();
  }
  nodes.forEach(node => {
    let next = node.nodeValue || '';
    Object.entries(AUTO_CORRECTIONS).forEach(([wrong, right]) => {
      const regex = new RegExp(`\\b${escapeRegExp(wrong)}\\b`, 'gi');
      next = next.replace(regex, () => {
        count += 1;
        return right;
      });
    });
    if (next !== node.nodeValue) node.nodeValue = next;
  });
  return count;
}

export function correctWordBeforeCaret(editor: HTMLElement): boolean {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return false;
  const range = selection.getRangeAt(0);
  if (!editor.contains(range.startContainer) || range.startContainer.nodeType !== Node.TEXT_NODE) return false;
  const node = range.startContainer as Text;
  const text = node.nodeValue || '';
  const caret = range.startOffset;
  if (caret === 0 || !/\s/.test(text[caret - 1] || '')) return false;
  const before = text.slice(0, caret - 1);
  const match = before.match(/([A-Za-z']+)$/);
  if (!match) return false;
  const word = match[1];
  const replacement = AUTO_CORRECTIONS[word.toLowerCase()];
  if (!replacement) return false;
  const wordStart = caret - 1 - word.length;
  node.nodeValue = text.slice(0, wordStart) + replacement + text.slice(wordStart + word.length);
  const nextCaret = wordStart + replacement.length + 1;
  const next = document.createRange();
  next.setStart(node, Math.min(nextCaret, node.nodeValue.length));
  next.collapse(true);
  selection.removeAllRanges();
  selection.addRange(next);
  return true;
}

export interface MacroStep {
  op: string;
  arg: string;
}

export function parseMacro(code: string): MacroStep[] {
  return code.split('\n').map(line => line.trim()).filter(Boolean).map(line => {
    const index = line.indexOf(':');
    if (index === -1) return { op: line.toLowerCase(), arg: '' };
    return { op: line.slice(0, index).trim().toLowerCase(), arg: line.slice(index + 1) };
  });
}

export function diffLines(before: string, after: string): Array<{ type: 'same' | 'add' | 'del'; text: string }> {
  const a = before.replace(/\r\n/g, '\n').split('\n');
  const b = after.replace(/\r\n/g, '\n').split('\n');
  if (a.length * b.length > 160000) {
    const setB = new Set(b);
    const setA = new Set(a);
    return [
      ...a.filter(line => !setB.has(line)).map(text => ({ type: 'del' as const, text })),
      ...b.map(text => ({ type: setA.has(text) ? 'same' as const : 'add' as const, text })),
    ];
  }
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: Array<{ type: 'same' | 'add' | 'del'; text: string }> = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push({ type: 'same', text: a[i] });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: 'del', text: a[i] });
      i += 1;
    } else {
      out.push({ type: 'add', text: b[j] });
      j += 1;
    }
  }
  while (i < a.length) out.push({ type: 'del', text: a[i++] });
  while (j < b.length) out.push({ type: 'add', text: b[j++] });
  return out;
}

export const THESAURUS: Record<string, string[]> = {
  good: ['excellent', 'great', 'fine', 'superb', 'wonderful'],
  bad: ['poor', 'terrible', 'awful', 'dreadful', 'inferior'],
  big: ['large', 'huge', 'enormous', 'massive', 'vast'],
  small: ['tiny', 'little', 'compact', 'slight', 'minor'],
  happy: ['glad', 'joyful', 'pleased', 'cheerful', 'content'],
  sad: ['unhappy', 'sorrowful', 'gloomy', 'miserable', 'downcast'],
  fast: ['quick', 'rapid', 'swift', 'speedy', 'brisk'],
  slow: ['gradual', 'unhurried', 'sluggish', 'leisurely', 'delayed'],
  beautiful: ['lovely', 'attractive', 'gorgeous', 'elegant', 'stunning'],
  important: ['significant', 'essential', 'crucial', 'vital', 'major'],
  help: ['assist', 'aid', 'support', 'guide', 'serve'],
  make: ['create', 'build', 'produce', 'form', 'construct'],
  show: ['display', 'reveal', 'demonstrate', 'present', 'exhibit'],
  start: ['begin', 'commence', 'launch', 'open', 'initiate'],
  end: ['finish', 'conclude', 'complete', 'close', 'stop'],
  idea: ['thought', 'notion', 'concept', 'plan', 'suggestion'],
  problem: ['issue', 'difficulty', 'trouble', 'challenge', 'obstacle'],
  result: ['outcome', 'consequence', 'effect', 'product', 'finding'],
  change: ['alter', 'modify', 'adjust', 'transform', 'revise'],
  use: ['employ', 'apply', 'utilize', 'operate', 'exercise'],
  say: ['state', 'remark', 'declare', 'mention', 'express'],
  think: ['believe', 'consider', 'judge', 'suppose', 'reckon'],
  look: ['glance', 'gaze', 'observe', 'watch', 'view'],
  get: ['obtain', 'receive', 'acquire', 'gain', 'fetch'],
  give: ['provide', 'offer', 'grant', 'supply', 'present'],
  keep: ['retain', 'hold', 'preserve', 'maintain', 'save'],
  tell: ['inform', 'notify', 'relate', 'report', 'advise'],
  ask: ['inquire', 'request', 'question', 'seek', 'invite'],
  need: ['require', 'demand', 'want', 'lack', 'necessitate'],
  work: ['labor', 'operate', 'function', 'toil', 'perform'],
  part: ['portion', 'section', 'piece', 'component', 'segment'],
  place: ['location', 'spot', 'site', 'position', 'area'],
  right: ['correct', 'accurate', 'proper', 'true', 'exact'],
  wrong: ['incorrect', 'mistaken', 'false', 'inaccurate', 'erroneous'],
  new: ['fresh', 'recent', 'modern', 'novel', 'original'],
  old: ['ancient', 'aged', 'former', 'previous', 'elderly'],
  high: ['tall', 'elevated', 'lofty', 'great', 'raised'],
  low: ['short', 'small', 'reduced', 'humble', 'deep'],
  strong: ['powerful', 'sturdy', 'firm', 'robust', 'solid'],
  weak: ['frail', 'feeble', 'fragile', 'flimsy', 'delicate'],
  clear: ['plain', 'obvious', 'evident', 'distinct', 'transparent'],
  hard: ['difficult', 'tough', 'firm', 'arduous', 'severe'],
  easy: ['simple', 'straightforward', 'effortless', 'painless', 'light'],
  document: ['file', 'paper', 'record', 'report', 'text'],
  report: ['account', 'summary', 'statement', 'review', 'brief'],
  meeting: ['conference', 'session', 'gathering', 'assembly', 'appointment'],
  increase: ['raise', 'grow', 'expand', 'boost', 'enlarge'],
  decrease: ['reduce', 'lower', 'lessen', 'cut', 'shrink'],
};

export function lookupSynonyms(word: string): string[] {
  const key = word.toLowerCase().replace(/[^a-z'-]/g, '');
  if (!key) return [];
  if (THESAURUS[key]) return THESAURUS[key];
  for (const [base, synonyms] of Object.entries(THESAURUS)) {
    if (synonyms.some(synonym => synonym.toLowerCase() === key)) {
      return [base, ...synonyms.filter(synonym => synonym.toLowerCase() !== key)];
    }
  }
  return [];
}

export const DOCUMENT_TEMPLATES: Record<string, string> = {
  'Blank Document': '<p><br></p>',
  Resume: `<h1>Your Name</h1><p>City, State · you@example.com · (555) 010-0101</p><h2>Summary</h2><p>One or two sentences about the role you want and what you bring to it.</p><h2>Experience</h2><p><strong>Job Title</strong> — Company · 2022–Present</p><ul><li>Describe a result you delivered, with a number if you have one.</li><li>Describe a second result.</li></ul><h2>Education</h2><p><strong>Degree</strong> — School, Year</p><h2>Skills</h2><p>Skill one, skill two, skill three</p>`,
  Letter: `<p>October 23, 2026</p><p>Recipient Name<br>Organization<br>Street Address<br>City, State ZIP</p><p>Dear Recipient Name,</p><p>State why you are writing in the first sentence. Use the next paragraph to give the details the reader needs. Close with the action you want them to take.</p><p>Sincerely,</p><p>Your Name</p>`,
  Report: `<h1>Report Title</h1><p><em>Prepared by Your Name · October 23, 2026</em></p><h2>Summary</h2><p>State the finding in two or three sentences.</p><h2>Background</h2><p>Explain the question this report answers.</p><h2>Findings</h2><ul><li>First finding.</li><li>Second finding.</li></ul><h2>Recommendation</h2><p>Say what should happen next.</p>`,
  Memo: `<p><strong>To:</strong> Team</p><p><strong>From:</strong> Your Name</p><p><strong>Date:</strong> October 23, 2026</p><p><strong>Subject:</strong> Memo subject</p><hr><p>Open with the decision or request. Follow with the context, then the next step and the date it is due.</p>`,
  Essay: `<h1>Essay Title</h1><p>Introduce the subject and end the paragraph with your claim.</p><h2>First reason</h2><p>Explain the reason and support it with a specific example.</p><h2>Second reason</h2><p>Explain the next reason and answer the obvious objection.</p><h2>Conclusion</h2><p>Restate the claim and say why it matters.</p>`,
};

export const WORD_ART_STYLES = [
  { id: 'blue', label: 'Blue glow' },
  { id: 'gold', label: 'Gold' },
  { id: 'sunset', label: 'Sunset' },
  { id: 'outline', label: 'Outline' },
] as const;

export const BUILTIN_ADDINS: Array<{ id: string; name: string; description: string; html: string }> = [
  { id: 'date', name: 'Insert date', description: 'Insert today’s date at the cursor.', html: '' },
  { id: 'lorem', name: 'Lorem ipsum', description: 'Insert a placeholder paragraph.', html: '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.</p>' },
  { id: 'signature', name: 'Signature line', description: 'Insert a name and signature line.', html: '<p>Sincerely,</p><p><br></p><p>______________________________</p><p>Your Name<br>Title</p>' },
  { id: 'quote', name: 'Pull quote', description: 'Insert a styled quotation block.', html: '<blockquote><p>Replace this with the quotation.</p><p><em>— Source</em></p></blockquote>' },
];
