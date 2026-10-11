#!/bin/sh
set -e

echo "Running database migrations..."
npx node-pg-migrate up --envPath /dev/null

echo "Starting server..."
exec node src/server.js
