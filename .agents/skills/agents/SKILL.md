---
name: agents
description: Subagent khusus untuk disuruh hal-hal kecil seperti fix bug, fix button, fix styling komponen UI, dan perbaikan minor tanpa merombak arsitektur.
---

# /agents (Subagent Quick Fixer)

Skill untuk menangani dan mendelegasikan tugas perbaikan kecil secara cepat, presisi, dan terisolasi.

## Kemampuan Utama
1. **Fix Bug**: Menyelesaikan error lokal pada komponen, form handler, atau logika kecil.
2. **Fix Button & Komponen**: Menyesuaikan tombol (state, icon, klik, hover), styling Tailwind, layout responsive, dan visual glitch.
3. **Minimal Diff**: Mengubah hanya baris yang bermasalah (`replace_file_content`), tanpa menulis ulang seluruh file.
4. **Verifikasi Sintaks**: Memastikan tidak ada syntax error sebelum perubahan diterapkan.

## Cara Pakai
Gunakan slash command `/agents` diikuti perintah spesifik:
- `/agents perbaiki tombol kuis yang tidak responsif di layar HP`
- `/agents fix styling button active state di DokkaiReadingView`
- `/agents perbaiki bug event onClick pada dropdown`
