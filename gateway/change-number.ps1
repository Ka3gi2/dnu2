# Change the sending number: deletes the saved session, then starts the gateway
# so you can scan the QR with a different number.
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue "$PSScriptRoot\auth"
Write-Host "Old session deleted. Scan the QR with the NEW number."
& "$PSScriptRoot\run.ps1"
