import React from 'react';
import QuizField from '@/Components/UI/QuizField';
import HighlightedLearningText from '@/Components/Features/Learning/HighlightedLearningText';
import { getQuestionHighlightError } from '@/lib/quizHelpers';
import { previewQuestionHighlight } from '@/lib/questionMarkup';

export default function QuestionHighlightField({ text, value, onChange, error }) {
    const preview = previewQuestionHighlight(text, value);
    const validationError = error || getQuestionHighlightError(text, value) || preview.error;

    return (
        <div className="space-y-2">
            <QuizField label="Kata/frasa yang disorot" tooltip={'Tandai satu kata Jepang dengan (kata). Untuk kurung biasa pada teks Jepang, gunakan \\(kata\\).'} error={validationError}>
                <input type="text" lang="ja" maxLength={500} value={value || ''} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100" />
            </QuizField>
            {!validationError && (
                <p lang="ja" className="whitespace-pre-wrap break-words text-sm text-gray-800 dark:text-gray-200">
                    <HighlightedLearningText text={preview.text} term={preview.term} variant="question" />
                </p>
            )}
        </div>
    );
}
