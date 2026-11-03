Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

appDir = "D:\AntiyGravity\projects\nexushub"
backendDir = appDir & "\python-backend"
pythonExe = backendDir & "\venv\Scripts\python.exe"
serverPy = backendDir & "\server.py"
userProfileDir = "C:\Users\momos\.doqs\browser_profile"

WshShell.CurrentDirectory = backendDir

Function IsServerReady()
    On Error Resume Next
    Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    http.setTimeouts 300, 300, 300, 300
    http.Open "GET", "http://127.0.0.1:8000/api/system/status", False
    http.Send
    If Err.Number = 0 Then
        If http.Status = 200 Then
            IsServerReady = True
            Set http = Nothing
            Exit Function
        End If
    End If
    Set http = Nothing
    IsServerReady = False
End Function

If Not IsServerReady() Then
    WshShell.Run """" & pythonExe & """ """ & serverPy & """", 0, False
    For i = 1 To 150
        WScript.Sleep 100
        If IsServerReady() Then
            Exit For
        End If
    Next
End If

edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
If Not fso.FileExists(edgePath) Then
    edgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
End If

appUrl = "http://127.0.0.1:8000/"
edgeArgs = " --app=""" & appUrl & """ --user-data-dir=""" & userProfileDir & """ --window-size=1440,920 --no-first-run --no-default-browser-check"
WshShell.Run """" & edgePath & """" & edgeArgs, 1, False