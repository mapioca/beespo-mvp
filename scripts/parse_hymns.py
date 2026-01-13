import re

def parse_hymns(file_path, book_id):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Regex logic:
    # Find the h3 tag with number and title.
    # Ex: <h3>1. The Morning Breaks</h3>
    pattern = re.compile(r'<h3>(\d+)\.\s+(.*?)</h3>', re.DOTALL)
    
    hymns = []
    matches = pattern.findall(content)
    
    for number, title in matches:
        title = title.strip()
        
        # Escape single quotes for SQL
        title_sql = title.replace("'", "''")
        
        hymns.append(f"('{book_id}', {number}, '{title_sql}')")
            
    return hymns

def main():
    church_hymns = parse_hymns('Hymns_of_The_Church_of_Jesus_Christ_of_latter-day_saints_lyrics.html', 'hymns_church')
    home_hymns = parse_hymns('Hymns—For_Home_and_Church_Lyrics.html', 'hymns_home_church')
    
    all_hymns = church_hymns + home_hymns
    
    print(f"-- Generated {len(all_hymns)} hymns")
    print("-- Note: IDs are auto-generated. Lyrics are excluded.")
    print("INSERT INTO hymns (book_id, hymn_number, title) VALUES")
    print(",\n".join(all_hymns))
    print("ON CONFLICT (book_id, hymn_number) DO UPDATE SET title = EXCLUDED.title;")

if __name__ == "__main__":
    main()
