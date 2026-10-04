<?php

use App\Events\SupportChatUpdated;
use App\Models\Pengguna;
use App\Models\SupportChat;
use App\Services\SupportChatService;
use App\Services\SupportQuickAnswers;
use App\Services\SupportWhatsAppSettings;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;

beforeEach(function () {
    Event::fake([SupportChatUpdated::class]);
});

it('starts a visitor conversation and keeps its messages private', function () {
    $this->postJson(route('support.chat.start'), [
        'name' => 'Rina',
        'email' => 'RINA@example.test',
        'body' => 'Saya ingin bertanya tentang kelas.',
        'topic' => 'Kelas',
        'website' => '',
    ])->assertCreated()->assertJsonPath('chat.name', 'Rina');

    $chat = SupportChat::firstOrFail();
    expect($chat->email)->toBe('rina@example.test');
    expect($chat->messages()->count())->toBe(1);
    expect($chat->messages()->first()->topic)->toBe('Kelas');
    expect($chat->visitor_token_hash)->toHaveLength(64);

    $this->getJson(route('support.chat.state'))->assertOk()->assertJsonPath('chat', null);
    $this->postJson(route('support.chat.send'), ['body' => 'Pesan kedua'])->assertForbidden();
    $this->postJson(route('superadmin.support.reply', $chat), ['body' => 'Balasan'])->assertUnauthorized();
});

it('allows only the visitor token or superadmin to read a conversation', function () {
    $token = Str::random(64);
    $chat = SupportChat::create([
        'visitor_token_hash' => hash('sha256', $token),
        'name' => 'Rina',
        'email' => 'rina@example.test',
    ]);
    $chat->messages()->create(['sender' => 'visitor', 'body' => 'Pertanyaan awal']);

    $this->withCredentials()->withCookie(SupportChatService::COOKIE, $token)
        ->getJson(route('support.chat.state'))
        ->assertOk()->assertJsonPath('chat.id', $chat->id);
    $this->postJson(route('support.chat.send'), ['body' => 'Pesan lanjutan', 'topic' => 'Pembayaran'])
        ->assertCreated()->assertJsonCount(2, 'chat.messages');
    config()->set('broadcasting.connections.reverb.key', 'test-key');
    config()->set('broadcasting.connections.reverb.secret', 'test-secret');
    $this->postJson(route('support.chat.broadcast-auth'), [
        'socket_id' => '123.456',
        'channel_name' => 'private-support-chat.'.$chat->id,
    ])->assertOk();
    $this->postJson(route('support.chat.broadcast-auth'), [
        'socket_id' => '123.456',
        'channel_name' => 'private-support-chat.'.($chat->id + 1),
    ])->assertForbidden();
    $this->postJson(route('support.chat.broadcast-auth'), [
        'socket_id' => '123.456',
        'channel_name' => 'private-support-admin',
    ])->assertForbidden();

    $user = Pengguna::factory()->create(['role' => 'user']);
    $this->actingAs($user)->getJson(route('superadmin.support.show', $chat))->assertForbidden();

    $admin = Pengguna::factory()->create(['role' => 'superadmin']);
    $this->actingAs($admin)->postJson(route('superadmin.support.reply', $chat), ['body' => 'Kami bantu cek.'])
        ->assertCreated()->assertJsonPath('chat.unread_visitor', 1);
    $this->getJson(route('superadmin.support.show', $chat))->assertOk()->assertJsonPath('email', 'rina@example.test');
});

it('rejects spam and invalid topics while keeping the contact number out of admin props when disabled', function () {
    $this->postJson(route('support.chat.start'), [
        'name' => 'Rina',
        'email' => 'rina@example.test',
        'body' => 'Pesan percobaan',
        'topic' => 'Kelas',
        'website' => 'spam.example',
    ])->assertUnprocessable();
    expect(SupportChat::count())->toBe(0);

    $this->postJson(route('support.chat.start'), [
        'name' => 'Rina',
        'email' => 'rina@example.test',
        'body' => 'Pesan percobaan',
        'topic' => 'Topik tidak tersedia',
    ])->assertUnprocessable();

    app(SupportWhatsAppSettings::class)->save([
        'enabled' => false,
        'recipient' => '628123456789',
    ]);
    $this->getJson(route('support.chat.state'))->assertOk()
        ->assertJsonPath('whatsapp_url', null)
        ->assertJsonPath('topics.0', 'Kelas');

    $admin = Pengguna::factory()->create(['role' => 'superadmin']);
    $response = $this->actingAs($admin)->get(route('superadmin.support'));
    $response->assertOk();
    expect($response->getContent())->not->toContain('api_version');
});

it('updates chat status via json and supports pagination with before_id', function () {
    $admin = Pengguna::factory()->create(['role' => 'superadmin']);
    $chat = SupportChat::create([
        'visitor_token_hash' => hash('sha256', Str::random(64)),
        'name' => 'Budi',
        'email' => 'budi@example.test',
        'status' => 'open',
    ]);

    for ($i = 1; $i <= 55; $i++) {
        $chat->messages()->create(['sender' => 'visitor', 'body' => "Pesan ke-$i"]);
    }

    $response = $this->actingAs($admin)->patchJson(route('superadmin.support.status', $chat), [
        'status' => 'closed',
    ]);
    $response->assertOk()->assertJson(['ok' => true, 'status' => 'closed']);
    expect($chat->fresh()->status)->toBe('closed');

    $initialLoad = $this->actingAs($admin)->getJson(route('superadmin.support.show', $chat));
    $initialLoad->assertOk()
        ->assertJsonPath('chat.has_more', true)
        ->assertJsonCount(50, 'chat.messages');

    $oldestId = $initialLoad->json('chat.messages.0.id');
    $olderLoad = $this->actingAs($admin)->getJson(route('superadmin.support.show', [
        'chat' => $chat,
        'before_id' => $oldestId,
    ]));
    $olderLoad->assertOk()
        ->assertJsonPath('chat.has_more', false)
        ->assertJsonCount(5, 'chat.messages');
});

it('publishes the configured contact link without queueing a WhatsApp notification', function () {
    Queue::fake();
    $admin = Pengguna::factory()->create(['role' => 'superadmin']);

    $this->actingAs($admin)->put(route('superadmin.support.whatsapp.settings'), [
        'enabled' => true,
        'recipient' => '628123456789',
    ])->assertRedirect();

    $this->getJson(route('support.chat.state'))->assertOk()
        ->assertJsonPath('whatsapp_url', 'https://wa.me/628123456789');

    $this->postJson(route('support.chat.start'), [
        'name' => 'Dimas',
        'email' => 'dimas@example.test',
        'body' => 'Apakah kelas N3 ada rekaman?',
        'topic' => 'Kelas',
    ])->assertCreated()->assertJsonPath('chat.messages.0.topic', 'Kelas');

    Queue::assertNothingPushed();
    expect(app(SupportWhatsAppSettings::class)->get())->toBe([
        'enabled' => true,
        'recipient' => '628123456789',
    ]);

    $this->actingAs($admin)->put(route('superadmin.support.whatsapp.settings'), [
        'enabled' => false,
        'recipient' => '628123456789',
    ])->assertRedirect();
    $this->getJson(route('support.chat.state'))->assertJsonPath('whatsapp_url', null);

    $this->actingAs($admin)->put(route('superadmin.support.whatsapp.settings'), [
        'enabled' => true,
        'recipient' => '08123456789',
    ])->assertSessionHasErrors('recipient');
});

it('serves only admin-managed quick answers and allows clearing them', function () {
    $this->getJson(route('support.chat.state'))
        ->assertOk()->assertJsonPath('quick_answers', []);

    $user = Pengguna::factory()->create(['role' => 'user']);
    $this->actingAs($user)->putJson(route('superadmin.support.quick-answers'), [
        'quick_answers' => [['question' => 'Pertanyaan umum?', 'answer' => 'Jawaban umum.']],
    ])->assertForbidden();

    $admin = Pengguna::factory()->create(['role' => 'superadmin']);
    $this->actingAs($admin)->putJson(route('superadmin.support.quick-answers'), [
        'quick_answers' => [['question' => 'Kapan kelas dimulai?', 'answer' => 'Lihat jadwal pada halaman kelas.']],
    ])->assertRedirect();

    $this->getJson(route('support.chat.state'))
        ->assertJsonPath('quick_answers.0.question', 'Kapan kelas dimulai?')
        ->assertJsonPath('quick_answers.0.answer', 'Lihat jadwal pada halaman kelas.');
    expect(app(SupportQuickAnswers::class)->get())->toHaveCount(1);

    $this->putJson(route('superadmin.support.quick-answers'), [
        'quick_answers' => [['question' => ' ', 'answer' => 'Jawaban valid.']],
    ])->assertUnprocessable();

    $this->putJson(route('superadmin.support.quick-answers'), [
        'quick_answers' => [],
    ])->assertRedirect();
    $this->getJson(route('support.chat.state'))
        ->assertJsonPath('quick_answers', []);
});
