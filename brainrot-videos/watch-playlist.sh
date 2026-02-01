#!/bin/bash
# Auto-watch folder and update playlist.json when videos are added/removed
cd "$(dirname "$0")"
echo "Watching for video changes... (Ctrl+C to stop)"
./update-playlist.sh
fswatch -o *.mp4 *.webm *.mkv *.avi *.mov 2>/dev/null | while read; do
  ./update-playlist.sh
done
