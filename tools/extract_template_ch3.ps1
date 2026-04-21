Add-Type -AssemblyName System.IO.Compression.FileSystem

$docxCandidates = @(
    "C:\Users\micha\Downloads\114 SA範本.docx",
    "C:\Users\micha\Downloads\114 SA範本 (1).docx"
)

$zip = $null
foreach ($candidate in $docxCandidates) {
    if (-not (Test-Path -LiteralPath $candidate)) {
        continue
    }
    try {
        $zip = [System.IO.Compression.ZipFile]::OpenRead($candidate)
        break
    }
    catch {
        continue
    }
}

if (-not $zip) {
    Write-Output "NOT_FOUND_OR_LOCKED:DOCX"
    exit 0
}
$entry = $zip.Entries | Where-Object { $_.FullName -eq 'word/document.xml' }
if (-not $entry) {
    $zip.Dispose()
    Write-Output "NOT_FOUND:document.xml"
    exit 0
}

$sr = New-Object System.IO.StreamReader($entry.Open())
$xmlText = $sr.ReadToEnd()
$sr.Close()
$zip.Dispose()

[xml]$xml = $xmlText
$ns = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
$ns.AddNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main')

$paras = $xml.SelectNodes('//w:body/w:p', $ns)
$lines = foreach ($p in $paras) {
    ($p.SelectNodes('.//w:t', $ns) | ForEach-Object { $_.'#text' }) -join ''
}

$start = ($lines | Select-String -SimpleMatch '第三章' | Select-Object -First 1).LineNumber
$end = ($lines | Select-String -SimpleMatch '第四章' | Select-Object -First 1).LineNumber

if (-not $start) {
    Write-Output "NOT_FOUND:第三章"
    exit 0
}

if (-not $end) {
    $end = $lines.Count + 1
}

$lines[($start - 1)..($end - 2)]