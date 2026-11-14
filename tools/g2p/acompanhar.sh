#!/bin/bash
# Painel ao vivo do treino do G2P: mostra a cada 10 s o progresso de cada idioma (runs/<idioma>/log.tsv).
# Uso (de qualquer pasta):  bash tools/g2p/acompanhar.sh      Sair: Ctrl+C (não interrompe o treino).
cd "$(dirname "$0")" || exit 1
while true; do
  [ -z "$UMA_VEZ" ] && clear
  echo "Treino do G2P — $(date '+%H:%M:%S')   (atualiza a cada 10 s; Ctrl+C sai sem parar o treino)"
  if pgrep -f "train.py" >/dev/null; then
    echo "Treinando agora: $(pgrep -fl 'train.py' | grep -o -- '--lang [a-zA-Z-]*' | head -1 | cut -d' ' -f2)"
  else
    echo "Nenhum treino rodando."
  fi
  for log in runs/*/log.tsv; do
    [ -f "$log" ] || continue
    lang=$(basename "$(dirname "$log")")
    awk -F'\t' -v lang="$lang" '
      NR > 1 { n++; ep = $1; loss = $2; secs += $4; if ($3 != "") { last = $3; if (best == "" || $3 + 0 < best + 0) best = $3 } }
      END {
        if (!n) { printf "\n%-6s aguardando a 1ª época…\n", lang; exit }
        printf "\n%-6s época %3d/80   perda %s   erro validação: último %s%%  melhor %s%%   (%.0f s/época, %d min até agora)\n",
          lang, ep, loss, (last == "" ? "—" : last), (best == "" ? "—" : best), secs / n, secs / 60
      }' "$log"
    tail -n +2 "$log" | tail -n 5 | awk -F'\t' '{ printf "         época %3s  perda %s  erro %s\n", $1, $2, ($3 == "" ? "—" : $3 "%") }'
  done
  if [ -f runs/treino.log ] && grep -q "TUDO PRONTO" runs/treino.log; then
    echo; echo "✔ Treino completo. Resultados:"; grep -E "erro por|===" runs/treino.log
  fi
  [ -n "$UMA_VEZ" ] && break  # UMA_VEZ=1: mostra uma vez e sai
  sleep 10
done
