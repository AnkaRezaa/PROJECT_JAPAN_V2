<?php

namespace App\Services;

use App\Models\DeckPresentasi;
use DOMDocument;
use DOMElement;
use DOMXPath;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use ZipArchive;

class ImportPresentasiPptxService
{
    private const MAX_SLIDES = 60;
    private const MAX_TOTAL_EXTRACT_BYTES = 100 * 1024 * 1024;
    private const MAX_MEDIA_BYTES = 5 * 1024 * 1024;
    private const CANVAS_WIDTH = 1280;

    public function __construct(private readonly PresentasiStorageService $storage)
    {
    }

    public function import(DeckPresentasi $deck, UploadedFile $file): int
    {
        $privatePath = $this->storage->storePrivateUpload($file, "presentations/imports/pptx/{$deck->id}", 'pptx');
        $localPath = Storage::disk('local')->path($privatePath);

        $zip = new ZipArchive();
        if ($zip->open($localPath) !== true) {
            throw ValidationException::withMessages([
                'pptx_file' => 'File PPTX tidak bisa dibuka.',
            ]);
        }

        try {
            $this->validateArchive($zip);

            $slidePaths = $this->slidePaths($zip);
            if ($slidePaths === []) {
                throw ValidationException::withMessages([
                    'pptx_file' => 'Tidak ada slide yang bisa dibaca dari PPTX.',
                ]);
            }

            $slideSize = $this->slideSize($zip);
            $canvasSize = $this->canvasSize($slideSize);
            $mediaCache = [];
            $warnings = [];
            $nextOrder = (int) $deck->slides()->max('order') + 1;

            foreach (array_slice($slidePaths, 0, self::MAX_SLIDES) as $index => $slidePath) {
                $slideXml = $zip->getFromName($slidePath);
                if (! $slideXml) {
                    $warnings[] = basename($slidePath) . ' tidak bisa dibaca.';
                    continue;
                }

                $relationships = $this->relationshipsForSlide($zip, $slidePath);
                $parsed = $this->parseSlide($zip, $slideXml, $relationships, $slideSize, $canvasSize, $deck->id, $mediaCache);
                $title = $parsed['title'] ?: 'Import PPTX Slide ' . ($index + 1);

                $deck->slides()->create([
                    'title' => Str::limit($title, 120, ''),
                    'layout' => 'canvas',
                    'content' => $parsed['content'],
                    'media_url' => $parsed['primary_media_url'],
                    'background' => $parsed['background'] ?? 'light',
                    'accent_color' => '#E64A19',
                    'speaker_notes' => null,
                    'order' => $nextOrder + $index,
                    'source_type' => 'pptx',
                    'canvas_json' => $parsed['canvas_json'],
                    'snapshot_url' => null,
                    'source_meta' => [
                        'slide_path' => $slidePath,
                        'original_width' => $slideSize['cx'],
                        'original_height' => $slideSize['cy'],
                        'canvas_width' => $canvasSize['width'],
                        'canvas_height' => $canvasSize['height'],
                        'aspect_ratio' => round($canvasSize['width'] / max(1, $canvasSize['height']), 6),
                        'objects_count' => count($parsed['canvas_json']['objects']),
                    ],
                ]);
            }

            $importedCount = min(count($slidePaths), self::MAX_SLIDES);
            if (count($slidePaths) > self::MAX_SLIDES) {
                $warnings[] = 'Sebagian slide tidak diimport karena batas maksimal ' . self::MAX_SLIDES . ' slide.';
            }

            $hasPdfFinal = $deck->source_type === 'pdf' && filled($deck->source_file_path);
            $summary = [
                'slides_imported' => $importedCount,
                'warnings' => $warnings,
                'pptx_draft' => [
                    'path' => $privatePath,
                    'original_name' => $file->getClientOriginalName(),
                    'size' => $file->getSize(),
                ],
                'note' => $hasPdfFinal
                    ? 'PPTX diimport sebagai draft editable. PDF final tetap dipakai sebagai viewer user.'
                    : 'PPTX diimport sebagai draft editable. Cek ulang layout sebelum publish.',
            ];

            $deckUpdate = [
                'import_summary' => $summary,
            ];

            if (! $hasPdfFinal) {
                $deckUpdate += [
                    'source_type' => 'pptx',
                    'source_file_path' => $privatePath,
                    'source_file_name' => $file->getClientOriginalName(),
                    'source_file_size' => $file->getSize(),
                    'import_status' => 'needs_review',
                ];
            }

            $deck->update($deckUpdate);

            return $importedCount;
        } finally {
            $zip->close();
        }
    }

    private function validateArchive(ZipArchive $zip): void
    {
        $totalSize = 0;

        for ($index = 0; $index < $zip->numFiles; $index++) {
            $stat = $zip->statIndex($index);
            $name = $stat['name'] ?? '';

            if ($this->isUnsafePath($name)) {
                throw ValidationException::withMessages([
                    'pptx_file' => 'Struktur PPTX tidak aman.',
                ]);
            }

            $totalSize += (int) ($stat['size'] ?? 0);
            if ($totalSize > self::MAX_TOTAL_EXTRACT_BYTES) {
                throw ValidationException::withMessages([
                    'pptx_file' => 'Total isi PPTX terlalu besar setelah dibuka.',
                ]);
            }
        }
    }

    private function isUnsafePath(string $path): bool
    {
        return str_contains($path, '..')
            || str_starts_with($path, '/')
            || preg_match('/^[A-Za-z]:[\/\\\\]/', $path) === 1;
    }

    private function slidePaths(ZipArchive $zip): array
    {
        $paths = [];

        for ($index = 0; $index < $zip->numFiles; $index++) {
            $name = $zip->getNameIndex($index);
            if (preg_match('#^ppt/slides/slide\d+\.xml$#', $name)) {
                $paths[] = $name;
            }
        }

        usort($paths, fn ($left, $right) => strnatcmp($left, $right));

        return $paths;
    }

    private function slideSize(ZipArchive $zip): array
    {
        $xml = $zip->getFromName('ppt/presentation.xml');
        if (! $xml) {
            return ['cx' => 12192000, 'cy' => 6858000];
        }

        $document = $this->dom($xml);
        if (! $document) {
            return ['cx' => 12192000, 'cy' => 6858000];
        }

        $xpath = new DOMXPath($document);
        $xpath->registerNamespace('p', 'http://schemas.openxmlformats.org/presentationml/2006/main');
        $node = $xpath->query('//p:sldSz')->item(0);

        if (! $node instanceof DOMElement) {
            return ['cx' => 12192000, 'cy' => 6858000];
        }

        return [
            'cx' => max(1, (int) $node->getAttribute('cx')),
            'cy' => max(1, (int) $node->getAttribute('cy')),
        ];
    }

    private function canvasSize(array $slideSize): array
    {
        $ratio = max(0.1, $slideSize['cy'] / max(1, $slideSize['cx']));

        return [
            'width' => self::CANVAS_WIDTH,
            'height' => (int) round(self::CANVAS_WIDTH * $ratio),
        ];
    }

    private function relationshipsForSlide(ZipArchive $zip, string $slidePath): array
    {
        $file = basename($slidePath);
        $relsPath = dirname($slidePath) . '/_rels/' . $file . '.rels';
        $xml = $zip->getFromName($relsPath);

        if (! $xml) {
            return [];
        }

        $document = $this->dom($xml);
        if (! $document) {
            return [];
        }

        $xpath = new DOMXPath($document);
        $xpath->registerNamespace('rel', 'http://schemas.openxmlformats.org/package/2006/relationships');

        $relationships = [];
        foreach ($xpath->query('//rel:Relationship') as $node) {
            if ($node instanceof DOMElement) {
                $relationships[$node->getAttribute('Id')] = $this->normalizePackagePath(dirname($slidePath) . '/' . $node->getAttribute('Target'));
            }
        }

        return $relationships;
    }

    private function parseSlide(ZipArchive $zip, string $xml, array $relationships, array $slideSize, array $canvasSize, int $deckId, array &$mediaCache): array
    {
        $document = $this->dom($xml);
        if (! $document) {
            return [
                'title' => null,
                'content' => null,
                'primary_media_url' => null,
                'background' => 'light',
                'canvas_json' => $this->emptyCanvas($canvasSize),
            ];
        }

        $xpath = new DOMXPath($document);
        $xpath->registerNamespace('p', 'http://schemas.openxmlformats.org/presentationml/2006/main');
        $xpath->registerNamespace('a', 'http://schemas.openxmlformats.org/drawingml/2006/main');
        $xpath->registerNamespace('r', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships');

        $slideBgColor = null;
        $bgClrNode = $xpath->query('//p:bg//a:srgbClr/@val')->item(0)
            ?? $xpath->query('//p:bgPr//a:srgbClr/@val')->item(0);
        if ($bgClrNode && preg_match('/^[0-9A-Fa-f]{6}$/', $bgClrNode->nodeValue)) {
            $slideBgColor = '#' . strtoupper($bgClrNode->nodeValue);
        }

        $slideBgImageUrl = null;
        $bgBlipNode = $xpath->query('//p:bg//a:blip/@r:embed | //p:bgPr//a:blip/@r:embed')->item(0);
        if ($bgBlipNode) {
            $bgRelId = $bgBlipNode->nodeValue;
            $bgTarget = $bgRelId ? ($relationships[$bgRelId] ?? null) : null;
            $slideBgImageUrl = $bgTarget ? $this->extractMedia($zip, $bgTarget, $deckId, $mediaCache) : null;
        }

        $isDarkBg = false;
        if ($slideBgColor) {
            $r = hexdec(substr($slideBgColor, 1, 2));
            $g = hexdec(substr($slideBgColor, 3, 2));
            $b = hexdec(substr($slideBgColor, 5, 2));
            $luminance = (0.299 * $r + 0.587 * $g + 0.114 * $b);
            $isDarkBg = $luminance < 128;
        }

        $objects = [];
        $textLines = [];
        $primaryMediaUrl = null;
        $fallbackTop = 72;

        $rootTransform = [
            'offX' => 0,
            'offY' => 0,
            'scaleX' => 1.0,
            'scaleY' => 1.0,
            'chOffX' => 0,
            'chOffY' => 0,
        ];

        $this->parseTreeNode(
            $xpath,
            $xpath->query('//p:spTree')->item(0),
            $rootTransform,
            $zip,
            $relationships,
            $slideSize,
            $canvasSize,
            $deckId,
            $mediaCache,
            $objects,
            $textLines,
            $primaryMediaUrl,
            $fallbackTop
        );

        return [
            'title' => $textLines[0] ?? null,
            'content' => implode("\n\n", array_slice($textLines, 1, 6)) ?: null,
            'primary_media_url' => $primaryMediaUrl,
            'background' => $isDarkBg ? 'dark' : 'light',
            'canvas_json' => [
                'version' => 1,
                'width' => $canvasSize['width'],
                'height' => $canvasSize['height'],
                'backgroundColor' => $slideBgColor ?? '#FFFFFF',
                'backgroundImageUrl' => $slideBgImageUrl,
                'objects' => $objects,
            ],
        ];
    }

    private function parseTreeNode(
        DOMXPath $xpath,
        ?DOMElement $container,
        array $transform,
        ZipArchive $zip,
        array $relationships,
        array $slideSize,
        array $canvasSize,
        int $deckId,
        array &$mediaCache,
        array &$objects,
        array &$textLines,
        ?string &$primaryMediaUrl,
        int &$fallbackTop
    ): void {
        if (! $container) {
            return;
        }

        foreach ($container->childNodes as $node) {
            if (! $node instanceof DOMElement) {
                continue;
            }

            $nodeTag = $node->nodeName;
            if ($nodeTag === 'p:nvGrpSpPr' || $nodeTag === 'p:grpSpPr') {
                continue;
            }

            if ($nodeTag === 'p:grpSp') {
                $grpOff = $xpath->query('p:grpSpPr/a:xfrm/a:off', $node)->item(0);
                $grpExt = $xpath->query('p:grpSpPr/a:xfrm/a:ext', $node)->item(0);
                $chOff = $xpath->query('p:grpSpPr/a:xfrm/a:chOff', $node)->item(0);
                $chExt = $xpath->query('p:grpSpPr/a:xfrm/a:chExt', $node)->item(0);

                $gx = $grpOff instanceof DOMElement ? (int) $grpOff->getAttribute('x') : 0;
                $gy = $grpOff instanceof DOMElement ? (int) $grpOff->getAttribute('y') : 0;
                $gw = $grpExt instanceof DOMElement ? (int) $grpExt->getAttribute('cx') : 1;
                $gh = $grpExt instanceof DOMElement ? (int) $grpExt->getAttribute('cy') : 1;

                $cx = $chOff instanceof DOMElement ? (int) $chOff->getAttribute('x') : 0;
                $cy = $chOff instanceof DOMElement ? (int) $chOff->getAttribute('y') : 0;
                $cw = $chExt instanceof DOMElement ? max(1, (int) $chExt->getAttribute('cx')) : 1;
                $ch = $chExt instanceof DOMElement ? max(1, (int) $chExt->getAttribute('cy')) : 1;

                $slideGx = $transform['offX'] + (int) round(($gx - $transform['chOffX']) * $transform['scaleX']);
                $slideGy = $transform['offY'] + (int) round(($gy - $transform['chOffY']) * $transform['scaleY']);
                $slideGw = (int) round($gw * $transform['scaleX']);
                $slideGh = (int) round($gh * $transform['scaleY']);

                $childTransform = [
                    'offX' => $slideGx,
                    'offY' => $slideGy,
                    'scaleX' => $slideGw / $cw,
                    'scaleY' => $slideGh / $ch,
                    'chOffX' => $cx,
                    'chOffY' => $cy,
                ];

                $this->parseTreeNode(
                    $xpath,
                    $node,
                    $childTransform,
                    $zip,
                    $relationships,
                    $slideSize,
                    $canvasSize,
                    $deckId,
                    $mediaCache,
                    $objects,
                    $textLines,
                    $primaryMediaUrl,
                    $fallbackTop
                );
                continue;
            }

            if ($nodeTag === 'p:sp') {
                $rotAttr = $xpath->query('.//a:xfrm/@rot', $node)->item(0)?->nodeValue;
                $angle = $rotAttr ? round((int) $rotAttr / 60000, 2) : 0;

                $box = $this->transformedBoxForNode($xpath, $node, $transform, $slideSize, $canvasSize, [
                    'left' => 88, 'top' => $fallbackTop, 'width' => 880, 'height' => 80,
                ]);

                $prst = $xpath->query('.//a:prstGeom/@prst', $node)->item(0)?->nodeValue ?? 'rect';
                $isRounded = in_array(strtolower($prst), ['roundrect', 'round1rect', 'round2samerect', 'round2diagrect'], true);

                $shapeFillColor = null;
                $fillClrNode = $xpath->query('.//p:spPr/a:solidFill/a:srgbClr/@val', $node)->item(0);
                if ($fillClrNode && preg_match('/^[0-9A-Fa-f]{6}$/', $fillClrNode->nodeValue)) {
                    $shapeFillColor = '#' . strtoupper($fillClrNode->nodeValue);
                }

                $shapeStrokeColor = null;
                $strokeClrNode = $xpath->query('.//p:spPr/a:ln//a:srgbClr/@val', $node)->item(0);
                if ($strokeClrNode && preg_match('/^[0-9A-Fa-f]{6}$/', $strokeClrNode->nodeValue)) {
                    $shapeStrokeColor = '#' . strtoupper($strokeClrNode->nodeValue);
                }
                $strokeWNode = $xpath->query('.//p:spPr/a:ln/@w', $node)->item(0);
                $shapeStrokeWidth = $strokeWNode ? max(1, (int) round(((int) $strokeWNode->nodeValue) / 12700)) : ($shapeStrokeColor ? 1 : 0);

                // Text parsing
                $paragraphs = [];
                $firstRawSz = null;
                $firstFontColor = null;
                $firstFontWeight = null;
                $firstFontStyle = null;
                $firstAlignment = null;
                $firstFontFamily = null;

                foreach ($xpath->query('.//a:p', $node) as $pNode) {
                    $pParts = [];
                    foreach ($xpath->query('.//a:t', $pNode) as $textNode) {
                        $pParts[] = $textNode->nodeValue;
                    }
                    $pText = trim(implode('', $pParts));
                    if ($pText !== '') {
                        $paragraphs[] = $pText;
                    }

                    if ($firstRawSz === null) {
                        $szAttr = $xpath->query('.//a:rPr/@sz', $pNode)->item(0)
                            ?? $xpath->query('.//a:pPr/a:defRPr/@sz', $pNode)->item(0);
                        if ($szAttr) {
                            $rawSz = (int) $szAttr->nodeValue;
                            if ($rawSz > 0) {
                                $firstRawSz = $rawSz;
                            }
                        }
                    }

                    if ($firstFontColor === null) {
                        $clrAttr = $xpath->query('.//a:rPr//a:srgbClr/@val', $pNode)->item(0)
                            ?? $xpath->query('.//a:pPr//a:srgbClr/@val', $pNode)->item(0);
                        if ($clrAttr && preg_match('/^[0-9A-Fa-f]{6}$/', $clrAttr->nodeValue)) {
                            $firstFontColor = '#' . strtoupper($clrAttr->nodeValue);
                        }
                    }

                    if ($firstFontWeight === null) {
                        $bAttr = $xpath->query('.//a:rPr/@b', $pNode)->item(0);
                        if ($bAttr && in_array(strtolower($bAttr->nodeValue), ['1', 'true', 'b'], true)) {
                            $firstFontWeight = 'bold';
                        }
                    }

                    if ($firstFontStyle === null) {
                        $iAttr = $xpath->query('.//a:rPr/@i', $pNode)->item(0);
                        if ($iAttr && in_array(strtolower($iAttr->nodeValue), ['1', 'true', 'i'], true)) {
                            $firstFontStyle = 'italic';
                        }
                    }

                    if ($firstAlignment === null) {
                        $algnAttr = $xpath->query('.//a:pPr/@algn', $pNode)->item(0);
                        if ($algnAttr) {
                            $firstAlignment = match (strtolower($algnAttr->nodeValue)) {
                                'ctr' => 'center',
                                'r' => 'right',
                                'just' => 'justify',
                                default => 'left',
                            };
                        }
                    }

                    if ($firstFontFamily === null) {
                        $fontAttr = $xpath->query('.//a:rPr/a:latin/@typeface', $pNode)->item(0);
                        if ($fontAttr && filled($fontAttr->nodeValue)) {
                            $firstFontFamily = $fontAttr->nodeValue;
                        }
                    }
                }

                $text = trim(implode("\n", $paragraphs));

                // 1) Check blipFill in sp (e.g. Canva graphics, illustrations)
                $shapeImageUrl = null;
                $blipNode = $xpath->query('.//p:spPr/a:blipFill//a:blip/@r:embed', $node)->item(0);
                if ($blipNode) {
                    $relId = $blipNode->nodeValue;
                    $target = $relId ? ($relationships[$relId] ?? null) : null;
                    $shapeImageUrl = $target ? $this->extractMedia($zip, $target, $deckId, $mediaCache) : null;
                }

                if ($shapeImageUrl !== null) {
                    $primaryMediaUrl ??= $shapeImageUrl;
                    $objects[] = [
                        'kind' => 'image',
                        'src' => $shapeImageUrl,
                        'left' => $box['left'],
                        'top' => $box['top'],
                        'width' => max(16, $box['width']),
                        'height' => max(16, $box['height']),
                        'angle' => $angle,
                    ];
                } elseif ($shapeFillColor !== null || $shapeStrokeColor !== null) {
                    $rx = $isRounded ? min(20, (int) round(min($box['width'], $box['height']) / 4)) : 0;
                    $objects[] = [
                        'kind' => 'shape',
                        'shapeType' => $isRounded ? 'rounded' : ($prst === 'line' ? 'line' : 'rectangle'),
                        'left' => $box['left'],
                        'top' => $box['top'],
                        'width' => max(1, $box['width']),
                        'height' => max(1, $box['height']),
                        'fill' => $shapeFillColor ?? 'transparent',
                        'stroke' => $shapeStrokeColor,
                        'strokeWidth' => $shapeStrokeWidth,
                        'angle' => $angle,
                        'rx' => $rx,
                        'ry' => $rx,
                    ];
                }

                // 2) Emit textbox if text exists
                if ($text !== '') {
                    $textLines[] = $text;
                    $fallbackTop += 92;

                    // Exact OpenXML to Canvas mathematical formula:
                    // 1 unit sz (1/100 pt) = 127 EMU
                    $fontSize = $firstRawSz
                        ? max(11, (int) round(($firstRawSz * 127 * $canvasSize['height']) / $slideSize['cy']))
                        : (count($textLines) === 1 ? 34 : 20);

                    // Add slight width tolerance (+6px) so subtle font metric differences do not force premature wrapping
                    $textWidth = max(40, $box['width'] + 6);

                    $objects[] = [
                        'kind' => 'textbox',
                        'text' => $text,
                        'left' => $box['left'],
                        'top' => $box['top'],
                        'width' => $textWidth,
                        'height' => max(20, $box['height']),
                        'fontSize' => $fontSize,
                        'fill' => $firstFontColor ?? '#111827',
                        'fontFamily' => $firstFontFamily ? "{$firstFontFamily}, Inter, Arial, sans-serif" : 'Inter, Arial, sans-serif',
                        'fontWeight' => $firstFontWeight ?? (count($textLines) === 1 ? 'bold' : 'normal'),
                        'fontStyle' => $firstFontStyle ?? 'normal',
                        'textAlign' => $firstAlignment ?? 'left',
                        'angle' => $angle,
                        'backgroundColor' => '',
                    ];
                }
            } elseif ($nodeTag === 'p:pic') {
                $embedNode = $xpath->query('.//a:blip/@r:embed', $node)->item(0);
                $relationshipId = $embedNode?->nodeValue;
                $target = $relationshipId ? ($relationships[$relationshipId] ?? null) : null;
                $url = $target ? $this->extractMedia($zip, $target, $deckId, $mediaCache) : null;

                if ($url) {
                    $rotAttr = $xpath->query('.//a:xfrm/@rot', $node)->item(0)?->nodeValue;
                    $angle = $rotAttr ? round((int) $rotAttr / 60000, 2) : 0;
                    $box = $this->transformedBoxForNode($xpath, $node, $transform, $slideSize, $canvasSize, [
                        'left' => 160, 'top' => 120, 'width' => 960, 'height' => 480,
                    ]);
                    $primaryMediaUrl ??= $url;

                    $objects[] = [
                        'kind' => 'image',
                        'src' => $url,
                        'left' => $box['left'],
                        'top' => $box['top'],
                        'width' => max(16, $box['width']),
                        'height' => max(16, $box['height']),
                        'angle' => $angle,
                    ];
                }
            } elseif ($nodeTag === 'p:graphicFrame') {
                $tbl = $xpath->query('.//a:tbl', $node)->item(0);
                if ($tbl instanceof DOMElement) {
                    $gfOff = $xpath->query('.//p:xfrm/a:off', $node)->item(0);
                    $rawTableLeft = $gfOff ? (int) $gfOff->getAttribute('x') : 80;
                    $rawTableTop = $gfOff ? (int) $gfOff->getAttribute('y') : 160;

                    $tableSlideX = $transform['offX'] + (int) round(($rawTableLeft - $transform['chOffX']) * $transform['scaleX']);
                    $tableSlideY = $transform['offY'] + (int) round(($rawTableTop - $transform['chOffY']) * $transform['scaleY']);

                    $tableLeft = $this->scale($tableSlideX, $slideSize['cx'], $canvasSize['width']);
                    $tableTop = $this->scale($tableSlideY, $slideSize['cy'], $canvasSize['height']);

                    $colNodes = $xpath->query('.//a:tblGrid/a:gridCol', $tbl);
                    $colWidths = [];
                    foreach ($colNodes as $colNode) {
                        $rawColW = (int) round(((int) $colNode->getAttribute('w')) * $transform['scaleX']);
                        $colWidths[] = $this->scale($rawColW, $slideSize['cx'], $canvasSize['width']);
                    }

                    $trNodes = $xpath->query('.//a:tr', $tbl);
                    $currentY = $tableTop;

                    foreach ($trNodes as $rowIndex => $trNode) {
                        $rawRowH = (int) round(((int) $trNode->getAttribute('h')) * $transform['scaleY']);
                        $rowH = $this->scale($rawRowH, $slideSize['cy'], $canvasSize['height']);
                        $currentX = $tableLeft;
                        $tcNodes = $xpath->query('.//a:tc', $trNode);

                        foreach ($tcNodes as $colIndex => $tcNode) {
                            $colW = $colWidths[$colIndex] ?? 180;
                            $cellFill = null;
                            $fillClrNode = $xpath->query('.//a:tcPr/a:solidFill/a:srgbClr/@val', $tcNode)->item(0);
                            if ($fillClrNode && preg_match('/^[0-9A-Fa-f]{6}$/', $fillClrNode->nodeValue)) {
                                $cellFill = '#' . strtoupper($fillClrNode->nodeValue);
                            }

                            if ($cellFill) {
                                $objects[] = [
                                    'kind' => 'shape',
                                    'shapeType' => 'rectangle',
                                    'left' => $currentX,
                                    'top' => $currentY,
                                    'width' => max(1, $colW),
                                    'height' => max(1, $rowH),
                                    'fill' => $cellFill,
                                    'stroke' => '#CBD5E1',
                                    'strokeWidth' => 1,
                                    'angle' => 0,
                                    'rx' => 0,
                                    'ry' => 0,
                                ];
                            }

                            $cellTexts = [];
                            $cellFontSize = null;
                            $cellFontColor = null;
                            $cellBold = false;

                            foreach ($xpath->query('.//a:p', $tcNode) as $cellP) {
                                $cellLine = '';
                                foreach ($xpath->query('.//a:t', $cellP) as $cellT) {
                                    $cellLine .= $cellT->nodeValue;
                                }
                                $cellLine = trim($cellLine);
                                if ($cellLine !== '') {
                                    $cellTexts[] = $cellLine;
                                }

                                if ($cellFontSize === null) {
                                    $rawSz = $xpath->query('.//a:rPr/@sz', $cellP)->item(0)?->nodeValue;
                                    if ($rawSz) {
                                        $cellFontSize = max(10, (int) round(((int) $rawSz * 127 * $canvasSize['height']) / $slideSize['cy']));
                                    }
                                }

                                if ($cellFontColor === null) {
                                    $rawClr = $xpath->query('.//a:rPr//a:srgbClr/@val', $cellP)->item(0)?->nodeValue;
                                    if ($rawClr && preg_match('/^[0-9A-Fa-f]{6}$/', $rawClr)) {
                                        $cellFontColor = '#' . strtoupper($rawClr);
                                    }
                                }

                                if (! $cellBold) {
                                    $bVal = $xpath->query('.//a:rPr/@b', $cellP)->item(0)?->nodeValue;
                                    if ($bVal && in_array(strtolower($bVal), ['1', 'true', 'b'], true)) {
                                        $cellBold = true;
                                    }
                                }
                            }

                            $cellContent = implode("\n", $cellTexts);
                            if ($cellContent !== '') {
                                $textLines[] = $cellContent;
                                $objects[] = [
                                    'kind' => 'textbox',
                                    'text' => $cellContent,
                                    'left' => $currentX + 6,
                                    'top' => $currentY + 4,
                                    'width' => max(20, $colW - 12),
                                    'height' => max(16, $rowH - 8),
                                    'fontSize' => $cellFontSize ?: 14,
                                    'fill' => $cellFontColor ?? ($rowIndex === 0 ? '#F7F4EE' : '#14213D'),
                                    'fontWeight' => $cellBold ? 'bold' : 'normal',
                                    'angle' => 0,
                                    'backgroundColor' => '',
                                ];
                            }

                            $currentX += $colW;
                        }
                        $currentY += $rowH;
                    }
                }
            }
        }
    }

    private function transformedBoxForNode(
        DOMXPath $xpath,
        DOMElement $node,
        array $transform,
        array $slideSize,
        array $canvasSize,
        array $fallback
    ): array {
        $off = $xpath->query('p:spPr/a:xfrm/a:off | p:nvSpPr/p:cNvPr/a:off', $node)->item(0)
            ?? $xpath->query('.//a:xfrm/a:off', $node)->item(0);
        $ext = $xpath->query('p:spPr/a:xfrm/a:ext | p:nvSpPr/p:cNvPr/a:ext', $node)->item(0)
            ?? $xpath->query('.//a:xfrm/a:ext', $node)->item(0);

        if (! $off instanceof DOMElement || ! $ext instanceof DOMElement) {
            return $fallback;
        }

        $rawX = (int) $off->getAttribute('x');
        $rawY = (int) $off->getAttribute('y');
        $rawW = (int) $ext->getAttribute('cx');
        $rawH = (int) $ext->getAttribute('cy');

        $slideX = $transform['offX'] + (int) round(($rawX - $transform['chOffX']) * $transform['scaleX']);
        $slideY = $transform['offY'] + (int) round(($rawY - $transform['chOffY']) * $transform['scaleY']);
        $slideW = (int) round($rawW * $transform['scaleX']);
        $slideH = (int) round($rawH * $transform['scaleY']);

        return [
            'left' => $this->scale($slideX, $slideSize['cx'], $canvasSize['width']),
            'top' => $this->scale($slideY, $slideSize['cy'], $canvasSize['height']),
            'width' => $this->scale($slideW, $slideSize['cx'], $canvasSize['width']),
            'height' => $this->scale($slideH, $slideSize['cy'], $canvasSize['height']),
        ];
    }

    private function scale(int $value, int $source, int $target): int
    {
        return (int) round(($value / max(1, $source)) * $target);
    }

    private function extractMedia(ZipArchive $zip, string $target, int $deckId, array &$mediaCache): ?string
    {
        if (isset($mediaCache[$target])) {
            return $mediaCache[$target];
        }

        if (! str_starts_with($target, 'ppt/media/')) {
            return null;
        }

        $extension = strtolower(pathinfo($target, PATHINFO_EXTENSION));
        if (! in_array($extension, ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'], true)) {
            return null;
        }

        $stat = $zip->statName($target);
        if (! $stat || (int) ($stat['size'] ?? 0) > self::MAX_MEDIA_BYTES) {
            return null;
        }

        $contents = $zip->getFromName($target);
        if ($contents === false) {
            return null;
        }

        $path = $this->storage->storePublicContent($contents, "presentations/assets/{$deckId}/extracted", $extension);
        $mediaCache[$target] = $this->storage->publicUrl($path);

        return $mediaCache[$target];
    }

    private function normalizePackagePath(string $path): string
    {
        $parts = [];
        foreach (explode('/', str_replace('\\', '/', $path)) as $part) {
            if ($part === '' || $part === '.') {
                continue;
            }

            if ($part === '..') {
                array_pop($parts);
                continue;
            }

            $parts[] = $part;
        }

        return implode('/', $parts);
    }

    private function dom(string $xml): ?DOMDocument
    {
        $previous = libxml_use_internal_errors(true);
        $document = new DOMDocument();
        $loaded = $document->loadXML($xml, LIBXML_NONET | LIBXML_NOERROR | LIBXML_NOWARNING);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        return $loaded ? $document : null;
    }

    private function emptyCanvas(array $canvasSize): array
    {
        return [
            'version' => 1,
            'width' => $canvasSize['width'],
            'height' => $canvasSize['height'],
            'objects' => [],
        ];
    }
}
