import React from 'react';
import { Head, router } from '@inertiajs/react';
import DokkaiQuizRunner from '@/Components/Features/DokkaiQuiz/DokkaiQuizRunner';
import axios from 'axios';

export default function KerjakanDokkai({
    quiz,
    paragraphs = [],
    vocabularies = [],
    questions = [],
    initialAttempt = null,
    backUrl = '/user/dokkai',
}) {
    const handleClose = () => {
        router.visit(backUrl);
    };

    const handleSubmitAttempt = async (payload) => {
        try {
            await axios.post(`/user/dokkai/${quiz.id}/attempts`, payload);
        } catch (err) {
            console.error('Gagal menyimpan hasil evaluasi dokkai:', err);
        }
    };

    const handleBookmark = async (vocabId) => {
        try {
            await axios.post(`/user/dokkai/vocabularies/${vocabId}/bookmark`);
        } catch (err) {
            console.error('Gagal memperbarui status bookmark SRS:', err);
        }
    };

    return (
        <>
            <Head title={`${quiz?.title || 'Dokkai'} - Pemahaman Membaca`} />
            <DokkaiQuizRunner
                quiz={quiz}
                paragraphs={paragraphs}
                vocabularies={vocabularies}
                questions={questions}
                initialAttempt={initialAttempt}
                onClose={handleClose}
                onSubmitAttempt={handleSubmitAttempt}
                onBookmark={handleBookmark}
                persist={true}
            />
        </>
    );
}
