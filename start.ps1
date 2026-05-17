$root = $PSScriptRoot

Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$root\server'; npm run dev"

Start-Sleep -Milliseconds 1000

Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd '$root\client'; npm start"
