import { emptyQuestion, normalizeQuestions } from '@/lib/quizHelpers';

export function vocabularyQuestionsFromDraft(draft) {
  return draft.questions.map(q => ({
    id: null,
    type: 'multiple_choice',
    stage: q.stage || null,
    source_type: q.source?.type || q.source_type || 'vocabulary',
    source_id: q.source?.id ?? q.source_id ?? null,
    generation_mode: q.generation_mode || q.source?.mode || q.stage || 'word_to_meaning',
    question_text: q.prompt,
    highlight_text: q.highlight_text || '',
    question_reading: q.reading,
    show_question_reading: q.show_question_reading ?? false,
    options: q.choices.map(c => c.text),
    option_readings: q.choices.map(c => c.reading),
    correct_answer: q.choices.find(c => c.id === q.answer.choice_id)?.text || '',
    correct_answer_reading: q.choices.find(c => c.id === q.answer.choice_id)?.reading || '',
    explanation: q.explanation,
    explanation_reading: q.explanation_reading,
    audio_url: q.audio_url,
    points: q.points
  }));
}
export function appendVocabularyQuestionsFromDraft(draft, existingQuestions, quizType) {
  const placeholder = emptyQuestion(existingQuestions[0]?.type || quizType);
  const isEmptyPlaceholder = existingQuestions.length === 1 &&
    Object.entries(existingQuestions[0]).every(([key, value]) =>
      JSON.stringify(value) === JSON.stringify(placeholder[key]));
  const existing = isEmptyPlaceholder ? [] : existingQuestions;
  const existingKeys = new Set(
    existing
      .filter(q => q.source_type && q.source_id && q.generation_mode)
      .map(q => `${q.source_type}:${q.source_id}:${q.generation_mode}`)
  );
  const generated = normalizeQuestions(vocabularyQuestionsFromDraft(draft), quizType)
    .filter(q => {
      if (!q.source_type || !q.source_id || !q.generation_mode) return true;
      const key = `${q.source_type}:${q.source_id}:${q.generation_mode}`;
      if (existingKeys.has(key)) return false;
      existingKeys.add(key);
      return true;
    });

  return [...existing, ...generated];
}
export function grammarStagesFromDraft(draft) {
  const titles = {
    transformation: 'Transformasi Pola',
    sentence_builder: 'Penyusunan Kalimat',
    context_choice: 'Pilihan Kontekstual'
  };
  return Object.entries(titles).map(([id, title]) => ({
    id,
    title,
    questions: draft.questions.filter(q => q.stage === id).map(q => ({
      id: q.id,
      type: q.kind === 'sentence_builder' ? q.kind : q.stage,
      prompt: q.prompt,
      highlight_text: q.highlight_text || '',
      japanese: q.japanese,
      reading: q.reading,
      translation: q.translation,
      context: q.context,
      ...(q.kind === 'sentence_builder' ? {
        tokens: q.tokens,
        correctOrder: q.answer.correct_order
      } : {
        choices: q.choices.map(c => c.text),
        correctAnswer: q.choices.find(c => c.id === q.answer.choice_id)?.text || ''
      }),
      explanation: q.explanation,
      points: q.points
    }))
  }));
}
export function grammarQuestionsToDraft(stages) {
  return stages.flatMap(stage => stage.questions.map(q => ({
    id: String(q.id),
    kind: stage.id === 'sentence_builder' ? 'sentence_builder' : 'choice',
    stage: stage.id,
    prompt: q.prompt || '',
    highlight_text: q.highlight_text || null,
    japanese: q.japanese || '',
    choices: (q.choices || []).filter(text => text?.trim()).map((text, i) => ({
      id: `c${i + 1}`,
      text
    })),
    tokens: (q.tokens || []).filter(t => t.text?.trim()),
    answer: stage.id === 'sentence_builder' ? {
      correct_order: q.correctOrder || []
    } : {
      choice_id: `c${(q.choices || []).filter(text => text?.trim()).indexOf(q.correctAnswer) + 1}`
    }
  })));
}
export function dokkaiMaterialFromDraft(draft) {
  return {
    ...draft.material,
    paragraphs: draft.material.paragraphs.map(p => ({
      ...p,
      id: null
    })),
    vocabularies: draft.material.vocabularies.map(v => ({
      ...v,
      id: null
    })),
    questions: draft.questions.map((q, index) => ({
      id: null,
      question_number: index + 1,
      question_text: q.prompt,
      highlight_text: q.highlight_text || '',
      question_translation: q.translation,
      evidence_paragraph_number: q.evidence?.paragraph_number,
      evidence_quote: q.evidence?.quote,
      explanation_correct: q.explanation,
      explanation_distractors: q.distractor_explanations || {},
      options: q.choices.map((choice, idx) => ({
        id: idx + 1,
        option_label: String.fromCharCode(65 + idx),
        option_text: choice.text,
        option_translation: choice.translation || null,
        is_correct: choice.id === q.answer.choice_id
      }))
    }))
  };
}
