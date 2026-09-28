param(
    [string]$WatchDir = "C:\Users\Raden\OneDrive\Documents\Semester 3\Workshop Bahasa Pemrograman Lanjut",
    [string]$MdPath = "C:\Users\Raden\OneDrive\Documents\New folder (2)\format-laporan-wpl.md"
)

Write-Host "[WPL WATCHER] Memulai pemantauan perubahan file Word di: $WatchDir" -ForegroundColor Cyan

$fsw = New-Object System.IO.FileSystemWatcher
$fsw.Path = $WatchDir
$fsw.Filter = "*.docx"
$fsw.IncludeSubdirectories = $true
$fsw.EnableRaisingEvents = $true

$action = {
    param($source, $eventArgs)
    $name = $eventArgs.Name
    $changeType = $eventArgs.ChangeType
    $fullPath = $eventArgs.FullPath

    # Abaikan file temporary Word (~$*)
    if ($name -like "~$*") { return }

    Write-Host "[WPL WATCHER] Terdeteksi perubahan pada: $name ($changeType) pada $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Green
    
    # Tunggu sebentar sampai Word melepaskan file lock
    Start-Sleep -Seconds 3

    try {
        # Baca metadata docx via python analyzer
        $pyCmd = @"
import zipfile, xml.etree.ElementTree as ET, datetime

try:
    with zipfile.ZipFile(r'$fullPath') as z:
        tree = ET.fromstring(z.read('word/document.xml'))
        ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
        tables = len(tree.findall('.//w:tbl', ns))
        paras = len(tree.findall('.//w:p', ns))
        headings = [ ''.join(p.itertext()).strip() for p in tree.findall('.//w:p', ns) if 'Heading1' in (p.find('.//w:pStyle', ns).attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val', '') if p.find('.//w:pStyle', ns) is not None else '') ]
        
        now = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        log_entry = f'| **{now}** | Perbaikan Pengguna ({name}) | Terdeteksi simpanan berkas: {paras} paragraf, {tables} tabel, {len(headings)} heading. |\n'
        
        # Append ke file md
        with open(r'$MdPath', 'r', encoding='utf-8') as f:
            content = f.read()
            
        if '| Tanggal & Waktu | Sumber Perubahan | Rincian Modifikasi |' in content:
            updated = content.rstrip() + '\n' + log_entry
            with open(r'$MdPath', 'w', encoding='utf-8') as f:
                f.write(updated)
            print('SUCCESS: Sinkronisasi file .md selesai.')
except Exception as e:
    print('Error analyzing docx:', e)
"@
        python -c $pyCmd
    } catch {
        Write-Host "Error saat sinkronisasi: $_" -ForegroundColor Yellow
    }
}

Register-ObjectEvent -InputObject $fsw -EventName "Changed" -Action $action | Out-Null

Write-Host "[WPL WATCHER] Watcher aktif. Tekan Ctrl+C untuk berhenti." -ForegroundColor DarkCyan
while ($true) { Start-Sleep -Seconds 2 }