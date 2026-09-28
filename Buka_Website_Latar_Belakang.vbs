' ============================================================
' ARZ-WEB: Peluncur Web Tanpa Jendela Konsol (Silent Launcher)
' ============================================================
Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")

' Dapatkan path folder saat ini
scriptDir = FSO.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = scriptDir

' Jalankan serve.js secara background (windowStyle = 0)
WshShell.Run "cmd.exe /c node serve.js", 0, False

' Buka browser ke Grimoire Dashboard
WScript.Sleep 500
WshShell.Run "http://127.0.0.1:8080/", 1, False
