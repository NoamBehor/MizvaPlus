Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$outDir = Join-Path $root "store\play"
$shotDir = Join-Path $outDir "screenshots"
New-Item -ItemType Directory -Force -Path $shotDir | Out-Null

function New-Bitmap([int]$Width, [int]$Height) {
  $bitmap = New-Object System.Drawing.Bitmap $Width, $Height
  $bitmap.SetResolution(96, 96)
  return $bitmap
}

function Save-Png($Bitmap, $Path) {
  $Bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $Bitmap.Dispose()
}

$iconSource = Join-Path $root "assets\icon.png"
$icon = [System.Drawing.Image]::FromFile($iconSource)
$iconBitmap = New-Bitmap 512 512
$iconGraphics = [System.Drawing.Graphics]::FromImage($iconBitmap)
$iconGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$iconGraphics.Clear([System.Drawing.Color]::FromArgb(255, 250, 248, 245))
$iconGraphics.DrawImage($icon, 0, 0, 512, 512)
$iconGraphics.Dispose()
$icon.Dispose()
Save-Png $iconBitmap (Join-Path $outDir "icon-512.png")

$feature = New-Bitmap 1024 500
$featureGraphics = [System.Drawing.Graphics]::FromImage($feature)
$featureGraphics.Clear([System.Drawing.Color]::FromArgb(255, 250, 248, 245))
$featureGraphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$titleFont = New-Object System.Drawing.Font "Segoe UI", 54, ([System.Drawing.FontStyle]::Bold)
$subtitleFont = New-Object System.Drawing.Font "Segoe UI", 22
$brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 31, 41, 55))
$accent = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 180, 83, 9))
$featureGraphics.FillRectangle($accent, 0, 0, 18, 500)
$format = New-Object System.Drawing.StringFormat
$format.Alignment = [System.Drawing.StringAlignment]::Center
$format.LineAlignment = [System.Drawing.StringAlignment]::Center
$featureGraphics.DrawString("מצוות פלוס", $titleFont, $brush, (New-Object System.Drawing.RectangleF 40, 140, 944, 120), $format)
$featureGraphics.DrawString("מצוות, זמנים ובתי כנסת", $subtitleFont, $brush, (New-Object System.Drawing.RectangleF 40, 270, 944, 60), $format)
$featureGraphics.Dispose()
Save-Png $feature (Join-Path $outDir "feature-graphic-1024x500.png")

$screens = @(
  @{ File = "01-home.png"; Title = "היום"; Body = "מצוות יומיות, לימוד קצר ופרשת השבוע" },
  @{ File = "02-map.png"; Title = "בתי כנסת"; Body = "מפה ומניין בקרבת מקום" },
  @{ File = "03-prayer.png"; Title = "תפילה"; Body = "קריאת התפילה והמצווה" },
  @{ File = "04-profile.png"; Title = "פרופיל"; Body = "חשבון, הישגים ומחיקת חשבון" }
)

$bodyFont = New-Object System.Drawing.Font "Segoe UI", 28
foreach ($screen in $screens) {
  $shot = New-Bitmap 1080 1920
  $graphics = [System.Drawing.Graphics]::FromImage($shot)
  $graphics.Clear([System.Drawing.Color]::FromArgb(255, 250, 248, 245))
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $graphics.FillRectangle($accent, 0, 0, 1080, 280)
  $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
  $graphics.DrawString($screen.Title, $titleFont, $white, (New-Object System.Drawing.RectangleF 60, 80, 960, 120), $format)
  $graphics.DrawString($screen.Body, $bodyFont, $brush, (New-Object System.Drawing.RectangleF 80, 420, 920, 200), $format)
  $graphics.Dispose()
  $white.Dispose()
  Save-Png $shot (Join-Path $shotDir $screen.File)
}

$titleFont.Dispose()
$subtitleFont.Dispose()
$bodyFont.Dispose()
$brush.Dispose()
$accent.Dispose()
Write-Output "PASS generate-play-assets"
