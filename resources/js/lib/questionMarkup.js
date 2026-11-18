export const questionDisplayText = (text) => String(text ?? '').replace(/\\([()（）])/gu, '$1');

function markersIn(source) {
    // Older generators put answer pronunciation in parentheses, not a highlight marker.
    if (/^Apa arti dari .+\s[（(][\p{Script=Hiragana}\p{Script=Katakana}ー・\s]+[）)]\?$/u.test(source)) return [];
    const parts = [];
    let depth = 0;
    let start = 0;
    let nested = false;
    for (let i = 0; i < source.length; i++) {
        if (source[i] === '\\' && /[()（）]/u.test(source[i + 1] ?? '')) {
            i++;
            continue;
        }
        if ('(（'.includes(source[i])) {
            if (depth === 0) { start = i; nested = false; }
            else nested = true;
            depth++;
        } else if (')）'.includes(source[i]) && depth) {
            depth--;
            if (!depth && !nested && i > start + 1 && source.slice(start + 1, i).trim() && ((source[start] === '(' && source[i] === ')') || (source[start] === '（' && source[i] === '）'))) {
                parts.push({ start, end: i + 1, text: source.slice(start + 1, i).trim() });
            }
        }
    }
    return parts;
}

export function previewQuestionHighlight(text, target) {
    let source = String(text ?? '');
    let term = String(target ?? '').trim();
    const markers = markersIn(source);
    if (!term) {
        const candidates = [...new Set(markers.filter(({ text }) =>
            /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(text)
        ).map(({ text }) => text))];
        if (candidates.length > 1) {
            return { text: source, term: '', error: 'Ada beberapa penanda. Pilih satu kata/frasa yang disorot.' };
        }
        term = candidates[0] ?? '';
    }
    if (Array.from(term).length > 500) {
        return { text: source, term, error: 'Kata/frasa yang disorot maksimal 500 karakter.' };
    }
    for (const marker of markers.reverse()) {
        if (marker.text === term) {
            source = source.slice(0, marker.start) + term + source.slice(marker.end);
        }
    }
    return { text: source, term, error: null };
}
