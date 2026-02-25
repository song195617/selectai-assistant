// rendering.js — Markdown/KaTeX rendering engine and text utilities
// Loaded before content.js via manifest.json; all functions are global.

function renderText(text) {
  if (!text) return '';

  const displayMathEnvs = new Set([
    'equation', 'equation*',
    'align', 'align*', 'aligned',
    'alignedat', 'alignedat*',
    'gather', 'gather*', 'gathered',
    'multline', 'multline*',
    'flalign', 'flalign*',
    'alignat', 'alignat*',
    'split', 'cases', 'cases*', 'array', 'subarray',
    'matrix', 'matrix*',
    'pmatrix', 'pmatrix*',
    'bmatrix', 'bmatrix*',
    'vmatrix', 'vmatrix*',
    'smallmatrix'
  ]);
  const latexMathKeywordPattern = /\\(?:frac|dfrac|tfrac|sum|int|iint|iiint|prod|lim|sqrt|sin|cos|tan|cot|sec|csc|log|ln|exp|theta|alpha|beta|gamma|delta|epsilon|lambda|mu|pi|sigma|omega|cdot|times|leq|geq|neq|infty|partial|nabla|left|right|operatorname|mathrm|mathbf|mathbb)\b/i;
  const hasMathDelimiters = (value) => /\$\$[\s\S]*\$\$|\$[^\$\n]+\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]|\\begin\{[A-Za-z*@]+\}[\s\S]*?\\end\{[A-Za-z*@]+\}/.test(value);
  const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const isEscaped = (source, index) => {
    let slashCount = 0;
    let cursor = index - 1;
    while (cursor >= 0 && source[cursor] === '\\') {
      slashCount += 1;
      cursor -= 1;
    }
    return slashCount % 2 === 1;
  };
  const looksLikeBareLatexMath = (value) => {
    const source = String(value || '').trim();
    if (!source || source.length < 2 || source.length > 800) return false;
    if (source.includes('`') || /^#{1,6}\s/.test(source) || /^[-*+]\s/.test(source) || /^\d+\.\s/.test(source) || /^>/.test(source)) return false;
    if (hasMathDelimiters(source) || /https?:\/\//i.test(source)) return false;
    const hasLatexCommand = /\\[A-Za-z]+/.test(source);
    const hasSupOrSub = /(?:\^\{[^{}]+\}|\^[A-Za-z0-9]|\_\{[^{}]+\}|_[A-Za-z0-9])/.test(source);
    const hasMathOps = /[=+\-*/<>]/.test(source);
    const hasBraces = /[{}]/.test(source);
    const hasMathKeyword = latexMathKeywordPattern.test(source);
    const tokenCount = (source.match(/[A-Za-z0-9\\{}^_]+/g) || []).length;
    if (tokenCount < 1) return false;
    if (!(hasLatexCommand || hasSupOrSub || hasBraces)) return false;
    if (!(hasMathOps || hasMathKeyword || hasLatexCommand)) return false;
    return true;
  };
  const hasLikelyMathContent = (value) => {
    const source = String(value || '').trim();
    if (!source || source.length > 2000) return false;
    if (/^\d+(?:[.,]\d+)?$/.test(source) || /^[A-Za-z]+$/.test(source)) return false;
    if (/[\\{}^_&]/.test(source)) return true;
    if (latexMathKeywordPattern.test(source)) return true;
    if (/[=+\-*/<>]/.test(source) && /[A-Za-z0-9]/.test(source)) return true;
    return false;
  };
  const normalizeMathTexForKatex = (source, isDisplay) => {
    let output = String(source || '').replace(/\r/g, '');
    let previous = '';
    while (output !== previous) {
      previous = output;
      output = output.replace(/\\\\(?=[A-Za-z])/g, '\\');
    }
    output = output.trim();
    if (!output) return output;

    // Some model outputs wrap math repeatedly (e.g. "\(...\)" inside $$...$$).
    // KaTeX renderToString expects raw TeX without delimiters, so unwrap outer pairs.
    let unwrapPrev = '';
    while (output !== unwrapPrev) {
      unwrapPrev = output;
      if (/^\\\([\s\S]*\\\)$/.test(output)) {
        output = output.slice(2, -2).trim();
        continue;
      }
      if (/^\\\[[\s\S]*\\\]$/.test(output)) {
        output = output.slice(2, -2).trim();
        continue;
      }
      if (/^\$\$[\s\S]*\$\$$/.test(output)) {
        output = output.slice(2, -2).trim();
        continue;
      }
      if (/^\$[\s\S]*\$$/.test(output)) {
        output = output.slice(1, -1).trim();
      }
    }
    if (!output) return output;

    if (isDisplay) {
      output = output
        .split('\n')
        .map((line) => line.replace(/[ \t]+$/g, ''))
        .join('\n')
        .replace(/\\\\[ \t]+\n/g, '\\\\\n');
      const hasEnvironment = /\\begin\{[A-Za-z*@]+\}/.test(output);
      const hasAlignMarkers = /&/.test(output) || /\\\\/.test(output);
      const hasLineBreak = output.includes('\n');
      if (!hasEnvironment && hasAlignMarkers && (hasLineBreak || /\\\\/.test(output))) {
        output = `\\begin{aligned}\n${output}\n\\end{aligned}`;
      }
    }
    return output;
  };
  const normalizeEscapedMathDelimiters = (source) => {
    let output = String(source || '');
    let previous = '';
    while (output !== previous) {
      previous = output;
      output = output
        .replace(/\\\\\(/g, '\\(')
        .replace(/\\\\\)/g, '\\)')
        .replace(/\\\\\[/g, '\\[')
        .replace(/\\\\\]/g, '\\]')
        .replace(/\\\\begin\{/g, '\\begin{')
        .replace(/\\\\end\{/g, '\\end{');
    }
    return output;
  };
  const autoWrapBareLatexMath = (rawText) => {
    if (!rawText || !/[\\^_]/.test(rawText)) return rawText;
    const lines = String(rawText).split('\n');
    let inFence = false;
    const inlineFormulaPattern = /([A-Za-z0-9()[\]{}\\^_.,]+(?:\s*[=+\-*/<>]\s*[A-Za-z0-9()[\]{}\\^_.,]+)+)/g;
    return lines.map((line) => {
      const trimmedLine = line.trim();
      if (/^```/.test(trimmedLine) || /^~~~/.test(trimmedLine)) {
        inFence = !inFence;
        return line;
      }
      if (inFence || !trimmedLine || hasMathDelimiters(line)) return line;

      const prefixedFormulaMatch = line.match(/^(\s*(?:[-*+]|\d+\.|>)\s+)(.+)$/);
      if (prefixedFormulaMatch) {
        const prefix = prefixedFormulaMatch[1];
        const candidate = prefixedFormulaMatch[2].trim();
        if (looksLikeBareLatexMath(candidate)) return `${prefix}\\(${candidate}\\)`;
      }

      if (looksLikeBareLatexMath(trimmedLine)) {
        const leading = line.match(/^\s*/)?.[0] || '';
        return `${leading}\\(${trimmedLine}\\)`;
      }

      const colonMatch = line.match(/^(\s*[^：:]{0,80}[：:]\s*)(.+)$/);
      if (colonMatch) {
        const prefix = colonMatch[1];
        const candidate = colonMatch[2].trim();
        if (looksLikeBareLatexMath(candidate)) return `${prefix}\\(${candidate}\\)`;
      }

      return line.replace(inlineFormulaPattern, (segment) => {
        const candidate = segment.trim();
        if (!looksLikeBareLatexMath(candidate)) return segment;
        return `\\(${candidate}\\)`;
      });
    }).join('\n');
  };
  const shouldTreatEnvironmentAsMath = (envName, rawBlock) => {
    const normalized = String(envName || '').toLowerCase();
    if (displayMathEnvs.has(normalized)) return true;
    if (/^(?:itemize|enumerate|description|center|flushleft|flushright|quote|quotation|verbatim|lstlisting|tabular|table|figure|thebibliography|document)$/.test(normalized)) return false;
    const body = String(rawBlock || '')
      .replace(new RegExp(`^\\\\begin\\{${escapeRegExp(envName)}\\}`), '')
      .replace(new RegExp(`\\\\end\\{${escapeRegExp(envName)}\\}$`), '')
      .trim();
    if (/\\item\b/.test(body)) return false;
    return hasLikelyMathContent(body);
  };
  const findMarkerEnd = (source, marker, startIndex, stopAtLineBreak) => {
    let cursor = startIndex;
    while (cursor <= source.length - marker.length) {
      if (stopAtLineBreak && (source[cursor] === '\n' || source[cursor] === '\r')) return -1;
      if (source.startsWith(marker, cursor) && !isEscaped(source, cursor)) return cursor;
      cursor += 1;
    }
    return -1;
  };
  const findInlineDollarEnd = (source, startIndex) => {
    let cursor = startIndex;
    while (cursor < source.length) {
      const ch = source[cursor];
      if (ch === '\n' || ch === '\r') return -1;
      if (ch === '$' && !isEscaped(source, cursor) && !source.startsWith('$$', cursor)) {
        const before = source[cursor - 1] || '';
        const after = source[cursor + 1] || '';
        if (!/\s/.test(before) && !(/\d/.test(before) && /\d/.test(after))) return cursor;
      }
      cursor += 1;
    }
    return -1;
  };
  const findEnvironmentEnd = (source, startIndex, envName) => {
    const beginTag = `\\begin{${envName}}`;
    const endTag = `\\end{${envName}}`;
    let depth = 0;
    let cursor = startIndex;
    while (cursor < source.length) {
      if (source.startsWith(beginTag, cursor) && !isEscaped(source, cursor)) {
        depth += 1;
        cursor += beginTag.length;
        continue;
      }
      if (source.startsWith(endTag, cursor) && !isEscaped(source, cursor)) {
        depth -= 1;
        cursor += endTag.length;
        if (depth === 0) return cursor;
        continue;
      }
      cursor += 1;
    }
    return -1;
  };

  const mathBlocks = [];
  const codeBlocks = [];
  const mathTokenPrefix = `AIMATHTOKEN${Date.now().toString(36)}${Math.random().toString(36).slice(2)}X`;
  const mathTokenSuffix = 'XAIMATHEND';
  const codeTokenPrefix = `AICODETOKEN${Date.now().toString(36)}${Math.random().toString(36).slice(2)}X`;
  const codeTokenSuffix = 'XAICODEEND';
  const addMathPlaceholder = (tex, isDisplay) => {
    mathBlocks.push({ tex, display: isDisplay });
    return `${mathTokenPrefix}${mathBlocks.length - 1}${mathTokenSuffix}`;
  };
  const stashCodeBlock = (value) => {
    codeBlocks.push(value);
    return `${codeTokenPrefix}${codeBlocks.length - 1}${codeTokenSuffix}`;
  };
  const stashMarkdownCodeSegments = (source) => {
    let output = source;
    output = output.replace(/```[\s\S]*?```/g, stashCodeBlock);
    output = output.replace(/~~~[\s\S]*?~~~/g, stashCodeBlock);
    output = output.replace(/`[^`\n]*`/g, stashCodeBlock);
    return output;
  };
  const restoreMarkdownCodeSegments = (source) => {
    if (!codeBlocks.length) return source;
    const codePattern = new RegExp(`${escapeRegExp(codeTokenPrefix)}(\\d+)${escapeRegExp(codeTokenSuffix)}`, 'g');
    return source.replace(codePattern, (_, index) => {
      const block = codeBlocks[Number(index)];
      return typeof block === 'string' ? block : '';
    });
  };
  const extractMathBlocks = (source) => {
    let cursor = 0;
    let output = '';
    while (cursor < source.length) {
      if (!isEscaped(source, cursor) && source.startsWith('\\begin{', cursor)) {
        const beginMatch = source.slice(cursor).match(/^\\begin\{([A-Za-z*@]+)\}/);
        if (beginMatch) {
          const envName = beginMatch[1];
          const envEnd = findEnvironmentEnd(source, cursor, envName);
          if (envEnd !== -1) {
            const block = source.slice(cursor, envEnd);
            if (shouldTreatEnvironmentAsMath(envName, block)) {
              output += addMathPlaceholder(block, true);
              cursor = envEnd;
              continue;
            }
          }
        }
      }

      if (!isEscaped(source, cursor) && source.startsWith('$$', cursor)) {
        const displayEnd = findMarkerEnd(source, '$$', cursor + 2, false);
        if (displayEnd !== -1) {
          const inner = source.slice(cursor + 2, displayEnd).trim();
          if (inner) {
            output += addMathPlaceholder(inner, true);
            cursor = displayEnd + 2;
            continue;
          }
        }
      }

      if (!isEscaped(source, cursor) && source.startsWith('\\[', cursor)) {
        const displayEnd = findMarkerEnd(source, '\\]', cursor + 2, false);
        if (displayEnd !== -1) {
          const inner = source.slice(cursor + 2, displayEnd).trim();
          if (inner) {
            output += addMathPlaceholder(inner, true);
            cursor = displayEnd + 2;
            continue;
          }
        }
      }

      if (!isEscaped(source, cursor) && source.startsWith('\\(', cursor)) {
        const inlineEnd = findMarkerEnd(source, '\\)', cursor + 2, false);
        if (inlineEnd !== -1) {
          const inner = source.slice(cursor + 2, inlineEnd).trim();
          if (inner) {
            output += addMathPlaceholder(inner, false);
            cursor = inlineEnd + 2;
            continue;
          }
        }
      }

      if (source[cursor] === '$' && !isEscaped(source, cursor) && !source.startsWith('$$', cursor)) {
        const prev = source[cursor - 1] || '';
        const next = source[cursor + 1] || '';
        const likelyCurrency = /\d/.test(prev) && /\d/.test(next);
        if (!likelyCurrency && next && !/\s/.test(next)) {
          const inlineEnd = findInlineDollarEnd(source, cursor + 1);
          if (inlineEnd !== -1) {
            const inner = source.slice(cursor + 1, inlineEnd).trim();
            if (inner && hasLikelyMathContent(inner)) {
              output += addMathPlaceholder(inner, false);
              cursor = inlineEnd + 1;
              continue;
            }
          }
        }
      }

      output += source[cursor];
      cursor += 1;
    }
    return output;
  };

  let processedText = stashMarkdownCodeSegments(String(text));
  processedText = normalizeEscapedMathDelimiters(processedText);
  processedText = autoWrapBareLatexMath(processedText);
  processedText = extractMathBlocks(processedText);
  processedText = restoreMarkdownCodeSegments(processedText);

  let html = marked.parse(processedText);
  if (typeof DOMPurify !== 'undefined') {
    html = DOMPurify.sanitize(html);
  }
  const placeholderPattern = new RegExp(`${escapeRegExp(mathTokenPrefix)}(\\d+)${escapeRegExp(mathTokenSuffix)}`, 'g');
  html = html.replace(placeholderPattern, (_, index) => {
    const item = mathBlocks[Number(index)];
    if (!item) return '';
    try {
      const normalizedTex = normalizeMathTexForKatex(item.tex, item.display);
      return katex.renderToString(normalizedTex, {
        displayMode: item.display,
        throwOnError: false,
        fleqn: false,
        strict: 'ignore'
      });
    }
    catch (e) {
      return escapeHtml(item.tex);
    }
  });

  return html;
}

function splitThinkingAndAnswer(rawText) {
  const source = typeof rawText === 'string' ? rawText : '';
  const lowerSource = source.toLowerCase();
  const tags = [
    { open: '<think>', close: '</think>' },
    { open: '<thinking>', close: '</thinking>' }
  ];
  let cursor = 0;
  let thinking = '';
  let answer = '';

  while (cursor < source.length) {
    let hitTag = null;
    let openIndex = -1;
    for (const tag of tags) {
      const idx = lowerSource.indexOf(tag.open, cursor);
      if (idx === -1) continue;
      if (openIndex === -1 || idx < openIndex) {
        openIndex = idx;
        hitTag = tag;
      }
    }

    if (!hitTag || openIndex === -1) {
      answer += source.slice(cursor);
      break;
    }
    answer += source.slice(cursor, openIndex);
    const thinkingStart = openIndex + hitTag.open.length;
    const closeIndex = lowerSource.indexOf(hitTag.close, thinkingStart);
    if (closeIndex === -1) {
      thinking += source.slice(thinkingStart);
      break;
    }
    thinking += source.slice(thinkingStart, closeIndex);
    cursor = closeIndex + hitTag.close.length;
  }

  return { thinking, answer };
}

function getThinkingPreview(text) {
  const source = String(text || '').replace(/\r/g, '');
  if (!source.trim()) return t('thinking_loading');

  const lines = source.split('\n');
  const currentLine = lines[lines.length - 1] || '';
  const normalizedCurrentLine = currentLine.replace(/\t/g, '    ');
  if (normalizedCurrentLine.trim()) return normalizedCurrentLine;

  for (let i = lines.length - 2; i >= 0; i--) {
    const candidate = (lines[i] || '').replace(/\t/g, '    ');
    if (candidate.trim()) return candidate;
  }
  return t('thinking_loading');
}

function escapeHtml(text) { return text.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;','\'':'&#039;'}[m])); }
