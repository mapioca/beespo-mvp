#!/bin/bash

# Beespo MVP - Reset and Load Demo Data Script
# This script resets the database and loads fresh seed data

set -e

echo "🧹 Resetting Beespo database..."
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}Error: Supabase CLI is not installed${NC}"
    echo "Install it with: brew install supabase/tap/supabase"
    exit 1
fi

# Check if we're in the project directory
if [ ! -f "supabase/migrations/seed_demo_data.sql" ]; then
    echo -e "${RED}Error: seed_demo_data.sql not found${NC}"
    echo "Make sure you're running this script from the project root"
    exit 1
fi

echo -e "${YELLOW}⚠️  WARNING: This will delete ALL data in your database!${NC}"
echo ""
read -p "Are you sure you want to continue? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo "📦 Loading seed data..."
psql $DATABASE_URL -f supabase/migrations/seed_demo_data.sql

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Demo data loaded successfully!${NC}"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  📋 Next Steps:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "1. Create your demo user by signing up at your app with:"
    echo "   Email: demo@beespo.com"
    echo "   Password: Demo123!"
    echo ""
    echo "2. After signup, run this SQL in Supabase Dashboard:"
    echo ""
    echo "   UPDATE profiles"
    echo "   SET id = (SELECT id FROM auth.users WHERE email = 'demo@beespo.com')"
    echo "   WHERE email = 'demo@beespo.com';"
    echo ""
    echo "3. Login and explore your seeded data!"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
else
    echo ""
    echo -e "${RED}❌ Failed to load demo data${NC}"
    echo "Check the error messages above"
    exit 1
fi
