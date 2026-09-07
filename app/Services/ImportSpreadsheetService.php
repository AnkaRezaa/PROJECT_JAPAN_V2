<?php

namespace App\Services;

use ZipArchive;

class ImportSpreadsheetService
{
    private const MAX_ARCHIVE_ENTRIES = 200;

    private const MAX_UNCOMPRESSED_BYTES = 20 * 1024 * 1024;

    private const MAX_XML_BYTES = 10 * 1024 * 1024;

    private const MAX_ROWS = 10000;

    private const MAX_COLUMNS = 100;

    private const MAX_CELL_LENGTH = 10000;

    public function rows(string $path, string $extension): array
    {
        return strtolower($extension) === 'xlsx'
            ? $this->parseXlsxRows($path)
            : $this->parseCsvRows($path);
    }

    public function parseCsvRows(string $path): array
    {
        $handle = fopen($path, 'r');

        if (! $handle) {
            return [];
        }

        $header = fgetcsv($handle);

        if (! $header) {
            fclose($handle);

            return [];
        }

        $headers = $this->normalizeHeaders($header);
        $rows = [];

        $rowCount = 0;

        while (($row = fgetcsv($handle)) !== false) {
            if (++$rowCount > self::MAX_ROWS + 1 || count($row) > self::MAX_COLUMNS) {
                fclose($handle);

                return [];
            }

            if (collect($row)->contains(fn ($value) => mb_strlen((string) $value) > self::MAX_CELL_LENGTH)) {
                fclose($handle);

                return [];
            }

            if (count(array_filter($row, fn ($value) => trim((string) $value) !== '')) === 0) {
                continue;
            }

            $rows[] = array_combine($headers, array_slice(array_pad($row, count($headers), null), 0, count($headers)));
        }

        fclose($handle);

        return $rows;
    }

    public function parseXlsxRows(string $path): array
    {
        $sheets = $this->xlsxSheets($path);

        return $sheets === [] ? [] : array_values($sheets)[0];
    }

    public function xlsxSheets(string $path): array
    {
        if (! class_exists(ZipArchive::class)) {
            return [];
        }

        $zip = new ZipArchive;

        if ($zip->open($path) !== true) {
            return [];
        }

        if (! $this->isSafeArchive($zip)) {
            $zip->close();

            return [];
        }

        $sharedStrings = $this->readSharedStrings($zip);
        $workbookXml = $zip->getFromName('xl/workbook.xml');
        $relsXml = $zip->getFromName('xl/_rels/workbook.xml.rels');
        if (! $workbookXml || ! $relsXml) {
            $zip->close();

            return [];
        }

        $workbook = $this->loadXml($workbookXml);
        $rels = $this->loadXml($relsXml);
        if ($workbook === false || $rels === false) {
            $zip->close();

            return [];
        }

        $targets = [];
        foreach ($rels->Relationship as $relationship) {
            $targets[(string) $relationship['Id']] = (string) $relationship['Target'];
        }

        $result = [];
        foreach ($workbook->sheets->sheet as $sheetNode) {
            $relationAttributes = $sheetNode->attributes('http://schemas.openxmlformats.org/officeDocument/2006/relationships');
            $relationId = (string) ($relationAttributes['id'] ?? '');
            $target = $targets[$relationId] ?? '';
            if ($target === '') {
                continue;
            }

            $entry = str_starts_with($target, '/')
                ? ltrim($target, '/')
                : 'xl/'.ltrim(str_replace('../', '', $target), '/');
            $sheetXml = $zip->getFromName($entry);
            if (! $sheetXml || strlen($sheetXml) > self::MAX_XML_BYTES) {
                $zip->close();

                return [];
            }

            $result[strtolower(trim((string) $sheetNode['name']))] = $this->worksheetRows($sheetXml, $sharedStrings);
        }

        $zip->close();

        return $result;
    }

    private function worksheetRows(string $sheetXml, array $sharedStrings): array
    {
        $sheet = $this->loadXml($sheetXml);

        if ($sheet === false || ! isset($sheet->sheetData->row)) {
            return [];
        }

        $rawRows = [];

        foreach ($sheet->sheetData->row as $row) {
            if (count($rawRows) >= self::MAX_ROWS + 1) {
                return [];
            }

            $values = [];

            foreach ($row->c as $cell) {
                $cellRef = (string) $cell['r'];
                $column = preg_replace('/\d+/', '', $cellRef);
                $index = $this->columnIndex($column);
                $type = (string) $cell['t'];
                $value = (string) ($cell->v ?? '');

                if ($type === 's') {
                    $value = $sharedStrings[(int) $value] ?? '';
                } elseif ($type === 'inlineStr') {
                    $value = (string) ($cell->is->t ?? '');
                }

                if ($index >= self::MAX_COLUMNS || mb_strlen($value) > self::MAX_CELL_LENGTH) {
                    return [];
                }

                $values[$index] = $value;
            }

            ksort($values);
            $maxIndex = empty($values) ? -1 : max(array_keys($values));
            $rawRows[] = $maxIndex >= 0
                ? array_map(fn ($index) => $values[$index] ?? '', range(0, $maxIndex))
                : [];
        }

        $header = array_shift($rawRows);

        if (! $header) {
            return [];
        }

        $headers = $this->normalizeHeaders($header);
        $rows = [];

        foreach ($rawRows as $row) {
            if (count(array_filter($row, fn ($value) => trim((string) $value) !== '')) === 0) {
                continue;
            }

            $rows[] = array_combine($headers, array_slice(array_pad($row, count($headers), null), 0, count($headers)));
        }

        return $rows;
    }

    public function normalizeHeaders(array $header): array
    {
        return array_map(function ($value) {
            $normalized = str($value)->lower()->replace(' ', '_')->toString();

            return ltrim($normalized, "\xEF\xBB\xBF");
        }, $header);
    }

    private function readSharedStrings(ZipArchive $zip): array
    {
        $xml = $zip->getFromName('xl/sharedStrings.xml');

        if (! $xml || strlen($xml) > self::MAX_XML_BYTES) {
            return [];
        }

        $shared = $this->loadXml($xml);

        if ($shared === false || ! isset($shared->si)) {
            return [];
        }

        $strings = [];

        foreach ($shared->si as $item) {
            if (count($strings) >= self::MAX_ROWS * self::MAX_COLUMNS) {
                return [];
            }

            if (isset($item->t)) {
                $value = (string) $item->t;
                if (mb_strlen($value) > self::MAX_CELL_LENGTH) {
                    return [];
                }
                $strings[] = $value;

                continue;
            }

            $parts = [];
            foreach ($item->r as $run) {
                $parts[] = (string) $run->t;
            }
            $value = implode('', $parts);
            if (mb_strlen($value) > self::MAX_CELL_LENGTH) {
                return [];
            }
            $strings[] = $value;
        }

        return $strings;
    }

    private function columnIndex(string $column): int
    {
        $index = 0;
        foreach (str_split($column) as $char) {
            $index = ($index * 26) + (ord(strtoupper($char)) - 64);
        }

        return max(0, $index - 1);
    }

    private function isSafeArchive(ZipArchive $zip): bool
    {
        if ($zip->numFiles < 1 || $zip->numFiles > self::MAX_ARCHIVE_ENTRIES) {
            return false;
        }

        $totalSize = 0;

        for ($index = 0; $index < $zip->numFiles; $index++) {
            $stat = $zip->statIndex($index);
            $name = (string) ($stat['name'] ?? '');
            $size = (int) ($stat['size'] ?? 0);

            if ($name === '' || str_contains($name, '../') || str_starts_with($name, '/') || str_contains($name, '\\')) {
                return false;
            }

            $totalSize += $size;
            if ($size > self::MAX_XML_BYTES || $totalSize > self::MAX_UNCOMPRESSED_BYTES) {
                return false;
            }
        }

        return true;
    }

    private function loadXml(string $xml): \SimpleXMLElement|false
    {
        $previous = libxml_use_internal_errors(true);

        try {
            return simplexml_load_string($xml, \SimpleXMLElement::class, LIBXML_NONET | LIBXML_COMPACT);
        } finally {
            libxml_clear_errors();
            libxml_use_internal_errors($previous);
        }
    }
}
