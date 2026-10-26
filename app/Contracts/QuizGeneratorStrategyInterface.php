<?php

namespace App\Contracts;

interface QuizGeneratorStrategyInterface
{
    public function generateDraft(array $payload, array $settings): array;

    public function regenerateSingleQuestion(string $id, array $context): array;
}
