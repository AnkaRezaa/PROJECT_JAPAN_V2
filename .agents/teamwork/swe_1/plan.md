# SWE Light Execution Plan: Kuis Grammar Generator Testing

## Objective
Execute comprehensive whitebox testing and functional validation of Smart Generator Kuis Grammar feature (KuisGrammarGeneratorService & AdminGrammarQuizController) against R1-R4 requirements and Acceptance Criteria.

## Plan Stages
1. **Implementation Round (teamwork_preview_implementer)**
   - Author comprehensive unit and integration tests covering:
     - R1: Verb conjugations (te, ta, nai, ba, stem, dict, potential, passive, causative), target_form override, fallback detection, 3 non-duplicate valid distractors.
     - R2: Pipe '|' segmentation, smartSegmentJapaneseSentence natural boundary splitting without cutting kanji/words, distractor particle tokens.
     - R3: Contextual choice questions, 0 dummy text "文法パターン例文", smart distractor synthesis / fallback.
     - R4: Admin endpoints `/admin/grammar-quizzes/generate-draft` & `/admin/grammar-quizzes/regenerate-question`, settings.target_form validation, 3-stage JSON response.
   - Run tests and report results.
2. **Review Round 1 (teamwork_preview_reviewer)**
   - Adversarial testing & breaking tests.
   - Fix bugs, edge cases, and missing assertions.
3. **Review Round 2 (teamwork_preview_reviewer)**
   - Boundary tests, invalid inputs, DB empty vs populated fallback testing.
4. **Review Round 3 (teamwork_preview_reviewer)**
   - Regression verification, full test suite integrity, layout compliance.
5. **Victory Audit (teamwork_preview_victory_auditor)**
   - Independent verification of 100% green tests, 0 dummy text, natural segmentation, target_form override, API 200.
6. **Victory Claim & Handoff**
   - Submit final completion report to parent orchestrator.
