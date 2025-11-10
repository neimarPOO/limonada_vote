#!/bin/bash

# Generate config.js from Netlify environment variables
echo "const SUPABASE_URL = \"$SUPABASE_URL\";" > config.js
echo "const SUPABASE_KEY = \"$SUPABASE_KEY\";" >> config.js

echo "Generated config.js successfully."

