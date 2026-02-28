const fs = require('fs');
const path = require('path');

const file1 = '/Users/moisescarpio/.gemini/antigravity/brain/acd716eb-ebe4-4cca-8c42-93827e01f418/.system_generated/steps/318/output.txt'; // Home and Church (SPA)
const file2 = '/Users/moisescarpio/.gemini/antigravity/brain/acd716eb-ebe4-4cca-8c42-93827e01f418/.system_generated/steps/325/output.txt'; // Standard Church (SPA)
const outputFile = '/Users/moisescarpio/Develop/Beespo/beespo-mvp/supabase/migrations/20260227224000_insert_spanish_hymns.sql';

let sql = `-- Migration to insert Spanish hymns\n\n`;

function escapeSql(str) {
    return str.replace(/'/g, "''");
}

function processFile(filePath, bookId) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(data);
        const topics = parsed.json?.topics || [];

        for (const topic of topics) {
            const topicName = escapeSql(topic.topic_name || '');
            const hymns = topic.hymns || [];

            for (const hymn of hymns) {
                if (!hymn.number || !hymn.title) continue;
                const hymnNumber = hymn.number;
                const title = escapeSql(hymn.title);

                sql += `INSERT INTO public.hymns (book_id, hymn_number, title, language, topic) VALUES ('${bookId}', ${hymnNumber}, '${title}', 'SPA', '${topicName}') ON CONFLICT (hymn_number, language, book_id) DO NOTHING;\n`;
            }
        }
        sql += `\n`;
    } catch (err) {
        console.error(`Error processing ${filePath}:`, err);
    }
}

console.log("Processing Home and Church...");
processFile(file1, 'himnos_hogar_iglesia');

console.log("Processing Standard Church...");
processFile(file2, 'himnos_iglesia');

fs.writeFileSync(outputFile, sql);
console.log(`Generated SQL at ${outputFile}`);
