@echo off
echo Starting low-memory MongoDB (256MB cache, FTDC disabled)...
if not exist "data" mkdir "data"
"C:\Program Files\MongoDB\Server\8.3\bin\mongod.exe" --dbpath data --port 27017 --wiredTigerCacheSizeGB 0.25 --setParameter diagnosticDataCollectionEnabled=false
