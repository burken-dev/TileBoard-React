#!/bin/sh
set -e

mkdir -p /app/config
for f in /config-defaults/*; do
  [ -e "/app/config/$(basename "$f")" ] || cp -r "$f" /app/config/
done

exec "$@"
