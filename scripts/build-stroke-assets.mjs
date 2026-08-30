import fs from 'node:fs';
import path from 'node:path';

const [kanjiVgRoot, animCjkRoot, kanjiDataRoot] = process.argv.slice(2);

if (!kanjiVgRoot || !animCjkRoot || !kanjiDataRoot) {
    console.error('Usage: node scripts/build-stroke-assets.mjs <kanjivg-root> <animcjk-root> <kanji-data-root>');
    process.exit(1);
}

const projectRoot = path.resolve(import.meta.dirname, '..');
const outputRoot = path.join(projectRoot, 'public', 'vendor', 'japanese-strokes');
const kanjiOutput = path.join(outputRoot, 'kanji');
const kanaOutput = path.join(outputRoot, 'kana');
const licenseOutput = path.join(outputRoot, 'licenses');

for (const directory of [kanjiOutput, kanaOutput, licenseOutput]) {
    fs.mkdirSync(directory, { recursive: true });
}

const copy = (source, destination) => {
    if (!fs.existsSync(source)) {
        throw new Error(`Missing source file: ${source}`);
    }

    fs.copyFileSync(source, destination);
};

const kanjiData = JSON.parse(
    fs.readFileSync(path.join(kanjiDataRoot, 'kanji-jouyou.json'), 'utf8'),
);
const characters = {};

for (const [character, details] of Object.entries(kanjiData)) {
    // N3 vocabulary can contain kanji classified differently by unofficial JLPT lists.
    // The curriculum still controls what users see; this bundle only guarantees stroke availability.
    if (!details || typeof details !== 'object') continue;

    const hex = character.codePointAt(0).toString(16).padStart(5, '0');
    const filename = `${hex}.svg`;
    const source = path.join(kanjiVgRoot, 'kanji', filename);

    if (!fs.existsSync(source)) continue;

    const svg = fs.readFileSync(source, 'utf8');
    const strokeCount = new Set(
        [...svg.matchAll(/id="[^"]+-s(\d+)"/g)].map((match) => Number(match[1])),
    ).size;

    copy(source, path.join(kanjiOutput, filename));
    characters[character] = {
        script: 'kanji',
        source: 'kanjivg',
        path: `/vendor/japanese-strokes/kanji/${filename}`,
        stroke_count: strokeCount,
    };
}

for (const filename of fs.readdirSync(path.join(animCjkRoot, 'svgsJaKana'))) {
    if (!filename.endsWith('.svg')) continue;

    const codePoint = Number.parseInt(path.basename(filename, '.svg'), 10);
    if (!Number.isInteger(codePoint)) continue;

    const character = String.fromCodePoint(codePoint);
    const isHiragana = codePoint >= 0x3040 && codePoint <= 0x309f;
    const isKatakana = codePoint >= 0x30a0 && codePoint <= 0x30ff;
    if (!isHiragana && !isKatakana) continue;

    const source = path.join(animCjkRoot, 'svgsJaKana', filename);
    const svg = fs.readFileSync(source, 'utf8');
    const strokeCount = (svg.match(/<path[^>]+clip-path=/g) || []).length;
    const outputFilename = `${codePoint.toString(16).padStart(5, '0')}.svg`;

    copy(source, path.join(kanaOutput, outputFilename));
    characters[character] = {
        script: isHiragana ? 'hiragana' : 'katakana',
        source: 'animcjk',
        path: `/vendor/japanese-strokes/kana/${outputFilename}`,
        stroke_count: strokeCount,
    };
}

copy(path.join(kanjiVgRoot, 'COPYING'), path.join(licenseOutput, 'KANJIVG-COPYING.txt'));
copy(path.join(animCjkRoot, 'licenses', 'COPYING.txt'), path.join(licenseOutput, 'ANIMCJK-COPYING.txt'));
copy(path.join(kanjiDataRoot, 'LICENSE'), path.join(licenseOutput, 'KANJI-DATA-LICENSE.txt'));

const orderedCharacters = Object.fromEntries(
    Object.entries(characters).sort(([left], [right]) => left.localeCompare(right, 'ja')),
);

fs.writeFileSync(
    path.join(outputRoot, 'manifest.json'),
    `${JSON.stringify({
        schema: 'toku-up-strokes-v1',
        version: '2026-07-28',
        coordinate_system: 109,
        characters: orderedCharacters,
    }, null, 2)}\n`,
    'utf8',
);

console.log(`Stroke assets ready: ${Object.keys(orderedCharacters).length} characters.`);
