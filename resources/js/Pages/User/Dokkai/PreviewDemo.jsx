import React from 'react';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import DokkaiQuizRunner from '@/Components/Features/DokkaiQuiz/DokkaiQuizRunner';

export default function PreviewDemo({
    quiz,
    paragraphs = [],
    vocabularies = [],
    questions = [],
    quizId,
    persist = false,
}) {
    const handleSubmitAttempt = async (attemptPayload) => {
        try {
            const targetId = quizId || quiz?.id;
            const endpoint = typeof route !== 'undefined'
                ? route('user.dokkai-quizzes.submit', { quiz: targetId })
                : `/user/dokkai-quizzes/${targetId}/submit`;

            const response = await axios.post(endpoint, {
                answers: attemptPayload.answers,
                submission_token: attemptPayload.submission_token,
            });

            return response.data;
        } catch (error) {
            console.error('Failed to submit dokkai attempt to server:', error);
            return null;
        }
    };

    return (
        <>
            <Head title={`${persist ? '' : '[PRATINJAU] '}${quiz?.title || 'Dokkai'} - Pemahaman Membaca`} />
            <DokkaiQuizRunner
                quiz={quiz}
                paragraphs={paragraphs}
                vocabularies={vocabularies}
                questions={questions}
                onClose={() => {
                    if (window.history.length > 1) {
                        window.history.back();
                    } else {
                        window.location.href = '/user/dokkai';
                    }
                }}
                persist={persist}
                onSubmitAttempt={handleSubmitAttempt}
            />
        </>
    );
}
