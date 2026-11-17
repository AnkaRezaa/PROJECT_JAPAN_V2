<?php

namespace App\Services;

use App\Models\Pengguna;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;

class MailtrapTemplateService
{
    public function shouldUse(string $template): bool
    {
        if (! (bool) config('services.mailtrap.templates_enabled')
            || blank(config('services.mailtrap.api_token'))
            || blank($this->templateUuid($template))) {
            return false;
        }

        return ! $this->usesSandboxEndpoint()
            || filled(config('services.mailtrap.sandbox_inbox_id'));
    }

    /**
     * @throws RequestException
     */
    public function send(Pengguna $recipient, string $template, array $variables): void
    {
        $response = Http::withToken((string) config('services.mailtrap.api_token'))
            ->connectTimeout(5)
            ->timeout(15)
            ->acceptJson()
            ->post($this->endpoint(), [
                'from' => [
                    'email' => config('mail.from.address'),
                    'name' => config('mail.from.name'),
                ],
                'to' => [[
                    'email' => $recipient->email,
                    'name' => $recipient->username,
                ]],
                'template_uuid' => $this->templateUuid($template),
                'template_variables' => $variables,
            ]);

        $response->throw();
    }

    private function endpoint(): string
    {
        $inboxId = config('services.mailtrap.sandbox_inbox_id');

        if (filled($inboxId)) {
            return 'https://sandbox.api.mailtrap.io/api/send/'.rawurlencode((string) $inboxId);
        }

        return (string) config('services.mailtrap.api_endpoint');
    }

    private function usesSandboxEndpoint(): bool
    {
        return str_contains(
            (string) config('services.mailtrap.api_endpoint'),
            'sandbox.api.mailtrap.io'
        );
    }

    private function templateUuid(string $template): ?string
    {
        return config("services.mailtrap.templates.{$template}");
    }
}
