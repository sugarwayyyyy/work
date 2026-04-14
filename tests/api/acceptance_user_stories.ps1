Param(
    [string]$BaseUrl = 'http://localhost:8000/%E7%A4%BE%E5%9C%98%E6%B4%BB%E5%8B%95%E8%B3%87%E8%A8%8A%E7%B5%B1%E6%95%B4%E5%B9%B3%E5%8F%B0/backend/api'
)

$ErrorActionPreference = 'Stop'

function Assert-True {
    param(
        [bool]$Condition,
        [string]$Message
    )

    if (-not $Condition) {
        throw "ASSERT FAILED: $Message"
    }

    Write-Host "PASS: $Message" -ForegroundColor Green
}

function Invoke-Api {
    param(
        [Microsoft.PowerShell.Commands.WebRequestSession]$Session,
        [string]$Method,
        [string]$Url,
        [object]$Body = $null
    )

    $params = @{
        Method = $Method
        Uri = $Url
        WebSession = $Session
        ContentType = 'application/json'
    }

    if ($null -ne $Body) {
        $params.Body = ($Body | ConvertTo-Json -Depth 10)
    }

    return Invoke-RestMethod @params
}

function Login {
    param(
        [string]$Email,
        [SecureString]$PasswordSecure
    )

    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($PasswordSecure)
    try {
        $PlainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    } finally {
        if ($bstr -ne [IntPtr]::Zero) {
            [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
        }
    }

    $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    try {
        $result = Invoke-Api -Session $session -Method 'POST' -Url "$BaseUrl/auth.php?action=login" -Body @{
            email = $Email
            password = $PlainPassword
        }
    } catch {
        throw "Login request failed for $Email. BaseUrl=$BaseUrl. Error=$($_.Exception.Message)"
    }

    Assert-True ($result.success -eq $true) "Login success: $Email"
    return $session
}

Write-Host '=== Acceptance Test Start ===' -ForegroundColor Cyan

$adminCred = New-Object System.Management.Automation.PSCredential('admin@univ.edu', (ConvertTo-SecureString 'Test123456' -AsPlainText -Force))
$clubAdminCred = New-Object System.Management.Automation.PSCredential('clubadmin@univ.edu', (ConvertTo-SecureString 'Test123456' -AsPlainText -Force))
$studentCred = New-Object System.Management.Automation.PSCredential('student@univ.edu', (ConvertTo-SecureString 'Test123456' -AsPlainText -Force))

$adminSession = Login -Email $adminCred.UserName -Password $adminCred.Password
$clubAdminSession = Login -Email $clubAdminCred.UserName -Password $clubAdminCred.Password
$studentSession = Login -Email $studentCred.UserName -Password $studentCred.Password

# US 4.1 create club base + soft delete + pinned announcement
$newCode = "QA" + (Get-Random -Minimum 1000 -Maximum 9999)
$createClub = Invoke-Api -Session $adminSession -Method 'POST' -Url "$BaseUrl/admin.php?action=create_club" -Body @{
    club_code = $newCode
    club_name = "Test Club $newCode"
    category_id = 2
}
Assert-True ($createClub.success -eq $true) 'Admin can create club base list item'
$clubId = $createClub.data.club_id

$softDelete = Invoke-Api -Session $adminSession -Method 'POST' -Url "$BaseUrl/admin.php?action=soft_delete_club" -Body @{
    club_id = $clubId
    hide = $true
}
Assert-True ($softDelete.success -eq $true) 'Admin can soft delete club'

$announcement = Invoke-Api -Session $adminSession -Method 'POST' -Url "$BaseUrl/admin.php?action=create_announcement" -Body @{
    title = 'Pinned announcement from acceptance test'
    content = 'This announcement is created by automated test'
    type = 'important'
    is_sticky = 1
}
Assert-True ($announcement.success -eq $true) 'Admin can create pinned announcement'

# US 2.1 permissions and required fields
$clubList = Invoke-Api -Session $clubAdminSession -Method 'GET' -Url "$BaseUrl/club-admin.php?action=my_clubs"
Assert-True ($clubList.success -eq $true -and $clubList.data.clubs.Count -gt 0) 'Club admin can get own clubs'
$ownClubId = $clubList.data.clubs[0].club_id

$invalidUpdate = $null
try {
    $invalidUpdate = Invoke-Api -Session $clubAdminSession -Method 'PUT' -Url "$BaseUrl/clubs.php?action=update&id=$ownClubId" -Body @{
        club_name = 'Invalid update'
        description = ''
        meeting_time = ''
        meeting_location = ''
        contact_email = ''
    }
} catch {
    if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
        $invalidUpdate = $_.ErrorDetails.Message | ConvertFrom-Json
    } else {
        $invalidUpdate = @{ success = $false; message = $_.Exception.Message }
    }
}
Assert-True ($invalidUpdate.success -eq $false) 'Required fields block empty submit'

$validUpdate = Invoke-Api -Session $clubAdminSession -Method 'PUT' -Url "$BaseUrl/clubs.php?action=update&id=$ownClubId" -Body @{
    club_name = 'Valid update name'
    description = 'Updated description'
    meeting_time = 'Wed 19:00-21:00'
    meeting_location = 'Building R201'
    contact_email = 'clubadmin@univ.edu'
}
Assert-True ($validUpdate.success -eq $true) 'Club admin can update own club'

# US 2.2 publish event
$newEvent = Invoke-Api -Session $clubAdminSession -Method 'POST' -Url "$BaseUrl/events.php?action=create" -Body @{
    club_id = $ownClubId
    event_name = "Acceptance Event $(Get-Random -Minimum 100 -Maximum 999)"
    description = 'Event content'
    event_date = (Get-Date).AddDays(10).ToString('yyyy-MM-dd HH:mm:ss')
    location = 'Test location'
}
Assert-True ($newEvent.success -eq $true) 'Club admin can create event'

$publishedEvents = Invoke-Api -Session $studentSession -Method 'GET' -Url "$BaseUrl/events.php?status=published&page=1"
Assert-True ($publishedEvents.success -eq $true) 'Frontend published events API works'

# US 1.1 category + tags filter
$clubsOrFilter = Invoke-Api -Session $studentSession -Method 'GET' -Url "$BaseUrl/clubs.php?category_id=2&tags=1,3&page=1"
Assert-True ($clubsOrFilter.success -eq $true) 'Category and tags combined filter works'

# US 1.3 follow and feed
$clubDetail = Invoke-Api -Session $studentSession -Method 'GET' -Url "$BaseUrl/clubs.php?action=detail&id=$ownClubId"
Assert-True ($clubDetail.success -eq $true) 'Student can open club detail'

$toggleFollow = Invoke-Api -Session $studentSession -Method 'POST' -Url "$BaseUrl/clubs.php?action=toggle_follow&id=$ownClubId" -Body @{}
Assert-True ($toggleFollow.success -eq $true) 'Student can toggle follow'

$feed = Invoke-Api -Session $studentSession -Method 'GET' -Url "$BaseUrl/notifications.php?action=feed"
Assert-True ($feed.success -eq $true) 'Student can load personal feed'

# US 1.5 last_updated
$clubAfterUpdate = Invoke-Api -Session $studentSession -Method 'GET' -Url "$BaseUrl/clubs.php?action=detail&id=$ownClubId"
Assert-True ($clubAfterUpdate.success -eq $true -and [string]::IsNullOrWhiteSpace($clubAfterUpdate.data.last_updated) -eq $false) 'Club detail returns last_updated'

Write-Host '=== Acceptance Test Completed ===' -ForegroundColor Cyan
