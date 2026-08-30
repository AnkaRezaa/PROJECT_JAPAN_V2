const DIGRAPHS = {
    きゃ: 'kya', きゅ: 'kyu', きょ: 'kyo', しゃ: 'sha', しゅ: 'shu', しょ: 'sho',
    ちゃ: 'cha', ちゅ: 'chu', ちょ: 'cho', にゃ: 'nya', にゅ: 'nyu', にょ: 'nyo',
    ひゃ: 'hya', ひゅ: 'hyu', ひょ: 'hyo', みゃ: 'mya', みゅ: 'myu', みょ: 'myo',
    りゃ: 'rya', りゅ: 'ryu', りょ: 'ryo', ぎゃ: 'gya', ぎゅ: 'gyu', ぎょ: 'gyo',
    じゃ: 'ja', じゅ: 'ju', じょ: 'jo', びゃ: 'bya', びゅ: 'byu', びょ: 'byo',
    ぴゃ: 'pya', ぴゅ: 'pyu', ぴょ: 'pyo', てぃ: 'ti', でぃ: 'di', ふぁ: 'fa',
    ふぃ: 'fi', ふぇ: 'fe', ふぉ: 'fo', うぃ: 'wi', うぇ: 'we', うぉ: 'wo',
};

const MONOGRAPHS = {
    あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o', か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko',
    さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so', た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to',
    な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no', は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho',
    ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo', や: 'ya', ゆ: 'yu', よ: 'yo',
    ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro', わ: 'wa', を: 'o', ん: 'n',
    が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go', ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo',
    だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do', ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo',
    ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po', ゔ: 'vu', ぁ: 'a', ぃ: 'i', ぅ: 'u', ぇ: 'e', ぉ: 'o',
};

const PARTICLE_ROMAJI = {
    は: 'wa',
    へ: 'e',
    を: 'o',
};

const PUNCTUATION = {
    '。': '.',
    '、': ',',
    '！': '!',
    '？': '?',
    '：': ':',
    '；': ';',
};

const COMMON_EXPRESSIONS = {
    こんにちは: 'konnichiwa',
    こんばんは: 'konbanwa',
};

const ATTACHED_SUFFIXES = new Set([
    'ます', 'ました', 'ません', 'ませんでした', 'ましょう',
    'ない', 'なかった', 'たい', 'たかった',
]);

const romanizationCache = new Map();
let segmenterPromise;

function toHiragana(value = '') {
    return [...value].map((character) => {
        const code = character.charCodeAt(0);
        return code >= 0x30a1 && code <= 0x30f6 ? String.fromCharCode(code - 0x60) : character;
    }).join('');
}

export function kanaToRomaji(value = '') {
    const kana = toHiragana(String(value).trim());
    let result = '';
    let geminate = false;

    for (let index = 0; index < kana.length; index += 1) {
        const character = kana[index];
        if (character === 'っ') {
            geminate = true;
            continue;
        }
        if (character === 'ー') {
            const vowel = [...result].reverse().find((letter) => 'aeiou'.includes(letter));
            result += vowel || '';
            continue;
        }

        const pair = kana.slice(index, index + 2);
        let syllable = DIGRAPHS[pair];
        if (syllable) index += 1;
        else syllable = MONOGRAPHS[character] ?? character;

        if (geminate && /^[bcdfghjklmnpqrstvwxyz]/.test(syllable)) syllable = syllable[0] + syllable;
        geminate = false;
        result += syllable;
    }

    return result;
}

function normalizeTokens(tokens) {
    const normalized = [];

    tokens.forEach((rawToken) => {
        const sourceToken = typeof rawToken === 'string'
            ? { surface: rawToken, reading: rawToken }
            : rawToken;
        const token = {
            surface: String(sourceToken?.surface || '').trim(),
            reading: String(sourceToken?.reading || '').trim(),
        };
        if (!token.surface && !token.reading) return;

        const previousIndex = normalized.length - 1;
        const previous = normalized[previousIndex];

        if (previous?.reading === 'で' && ['しょう', 'した'].includes(token.reading)) {
            previous.surface += token.surface;
            previous.reading += token.reading;
            return;
        }

        if (token.reading === 'う' && /(?:しょ|ちょ|きょ|にょ|ひょ|みょ|りょ|ぎょ|じょ|びょ|ぴょ)$/.test(previous?.reading || '')) {
            previous.surface += token.surface;
            previous.reading += token.reading;
            return;
        }

        if ((token.reading === 'ん' && previous?.reading.endsWith('ませ')) || ATTACHED_SUFFIXES.has(token.reading)) {
            if (previous) {
                previous.surface += token.surface;
                previous.reading += token.reading;
                return;
            }
        }

        normalized.push(token);
    });

    return normalized;
}

function joinRomanizedTokens(tokens) {
    let result = '';

    tokens.forEach((token) => {
        const punctuation = PUNCTUATION[token.surface] || PUNCTUATION[token.reading];
        if (punctuation) {
            result = result.trimEnd() + punctuation;
            return;
        }

        const romanized = PARTICLE_ROMAJI[token.surface] || kanaToRomaji(token.reading);
        if (!romanized) return;
        result += `${result && !result.endsWith(' ') ? ' ' : ''}${romanized}`;
    });

    return result.trim();
}

async function getSegmenter() {
    if (!segmenterPromise) {
        segmenterPromise = import('tiny-segmenter').then(({ default: TinySegmenter }) => new TinySegmenter());
    }

    return segmenterPromise;
}

function alignJapaneseReading(japanese, reading) {
    if (typeof Intl?.Segmenter !== 'function' || !/[一-龯々〆ヵヶ]/u.test(japanese)) return null;

    const readingSource = toHiragana(reading);
    const segments = [...new Intl.Segmenter('ja-JP', { granularity: 'word' }).segment(japanese)]
        .map(({ segment }) => segment);
    const aligned = [];
    let offset = 0;

    for (const surface of segments) {
        if (PUNCTUATION[surface]) {
            if (offset < readingSource.length) {
                aligned.push({ surface: '', reading: readingSource.slice(offset).replace(/[。、！？：；]$/u, '') });
                offset = readingSource.length;
            }
            aligned.push({ surface, reading: surface });
            continue;
        }

        const normalizedSurface = toHiragana(surface);
        if (!/^[ぁ-ゖー]+$/u.test(normalizedSurface)) continue;

        const foundAt = readingSource.indexOf(normalizedSurface, offset);
        if (foundAt < offset) return null;
        if (foundAt > offset) {
            aligned.push({ surface: '', reading: readingSource.slice(offset, foundAt) });
        }
        aligned.push({ surface, reading: readingSource.slice(foundAt, foundAt + normalizedSurface.length) });
        offset = foundAt + normalizedSurface.length;
    }

    if (offset < readingSource.length) {
        aligned.push({ surface: '', reading: readingSource.slice(offset).replace(/[。、！？：；]$/u, '') });
    }

    return aligned.filter((token) => token.surface || token.reading);
}

export async function romanizeJapanese(value = '', japanese = '') {
    const source = String(value || '').normalize('NFC').trim();
    if (!source) return '';
    const japaneseSource = typeof japanese === 'string' ? japanese.normalize('NFC').trim() : '';
    const cacheKey = `${japaneseSource}\u0000${source}`;
    if (romanizationCache.has(cacheKey)) return romanizationCache.get(cacheKey);

    const commonExpression = COMMON_EXPRESSIONS[source.replace(/[。.!！]/g, '')];
    if (commonExpression) {
        const punctuation = PUNCTUATION[source.at(-1)] || (/[.!?]$/.test(source) ? source.at(-1) : '');
        const result = commonExpression + punctuation;
        romanizationCache.set(cacheKey, result);
        return result;
    }

    const alignedTokens = japaneseSource ? alignJapaneseReading(japaneseSource, source) : null;
    const tokens = alignedTokens || (await getSegmenter()).segment(source);
    const result = joinRomanizedTokens(normalizeTokens(tokens));
    romanizationCache.set(cacheKey, result);

    return result;
}
