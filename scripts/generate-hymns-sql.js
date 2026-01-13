const fs = require('fs');

// Read the hymns HTML files
const hymnalPath = './Hymns_of_The_Church_of_Jesus_Christ_of_latter-day_saints_lyrics.html';
const homeChurchPath = './Hymns—For_Home_and_Church_Lyrics.html';

const hymnalHtml = fs.readFileSync(hymnalPath, 'utf-8');
const homeChurchHtml = fs.readFileSync(homeChurchPath, 'utf-8');

// Extract hymn numbers and titles from <h3> tags
const hymnRegex = /<h3>(\d+)\.\s*(.+?)<\/h3>/g;
const hymns = [];

let match;
// Main hymnal (1-341)
while ((match = hymnRegex.exec(hymnalHtml)) !== null) {
    const number = parseInt(match[1]);
    const title = match[2].trim().replace(/'/g, "''"); // Escape single quotes for SQL
    hymns.push({ number, title, source: 'hymnal' });
}

// Home and Church (1001-1209)
while ((match = hymnRegex.exec(homeChurchHtml)) !== null) {
    const number = parseInt(match[1]);
    const title = match[2].trim().replace(/'/g, "''"); // Escape single quotes for SQL
    hymns.push({ number, title, source: 'home_church' });
}

// Sort by number
hymns.sort((a, b) => a.number - b.number);

// Generate SQL INSERT statements
let sql = '-- Full Hymns Data (' + hymns.length + ' hymns)\n';
sql += '-- Generated from both LDS hymnals\n';
sql += '-- Date: 2026-01-18\n\n';

hymns.forEach((hymn) => {
    const id = 'hymn_' + hymn.number.toString().padStart(4, '0');
    const name = 'Hymn #' + hymn.number + ' - ' + hymn.title;
    sql += "INSERT INTO procedural_item_types (id, name, is_hymn, hymn_number, default_duration_minutes, order_hint) VALUES ('" + id + "', '" + name + "', true, " + hymn.number + ", 3, 15);\n";
});

// Write to migration file
fs.writeFileSync('./supabase/migrations/20260118000002_seed_hymns_data.sql', sql);

console.log('Generated SQL file with ' + hymns.length + ' hymns');
