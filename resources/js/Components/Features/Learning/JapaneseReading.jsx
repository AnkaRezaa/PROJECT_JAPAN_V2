import React from 'react';
import { usePage } from '@inertiajs/react';

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

function toHiragana(value = '') {
    return [...value].map((character) => {
        const code = character.charCodeAt(0);
        return code >= 0x30a1 && code <= 0x30f6 ? String.fromCharCode(code - 0x60) : character;
    }).join('');
}

export function kanaToRomaji(value = '') {
    const kana = toHiragana(value.trim());
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

export default function JapaneseReading({ japanese, reading, translation, className = '', forcePreferences = null }) {
    const preferences = usePage().props.auth?.user || {};
    const showRomaji = forcePreferences?.showRomaji ?? Boolean(preferences.show_romaji);
    const showTranslation = forcePreferences?.showTranslation ?? Boolean(preferences.show_indonesian_translation);

    return (
        <span className={`inline-flex max-w-full flex-col ${className}`}>
            <span lang="ja" className="break-words">{japanese}</span>
            {reading && <span lang="ja" className="mt-1 break-words text-sm font-medium text-sky-700 dark:text-sky-300">{reading}</span>}
            {showRomaji && reading && <span className="mt-0.5 break-words text-xs font-semibold text-gray-500 dark:text-gray-400">{kanaToRomaji(reading)}</span>}
            {showTranslation && translation && <span lang="id" className="mt-1.5 break-words text-sm leading-6 text-emerald-700 dark:text-emerald-300">{translation}</span>}
        </span>
    );
}
