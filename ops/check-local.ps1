$checks=@(@{Name='MongoDB';HostName='127.0.0.1';Port=27017},@{Name='API';HostName='127.0.0.1';Port=4000},@{Name='Web';HostName='127.0.0.1';Port=5173})
foreach($check in $checks){$open=Test-NetConnection -ComputerName $check.HostName -Port $check.Port -InformationLevel Quiet -WarningAction SilentlyContinue;[pscustomobject]@{Service=$check.Name;Port=$check.Port;Running=$open}}
