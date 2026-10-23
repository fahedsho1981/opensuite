// Grammar check rules engine
interface GrammarRule {
  id: string;
  pattern: RegExp;
  message: string;
  suggestion?: string;
  severity: 'error' | 'warning' | 'info';
}

export const GRAMMAR_RULES: GrammarRule[] = [
  {
    id: 'double-space',
    pattern: /\s{2,}/g,
    message: 'Multiple consecutive spaces found',
    severity: 'warning',
  },
  {
    id: 'sentence-start-lowercase',
    pattern: /[.!?]\s+[a-z]/g,
    message: 'Sentence should start with capital letter',
    severity: 'error',
  },
  {
    id: 'repeated-word',
    pattern: /\b(\w+)\s+\1\b/gi,
    message: 'Repeated word detected',
    severity: 'warning',
  },
  {
    id: 'a-before-vowel',
    pattern: /\ba\s+([aeiou]\w+)/gi,
    message: 'Use "an" before words starting with a vowel sound',
    suggestion: 'an',
    severity: 'error',
  },
  {
    id: 'their-there',
    pattern: /\btheir\s+(is|are|was|were)\b/gi,
    message: 'Did you mean "there"?',
    suggestion: 'there',
    severity: 'error',
  },
  {
    id: 'its-its',
    pattern: /\bit\'s\s+(own|self)\b/gi,
    message: 'Did you mean "its" (possessive)?',
    suggestion: 'its',
    severity: 'warning',
  },
  {
    id: 'could-of',
    pattern: /\bcould of\b/gi,
    message: 'Should be "could have"',
    suggestion: 'could have',
    severity: 'error',
  },
  {
    id: 'should-of',
    pattern: /\bshould of\b/gi,
    message: 'Should be "should have"',
    suggestion: 'should have',
    severity: 'error',
  },
  {
    id: 'would-of',
    pattern: /\bwould of\b/gi,
    message: 'Should be "would have"',
    suggestion: 'would have',
    severity: 'error',
  },
  {
    id: 'then-than',
    pattern: /\bmore\s+then\b/gi,
    message: 'Did you mean "more than"?',
    suggestion: 'more than',
    severity: 'error',
  },
  {
    id: 'alot',
    pattern: /\balot\b/gi,
    message: '"alot" is not a word. Use "a lot"',
    suggestion: 'a lot',
    severity: 'error',
  },
  {
    id: 'supposed-to',
    pattern: /\bsuppose to\b/gi,
    message: 'Should be "supposed to"',
    suggestion: 'supposed to',
    severity: 'error',
  },
  {
    id: 'comma-splice',
    pattern: /[a-z]+,\s+[a-z]+/gi,
    message: 'Possible comma splice - check sentence structure',
    severity: 'info',
  },
];

export interface GrammarIssue {
  ruleId: string;
  message: string;
  suggestion?: string;
  severity: 'error' | 'warning' | 'info';
  offset: number;
  length: number;
  context: string;
}

export function checkGrammar(text: string): GrammarIssue[] {
  const issues: GrammarIssue[] = [];

  GRAMMAR_RULES.forEach(rule => {
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
    let match;
    while ((match = regex.exec(text)) !== null) {
      const start = Math.max(0, match.index - 20);
      const end = Math.min(text.length, match.index + match[0].length + 20);
      issues.push({
        ruleId: rule.id,
        message: rule.message,
        suggestion: rule.suggestion,
        severity: rule.severity,
        offset: match.index,
        length: match[0].length,
        context: text.substring(start, end),
      });
    }
  });

  return issues.sort((a, b) => a.offset - b.offset);
}

// Auto-correct dictionary
export const AUTO_CORRECTIONS: Record<string, string> = {
  'teh': 'the',
  'adn': 'and',
  'taht': 'that',
  'wiht': 'with',
  'thier': 'their',
  'recieve': 'receive',
  'occured': 'occurred',
  'seperate': 'separate',
  'definately': 'definitely',
  'accomodate': 'accommodate',
  'occurence': 'occurrence',
  'neccessary': 'necessary',
  'wierd': 'weird',
  'untill': 'until',
  'wich': 'which',
  'becuase': 'because',
  'freind': 'friend',
  'goverment': 'government',
  'enviroment': 'environment',
  'tommorow': 'tomorrow',
  'tounge': 'tongue',
  'calender': 'calendar',
  'concious': 'conscious',
  'curiousity': 'curiosity',
  'embarass': 'embarrass',
  'harrass': 'harass',
  'humourous': 'humorous',
  'hygeine': 'hygiene',
  'ignorence': 'ignorance',
  'inteligence': 'intelligence',
  'liason': 'liaison',
  'libary': 'library',
  'maintainance': 'maintenance',
  'millenium': 'millennium',
  'miniscule': 'minuscule',
  'mischievious': 'mischievous',
  'misspel': 'misspell',
  'noticable': 'noticeable',
  'parliment': 'parliament',
  'perseverence': 'perseverance',
  'posession': 'possession',
  'prefered': 'preferred',
  'privelege': 'privilege',
  'professer': 'professor',
  'promiss': 'promise',
  'pronounciation': 'pronunciation',
  'publically': 'publicly',
  'realy': 'really',
  'reccomend': 'recommend',
  'refered': 'referred',
  'relevent': 'relevant',
  'rythm': 'rhythm',
  'sentance': 'sentence',
  'succesful': 'successful',
  'supercede': 'supersede',
  'surprize': 'surprise',
  'temperture': 'temperature',
  'therefor': 'therefore',
  'threshhold': 'threshold',
  'truely': 'truly',
  'unforseen': 'unforeseen',
  'unfortunatly': 'unfortunately',
  'vaccuum': 'vacuum',
  'vegeterian': 'vegetarian',
  'vengance': 'vengeance',
  'visious': 'vicious',
  'wether': 'whether',
  'withold': 'withhold',
  'writting': 'writing',
  'yeild': 'yield',
};

export function autoCorrect(text: string): { corrected: string; changes: Array<{ from: string; to: string }> } {
  let corrected = text;
  const changes: Array<{ from: string; to: string }> = [];

  Object.entries(AUTO_CORRECTIONS).forEach(([wrong, right]) => {
    const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
    if (regex.test(corrected)) {
      changes.push({ from: wrong, to: right });
      corrected = corrected.replace(regex, right);
    }
  });

  return { corrected, changes };
}

// Readability statistics
export interface ReadabilityStats {
  words: number;
  sentences: number;
  paragraphs: number;
  characters: number;
  syllables: number;
  fleschKincaid: number;
  fleschReadingEase: number;
  gunningFog: number;
  colemanLiau: number;
  ari: number;
  smog: number;
  averageWordsPerSentence: number;
  averageSyllablesPerWord: number;
  readingLevel: string;
}

function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;
  
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

function countSentences(text: string): number {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  return sentences.length || 1;
}

export function calculateReadability(text: string): ReadabilityStats {
  const plainText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = plainText.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  const sentenceCount = countSentences(plainText);
  const paragraphCount = (text.match(/<(p|div|h[1-6])[\s>]/gi) || []).length || 1;
  const charCount = plainText.length;
  
  const syllableCount = words.reduce((sum, word) => sum + countSyllables(word), 0);
  
  const avgWordsPerSentence = wordCount / sentenceCount;
  const avgSyllablesPerWord = syllableCount / wordCount;
  
  // Flesch-Kincaid Grade Level
  const fleschKincaid = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;
  
  // Flesch Reading Ease
  const fleschReadingEase = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
  
  // Gunning Fog Index
  const complexWords = words.filter(w => countSyllables(w) >= 3).length;
  const gunningFog = 0.4 * (avgWordsPerSentence + 100 * (complexWords / wordCount));
  
  // Coleman-Liau Index
  const L = (charCount / wordCount) * 100;
  const S = (sentenceCount / wordCount) * 100;
  const colemanLiau = 0.0588 * L - 0.296 * S - 15.8;
  
  // Automated Readability Index
  const ari = 4.71 * avgWordsPerSentence + 0.5 * avgSyllablesPerWord - 21.43;
  
  // SMOG Index
  const smog = 1.043 * Math.sqrt((complexWords * 30) / sentenceCount) + 3.1291;
  
  // Reading level description
  let readingLevel = '';
  const avgGrade = (fleschKincaid + colemanLiau + ari) / 3;
  if (avgGrade <= 5) readingLevel = 'Elementary';
  else if (avgGrade <= 8) readingLevel = 'Middle School';
  else if (avgGrade <= 12) readingLevel = 'High School';
  else if (avgGrade <= 16) readingLevel = 'College';
  else readingLevel = 'Graduate Level';
  
  return {
    words: wordCount,
    sentences: sentenceCount,
    paragraphs: paragraphCount,
    characters: charCount,
    syllables: syllableCount,
    fleschKincaid: Math.round(fleschKincaid * 10) / 10,
    fleschReadingEase: Math.round(fleschReadingEase * 10) / 10,
    gunningFog: Math.round(gunningFog * 10) / 10,
    colemanLiau: Math.round(colemanLiau * 10) / 10,
    ari: Math.round(ari * 10) / 10,
    smog: Math.round(smog * 10) / 10,
    averageWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
    averageSyllablesPerWord: Math.round(avgSyllablesPerWord * 10) / 10,
    readingLevel,
  };
}

// i18n translations
export const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    'file': 'File',
    'edit': 'Edit',
    'view': 'View',
    'insert': 'Insert',
    'format': 'Format',
    'tools': 'Tools',
    'save': 'Save',
    'print': 'Print',
    'export': 'Export',
    'undo': 'Undo',
    'redo': 'Redo',
    'bold': 'Bold',
    'italic': 'Italic',
    'underline': 'Underline',
    'find': 'Find',
    'replace': 'Replace',
    'words': 'words',
    'characters': 'characters',
    'paragraphs': 'paragraphs',
  },
  es: {
    'file': 'Archivo',
    'edit': 'Editar',
    'view': 'Ver',
    'insert': 'Insertar',
    'format': 'Formato',
    'tools': 'Herramientas',
    'save': 'Guardar',
    'print': 'Imprimir',
    'export': 'Exportar',
    'undo': 'Deshacer',
    'redo': 'Rehacer',
    'bold': 'Negrita',
    'italic': 'Cursiva',
    'underline': 'Subrayado',
    'find': 'Buscar',
    'replace': 'Reemplazar',
    'words': 'palabras',
    'characters': 'caracteres',
    'paragraphs': 'párrafos',
  },
  fr: {
    'file': 'Fichier',
    'edit': 'Édition',
    'view': 'Affichage',
    'insert': 'Insertion',
    'format': 'Format',
    'tools': 'Outils',
    'save': 'Enregistrer',
    'print': 'Imprimer',
    'export': 'Exporter',
    'undo': 'Annuler',
    'redo': 'Rétablir',
    'bold': 'Gras',
    'italic': 'Italique',
    'underline': 'Souligné',
    'find': 'Rechercher',
    'replace': 'Remplacer',
    'words': 'mots',
    'characters': 'caractères',
    'paragraphs': 'paragraphes',
  },
  de: {
    'file': 'Datei',
    'edit': 'Bearbeiten',
    'view': 'Ansicht',
    'insert': 'Einfügen',
    'format': 'Format',
    'tools': 'Extras',
    'save': 'Speichern',
    'print': 'Drucken',
    'export': 'Exportieren',
    'undo': 'Rückgängig',
    'redo': 'Wiederherstellen',
    'bold': 'Fett',
    'italic': 'Kursiv',
    'underline': 'Unterstrichen',
    'find': 'Suchen',
    'replace': 'Ersetzen',
    'words': 'Wörter',
    'characters': 'Zeichen',
    'paragraphs': 'Absätze',
  },
  ja: {
    'file': 'ファイル',
    'edit': '編集',
    'view': '表示',
    'insert': '挿入',
    'format': '書式',
    'tools': 'ツール',
    'save': '保存',
    'print': '印刷',
    'export': 'エクスポート',
    'undo': '元に戻す',
    'redo': 'やり直し',
    'bold': '太字',
    'italic': '斜体',
    'underline': '下線',
    'find': '検索',
    'replace': '置換',
    'words': '単語',
    'characters': '文字',
    'paragraphs': '段落',
  },
  zh: {
    'file': '文件',
    'edit': '编辑',
    'view': '视图',
    'insert': '插入',
    'format': '格式',
    'tools': '工具',
    'save': '保存',
    'print': '打印',
    'export': '导出',
    'undo': '撤销',
    'redo': '重做',
    'bold': '粗体',
    'italic': '斜体',
    'underline': '下划线',
    'find': '查找',
    'replace': '替换',
    'words': '字',
    'characters': '字符',
    'paragraphs': '段落',
  },
  ar: {
    'file': 'ملف',
    'edit': 'تحرير',
    'view': 'عرض',
    'insert': 'إدراج',
    'format': 'تنسيق',
    'tools': 'أدوات',
    'save': 'حفظ',
    'print': 'طباعة',
    'export': 'تصدير',
    'undo': 'تراجع',
    'redo': 'إعادة',
    'bold': 'غامق',
    'italic': 'مائل',
    'underline': 'تحته خط',
    'find': 'بحث',
    'replace': 'استبدال',
    'words': 'كلمات',
    'characters': 'أحرف',
    'paragraphs': 'فقرات',
  },
};

export type Language = keyof typeof TRANSLATIONS;

export function t(key: string, lang: Language = 'en'): string {
  return TRANSLATIONS[lang]?.[key] || TRANSLATIONS.en[key] || key;
}

// CSV Parser for Mail Merge
export interface CSVData {
  headers: string[];
  rows: string[][];
}

export function parseCSV(csvText: string): CSVData {
  const lines = csvText.trim().split('\n');
  if (lines.length === 0) return { headers: [], rows: [] };
  
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };
  
  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  
  return { headers, rows };
}

export function mergeTemplate(template: string, data: CSVData): string[] {
  return data.rows.map(row => {
    let result = template;
    data.headers.forEach((header, index) => {
      const placeholder = new RegExp(`\\{\\{${header}\\}\\}`, 'g');
      result = result.replace(placeholder, row[index] || '');
    });
    return result;
  });
}

// Document themes
export interface DocumentTheme {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  headingFont: string;
  bodyFont: string;
}

export const DOCUMENT_THEMES: DocumentTheme[] = [
  {
    name: 'Default',
    primaryColor: '#000000',
    secondaryColor: '#333333',
    accentColor: '#2563eb',
    backgroundColor: '#ffffff',
    textColor: '#111827',
    headingFont: 'Arial',
    bodyFont: 'Arial',
  },
  {
    name: 'Professional',
    primaryColor: '#1a365d',
    secondaryColor: '#2d3748',
    accentColor: '#3182ce',
    backgroundColor: '#ffffff',
    textColor: '#1a202c',
    headingFont: 'Georgia',
    bodyFont: 'Times New Roman',
  },
  {
    name: 'Modern',
    primaryColor: '#2d3748',
    secondaryColor: '#4a5568',
    accentColor: '#805ad5',
    backgroundColor: '#ffffff',
    textColor: '#2d3748',
    headingFont: 'Verdana',
    bodyFont: 'Arial',
  },
  {
    name: 'Creative',
    primaryColor: '#744210',
    secondaryColor: '#975a16',
    accentColor: '#d69e2e',
    backgroundColor: '#fffff0',
    textColor: '#744210',
    headingFont: 'Georgia',
    bodyFont: 'Georgia',
  },
  {
    name: 'Minimal',
    primaryColor: '#000000',
    secondaryColor: '#4a4a4a',
    accentColor: '#e53e3e',
    backgroundColor: '#ffffff',
    textColor: '#000000',
    headingFont: 'Helvetica',
    bodyFont: 'Helvetica',
  },
  {
    name: 'Dark',
    primaryColor: '#e2e8f0',
    secondaryColor: '#a0aec0',
    accentColor: '#63b3ed',
    backgroundColor: '#1a202c',
    textColor: '#e2e8f0',
    headingFont: 'Arial',
    bodyFont: 'Arial',
  },
];

// Chart data types
export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    color: string;
  }>;
}

export type ChartType = 'bar' | 'line' | 'pie' | 'area';

// Generate SVG chart
export function generateChartSVG(
  type: ChartType,
  data: ChartData,
  width: number = 400,
  height: number = 300
): string {
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  
  const allValues = data.datasets.flatMap(d => d.data);
  const maxValue = Math.max(...allValues, 1);
  
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="background: white; border: 1px solid #e5e7eb; border-radius: 8px;">`;
  
  // Title
  svg += `<text x="${width / 2}" y="20" text-anchor="middle" font-size="14" font-weight="bold" fill="#333">${data.datasets[0]?.label || 'Chart'}</text>`;
  
  if (type === 'bar') {
    const barWidth = chartWidth / data.labels.length / data.datasets.length;
    data.datasets.forEach((dataset, di) => {
      dataset.data.forEach((value, i) => {
        const barHeight = (value / maxValue) * chartHeight;
        const x = padding + i * (chartWidth / data.labels.length) + di * barWidth;
        const y = padding + chartHeight - barHeight;
        svg += `<rect x="${x}" y="${y}" width="${barWidth - 2}" height="${barHeight}" fill="${dataset.color}" rx="2"/>`;
        svg += `<text x="${x + barWidth / 2}" y="${y - 5}" text-anchor="middle" font-size="10" fill="#666">${value}</text>`;
      });
    });
    // X-axis labels
    data.labels.forEach((label, i) => {
      const x = padding + i * (chartWidth / data.labels.length) + (chartWidth / data.labels.length) / 2;
      svg += `<text x="${x}" y="${height - 10}" text-anchor="middle" font-size="10" fill="#666">${label}</text>`;
    });
  } else if (type === 'line' || type === 'area') {
    data.datasets.forEach((dataset) => {
      const points = dataset.data.map((value, i) => {
        const x = padding + (i / (data.labels.length - 1)) * chartWidth;
        const y = padding + chartHeight - (value / maxValue) * chartHeight;
        return `${x},${y}`;
      });
      
      if (type === 'area') {
        const areaPoints = `${padding},${padding + chartHeight} ${points.join(' ')} ${padding + chartWidth},${padding + chartHeight}`;
        svg += `<polygon points="${areaPoints}" fill="${dataset.color}" opacity="0.2"/>`;
      }
      
      svg += `<polyline points="${points.join(' ')}" fill="none" stroke="${dataset.color}" stroke-width="2"/>`;
      
      dataset.data.forEach((value, i) => {
        const x = padding + (i / (data.labels.length - 1)) * chartWidth;
        const y = padding + chartHeight - (value / maxValue) * chartHeight;
        svg += `<circle cx="${x}" cy="${y}" r="3" fill="${dataset.color}"/>`;
      });
    });
    // X-axis labels
    data.labels.forEach((label, i) => {
      const x = padding + (i / (data.labels.length - 1)) * chartWidth;
      svg += `<text x="${x}" y="${height - 10}" text-anchor="middle" font-size="10" fill="#666">${label}</text>`;
    });
  } else if (type === 'pie') {
    const centerX = width / 2;
    const centerY = height / 2 + 10;
    const radius = Math.min(chartWidth, chartHeight) / 2 - 20;
    const total = data.datasets[0]?.data.reduce((a, b) => a + b, 0) || 1;
    let startAngle = -Math.PI / 2;
    
    data.datasets[0]?.data.forEach((value, i) => {
      const angle = (value / total) * Math.PI * 2;
      const endAngle = startAngle + angle;
      const x1 = centerX + radius * Math.cos(startAngle);
      const y1 = centerY + radius * Math.sin(startAngle);
      const x2 = centerX + radius * Math.cos(endAngle);
      const y2 = centerY + radius * Math.sin(endAngle);
      const largeArc = angle > Math.PI ? 1 : 0;
      
      svg += `<path d="M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${data.datasets[0].color}" opacity="${0.3 + (i / data.datasets[0].data.length) * 0.7}"/>`;
      
      // Label
      const midAngle = startAngle + angle / 2;
      const labelX = centerX + (radius * 0.7) * Math.cos(midAngle);
      const labelY = centerY + (radius * 0.7) * Math.sin(midAngle);
      svg += `<text x="${labelX}" y="${labelY}" text-anchor="middle" font-size="10" fill="#333">${data.labels[i]}: ${value}</text>`;
      
      startAngle = endAngle;
    });
  }
  
  // Axes
  if (type !== 'pie') {
    svg += `<line x1="${padding}" y1="${padding}" x2="${padding}" y2="${padding + chartHeight}" stroke="#ccc" stroke-width="1"/>`;
    svg += `<line x1="${padding}" y1="${padding + chartHeight}" x2="${padding + chartWidth}" y2="${padding + chartHeight}" stroke="#ccc" stroke-width="1"/>`;
  }
  
  svg += '</svg>';
  return svg;
}

// Text transform utilities
export function transformText(text: string, transform: 'uppercase' | 'lowercase' | 'capitalize' | 'titlecase' | 'sentencecase' | 'togglecase' | 'inverse'): string {
  switch (transform) {
    case 'uppercase':
      return text.toUpperCase();
    case 'lowercase':
      return text.toLowerCase();
    case 'capitalize':
      return text.replace(/\b\w/g, c => c.toUpperCase());
    case 'titlecase':
      return text.replace(/\b\w/g, (c, i) => i === 0 || text[i - 1] === ' ' ? c.toUpperCase() : c.toLowerCase());
    case 'sentencecase':
      return text.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, c => c.toUpperCase());
    case 'togglecase':
      return text.split('').map(c => c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()).join('');
    case 'inverse':
      return text.split('').reverse().join('');
    default:
      return text;
  }
}

// Drop cap HTML generator
export function generateDropCap(text: string): string {
  if (!text || text.length === 0) return text;
  const firstChar = text[0];
  const rest = text.substring(1);
  return `<span style="float: left; font-size: 3.5em; line-height: 0.8; padding-right: 8px; padding-top: 4px; font-weight: bold;">${firstChar}</span>${rest}`;
}

// Hyphenation (basic)
export function hyphenate(word: string): string {
  // Basic hyphenation rules for common patterns
  const patterns: Record<string, string> = {
    'tion': 'ti-on',
    'sion': 'si-on',
    'ment': 'ment',
    'ness': 'ness',
    'able': 'a-ble',
    'ible': 'i-ble',
    'ing': 'ing',
    'ful': 'ful',
    'less': 'less',
    'ous': 'ous',
    'ive': 'ive',
    'ical': 'i-cal',
    'ance': 'ance',
    'ence': 'ence',
  };
  
  if (word.length <= 4) return word;
  
  for (const [pattern, replacement] of Object.entries(patterns)) {
    if (word.toLowerCase().includes(pattern)) {
      return word;
    }
  }
  
  return word;
}
