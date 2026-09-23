$port = 8080
$root = "C:\Users\nandh\.gemini\antigravity\scratch\carehub"
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
$listener.Start()
Write-Host "CareHub TCP Server listening on port $port"
while ($true) {
    try {
        $client = $listener.AcceptTcpClient()
        [System.Threading.Tasks.Task]::Run({
            param($c, $r)
            try {
                $stream = $c.GetStream()
                $reader = [System.IO.StreamReader]::new($stream)
                $requestLine = $reader.ReadLine()
                if ($requestLine) {
                    $tokens = $requestLine.Split(" ")
                    $rawPath = $tokens[1].TrimStart('/')
                    $path = $rawPath.Split('?')[0]
                    if ($path -eq "") { $path = "index.html" }
                    $file = Join-Path $r $path
                    if (Test-Path $file -PathType Leaf) {
                        $bytes = [System.IO.File]::ReadAllBytes($file)
                        $ct = "text/plain"
                        if ($file.EndsWith(".html")) { $ct = "text/html; charset=utf-8" }
                        elseif ($file.EndsWith(".css")) { $ct = "text/css; charset=utf-8" }
                        elseif ($file.EndsWith(".js")) { $ct = "application/javascript; charset=utf-8" }
                        elseif ($file.EndsWith(".svg")) { $ct = "image/svg+xml" }
                        elseif ($file.EndsWith(".png")) { $ct = "image/png" }
                        
                        $header = "HTTP/1.1 200 OK`r`nContent-Type: $ct`r`nContent-Length: $($bytes.Length)`r`nAccess-Control-Allow-Origin: *`r`nConnection: close`r`n`r`n"
                        $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
                        $stream.Write($headerBytes, 0, $headerBytes.Length)
                        $stream.Write($bytes, 0, $bytes.Length)
                    } else {
                        $resp = "HTTP/1.1 404 Not Found`r`nContent-Length: 9`r`nConnection: close`r`n`r`nNot Found"
                        $respBytes = [System.Text.Encoding]::ASCII.GetBytes($resp)
                        $stream.Write($respBytes, 0, $respBytes.Length)
                    }
                }
            } catch {}
            finally {
                $c.Close()
            }
        }.GetNewClosure(), $client, $root)
    } catch {
        break
    }
}
