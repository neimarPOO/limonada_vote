#!/bin/bash

# Generate config.js from Netlify environment variables
cat <<EOF > config.js
const SUPABASE_URL = "$SUPABASE_URL";
const SUPABASE_KEY = "$SUPABASE_KEY";
EOF

echo "Generated config.js successfully."

