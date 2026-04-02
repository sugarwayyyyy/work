Param(
    [string]$FrontendRoot = './frontend',
    [string]$BaseUrl = 'http://localhost:8000/%E7%A4%BE%E5%9C%98%E6%B4%BB%E5%8B%95%E8%B3%87%E8%A8%8A%E7%B5%B1%E6%95%B4%E5%B9%B3%E5%8F%B0/frontend'
)

$ErrorActionPreference = 'Stop'

function Resolve-LinkUrl {
    param(
        [string]$FromFile,
        [string]$RawLink
    )

    if ($RawLink.StartsWith('/')) {
        return "http://localhost:8000$RawLink"
    }

    $fromDir = Split-Path $FromFile -Parent
    $fromRelDir = $fromDir.Replace($FrontendRoot, '').TrimStart('/').TrimStart('\\').Replace('\\', '/')

    if ([string]::IsNullOrWhiteSpace($fromRelDir)) {
        $fromRelDir = '.'
    }

    $base = New-Object System.Uri(($BaseUrl.TrimEnd('/') + '/' + $fromRelDir.TrimStart('./') + '/'))
    $uri = New-Object System.Uri($base, $RawLink)
    return $uri.AbsoluteUri
}

$FrontendRoot = (Resolve-Path $FrontendRoot).Path
$htmlFiles = Get-ChildItem -Path $FrontendRoot -Recurse -Filter '*.html'
$allLinks = @()

foreach ($file in $htmlFiles) {
    $content = Get-Content -Path $file.FullName -Raw
    foreach ($attributeName in @('href="', 'src="')) {
        $startIndex = 0
        while ($true) {
            $attributeIndex = $content.IndexOf($attributeName, $startIndex, [System.StringComparison]::OrdinalIgnoreCase)
            if ($attributeIndex -lt 0) {
                break
            }

            $valueStart = $attributeIndex + $attributeName.Length
            $valueEnd = $content.IndexOf('"', $valueStart)
            if ($valueEnd -lt 0) {
                break
            }

            $link = $content.Substring($valueStart, $valueEnd - $valueStart).Trim()
            $startIndex = $valueEnd + 1

            if (-not $link) {
                continue
            }
            # Ignore dynamic template placeholders rendered at runtime.
            if ($link.Contains('${')) {
                continue
            }
            if ($link.StartsWith('#') -or $link.StartsWith('javascript:') -or $link.StartsWith('mailto:') -or $link.StartsWith('http')) {
                continue
            }

            $allLinks += [pscustomobject]@{
                from = $file.FullName.Replace($FrontendRoot, '').TrimStart('/').TrimStart('\\').Replace('\\', '/')
                link = $link
                url  = Resolve-LinkUrl -FromFile $file.FullName -RawLink $link
            }
        }
    }
}

$uniqueLinks = $allLinks | Sort-Object from,link,url -Unique
$results = @()

foreach ($item in $uniqueLinks) {
    $status = -1
    try {
        $res = Invoke-WebRequest -UseBasicParsing -Uri $item.url -Method GET -TimeoutSec 8
        $status = [int]$res.StatusCode
    }
    catch {
        if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
            $status = [int]$_.Exception.Response.StatusCode.value__
        }
    }

    $results += [pscustomobject]@{
        from = $item.from
        link = $item.link
        status = $status
        url = $item.url
    }
}

$bad = $results | Where-Object { $_.status -ge 400 -or $_.status -eq -1 }

Write-Output ("TOTAL=" + $results.Count)
Write-Output ("BAD=" + $bad.Count)

if ($bad.Count -gt 0) {
    $bad | Sort-Object status,from | Format-Table -AutoSize
    exit 1
}

exit 0
