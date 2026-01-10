#!/bin/bash

# Simple script to run seed data via Supabase CLI
# This is the easiest method if you're using Supabase

set -e

echo "🌱 Seeding Beespo with demo data..."
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Error: Supabase CLI is not installed"
    echo "Install it with: npm install -g supabase"
    echo "Or with Homebrew: brew install supabase/tap/supabase"
    exit 1
fi

# Check if project is linked
if [ ! -f ".supabase/config.toml" ]; then
    echo "❌ Error: Supabase project not linked"
    echo "Run: supabase link --project-ref YOUR_PROJECT_REF"
    exit 1
fi

echo "📥 Running seed migration via Supabase CLI..."
echo ""

# Run the migration
supabase db push

echo ""
echo "✅ Migration file pushed to Supabase"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📋 Next Steps:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Go to your app and sign up with:"
echo "   Email: demo@beespo.com"
echo "   Password: Demo123!"
echo ""
echo "2. After signup, update the profile in Supabase SQL Editor:"
echo ""
echo "   UPDATE profiles"
echo "   SET id = (SELECT id FROM auth.users WHERE email = 'demo@beespo.com')"
echo "   WHERE email = 'demo@beespo.com';"
echo ""
echo "3. Login with the same credentials and explore!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
