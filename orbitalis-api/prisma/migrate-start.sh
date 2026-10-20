#!/bin/sh
# Aplica as migrações no start. Se o banco já existe mas nunca teve histórico de
# migrações (criado antes com `prisma db push`), o Prisma responde P3005: nesse caso
# marcamos como aplicadas as migrações anteriores à data de corte (o banco já as tem)
# e aplicamos só as novas.
CUTOFF="20260729000000_add_orcamentos"

OUT=$(npx prisma migrate deploy 2>&1)
CODE=$?
echo "$OUT"

if [ $CODE -ne 0 ] && echo "$OUT" | grep -q "P3005"; then
  echo ">> Banco sem histórico de migrações: baseline até $CUTOFF"
  for d in $(ls -1 prisma/migrations | grep -E '^[0-9]{14}_' | sort); do
    if [ "$d" \> "$CUTOFF" ]; then break; fi
    npx prisma migrate resolve --applied "$d" || exit 1
  done
  npx prisma migrate deploy || exit 1
  exit 0
fi

exit $CODE
