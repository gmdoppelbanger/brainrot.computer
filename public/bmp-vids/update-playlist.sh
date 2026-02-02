#!/bin/bash
# Auto-generate playlist.json from video files in this folder
cd "$(dirname "$0")"
echo "[" > playlist.json
first=true
shopt -s nullglob
for f in *.mp4 *.MP4 *.webm *.mkv *.avi *.mov *.MOV; do
  if [ "$first" = true ]; then
    first=false
  else
    echo "," >> playlist.json
  fi
  echo -n "  \"$f\"" >> playlist.json
done
shopt -u nullglob
echo "" >> playlist.json
echo "]" >> playlist.json
echo "Playlist updated!"
cat playlist.json
