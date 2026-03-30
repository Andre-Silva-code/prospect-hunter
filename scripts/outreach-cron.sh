#!/bin/bash
# Cron local para processar fila de outreach a cada 60 segundos.
# Uso: cd /Users/andresilva/prospect-hunter && bash scripts/outreach-cron.sh

echo "Outreach cron iniciado (a cada 60s). Ctrl+C para parar."
echo ""

while true; do
  RESULT=$(curl -s -X POST http://localhost:3000/api/outreach/process \
    -H "Authorization: Bearer prospect-hunter-cron-secret-local" 2>/dev/null)

  TIMESTAMP=$(date +"%H:%M:%S")
  PROCESSED=$(echo "$RESULT" | python3 -c "import json,sys; print(json.load(sys.stdin).get('processed',0))" 2>/dev/null || echo "?")
  FAILED=$(echo "$RESULT" | python3 -c "import json,sys; print(json.load(sys.stdin).get('failed',0))" 2>/dev/null || echo "?")
  MSG=$(echo "$RESULT" | python3 -c "import json,sys; print(json.load(sys.stdin).get('message',''))" 2>/dev/null || echo "")

  if [ "$PROCESSED" != "0" ] || [ "$FAILED" != "0" ]; then
    echo "[$TIMESTAMP] Processados: $PROCESSED | Falhas: $FAILED"
  else
    echo "[$TIMESTAMP] $MSG"
  fi

  sleep 60
done
