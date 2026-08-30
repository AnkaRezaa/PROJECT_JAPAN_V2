import { useState } from 'react';

export default function QuizQuestion({ question, options = [], correctAnswer, onAnswer, index }) {
    const [selected, setSelected] = useState(null);
    const [submitted, setSubmitted] = useState(false);

    const handleSelect = (opt) => {
        if (submitted) return;
        setSelected(opt);
    };

    const handleSubmit = () => {
        if (!selected) return;
        setSubmitted(true);
        onAnswer?.(selected === correctAnswer);
    };

    return (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
                <span className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-xs font-bold text-brand-700">{index}</span>
                <h4 className="font-bold text-gray-900">{question}</h4>
            </div>
            <div className="space-y-2 mb-4">
                {options.map((opt, i) => (
                    <button
                        key={i}
                        onClick={() => handleSelect(opt)}
                        className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${submitted
                                ? opt === correctAnswer
                                    ? 'border-green-500 bg-green-50 text-green-700'
                                    : opt === selected
                                        ? 'border-red-500 bg-red-50 text-red-700'
                                        : 'border-gray-100 text-gray-400'
                                : selected === opt
                                    ? 'border-red-600 bg-red-50 text-red-600'
                                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                            }`}
                    >
                        {opt}
                    </button>
                ))}
            </div>
            {!submitted && (
                <button
                    onClick={handleSubmit}
                    disabled={!selected}
                    className="min-h-11 w-full rounded-lg bg-[var(--toku-primary)] py-2.5 font-semibold text-white transition-all hover:bg-[var(--toku-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--toku-focus)] disabled:pointer-events-none disabled:opacity-40"
                >
                    Check Answer
                </button>
            )}
            {submitted && (
                <div className={`text-sm font-semibold ${selected === correctAnswer ? 'text-green-600' : 'text-red-600'}`}>
                    {selected === correctAnswer ? '✓ Correct!' : `✕ Incorrect. Answer: ${correctAnswer}`}
                </div>
            )}
        </div>
    );
}
