#!/bin/bash
set -e

mkdir -p ssl

if [ ! -f ssl/localhost.crt ] || [ ! -f ssl/localhost.key ]; then
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout ssl/localhost.key \
    -out ssl/localhost.crt \
    -subj "/CN=localhost"
  echo "Self-signed certificates generated in ./ssl"
else
  echo "Certificates already exist in ./ssl"
fi
