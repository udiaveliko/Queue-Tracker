Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$outputDirectory = Join-Path $root 'public\icons'
[System.IO.Directory]::CreateDirectory($outputDirectory) | Out-Null

function New-QueueTrackerIcon {
  param(
    [Parameter(Mandatory = $true)]
    [int]$Size,
    [Parameter(Mandatory = $true)]
    [string]$FileName
  )

  $bitmap = [System.Drawing.Bitmap]::new($Size, $Size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

  $bounds = [System.Drawing.Rectangle]::new(0, 0, $Size, $Size)
  $background = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
    $bounds,
    [System.Drawing.Color]::FromArgb(255, 8, 10, 14),
    [System.Drawing.Color]::FromArgb(255, 17, 25, 36),
    55
  )
  $graphics.FillRectangle($background, $bounds)

  $scale = $Size / 512.0
  $glowBrush = [System.Drawing.SolidBrush]::new(
    [System.Drawing.Color]::FromArgb(22, 100, 210, 255)
  )
  $graphics.FillEllipse($glowBrush, 58 * $scale, 50 * $scale, 396 * $scale, 396 * $scale)

  $ringPen = [System.Drawing.Pen]::new(
    [System.Drawing.Color]::FromArgb(32, 255, 255, 255),
    2.5 * $scale
  )
  $graphics.DrawEllipse($ringPen, 78 * $scale, 78 * $scale, 356 * $scale, 356 * $scale)

  $trackPen = [System.Drawing.Pen]::new(
    [System.Drawing.Color]::FromArgb(255, 100, 210, 255),
    24 * $scale
  )
  $trackPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $trackPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $path.AddBezier(
    92 * $scale, 318 * $scale,
    164 * $scale, 305 * $scale,
    166 * $scale, 176 * $scale,
    250 * $scale, 176 * $scale
  )
  $path.AddBezier(
    250 * $scale, 176 * $scale,
    326 * $scale, 176 * $scale,
    322 * $scale, 282 * $scale,
    420 * $scale, 262 * $scale
  )
  $graphics.DrawPath($trackPen, $path)

  $supportPen = [System.Drawing.Pen]::new(
    [System.Drawing.Color]::FromArgb(145, 209, 239, 255),
    9 * $scale
  )
  $supportPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $supportPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

  $supports = @(
    @(126, 299, 126, 366),
    @(194, 205, 194, 366),
    @(268, 180, 268, 366),
    @(342, 242, 342, 366),
    @(404, 263, 404, 366)
  )

  foreach ($support in $supports) {
    $graphics.DrawLine(
      $supportPen,
      $support[0] * $scale,
      $support[1] * $scale,
      $support[2] * $scale,
      $support[3] * $scale
    )
  }

  $basePen = [System.Drawing.Pen]::new(
    [System.Drawing.Color]::FromArgb(215, 243, 248, 255),
    12 * $scale
  )
  $basePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $basePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $graphics.DrawLine($basePen, 92 * $scale, 366 * $scale, 420 * $scale, 366 * $scale)

  $destination = Join-Path $outputDirectory $FileName
  $bitmap.Save($destination, [System.Drawing.Imaging.ImageFormat]::Png)

  $basePen.Dispose()
  $supportPen.Dispose()
  $path.Dispose()
  $trackPen.Dispose()
  $ringPen.Dispose()
  $glowBrush.Dispose()
  $background.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

New-QueueTrackerIcon -Size 192 -FileName 'icon-192.png'
New-QueueTrackerIcon -Size 512 -FileName 'icon-512.png'
New-QueueTrackerIcon -Size 180 -FileName 'apple-touch-icon.png'
