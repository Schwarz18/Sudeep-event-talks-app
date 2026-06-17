import re
import html
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime
from flask import Flask, jsonify, render_template

app = Flask(__name__)

# Feed URL
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache to prevent excessive requests
cache = {
    "data": None,
    "last_fetched": None
}
CACHE_DURATION_SECS = 60  # Cache for 1 minute

def strip_html(html_content):
    """Strips HTML tags and unescapes entities for text-only contexts like tweeting."""
    text = re.sub(r'<[^>]+>', '', html_content)
    text = html.unescape(text)
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def make_tweet_text(date_str, update_type, body_html, link):
    """Generates a text suitable for a tweet, observing the 280-character limit."""
    clean_body = strip_html(body_html)
    # Format header and footer
    header = f"Google Cloud BigQuery [{update_type}] ({date_str}): "
    footer = f" {link}"
    
    # Calculate limit for body
    max_body_len = 280 - len(header) - len(footer) - 3  # 3 for "..."
    
    if max_body_len <= 0:
        # Fallback if URL or header takes up everything
        return (header[:280 - len(footer)] + footer).strip()
    
    if len(clean_body) > max_body_len:
        body_part = clean_body[:max_body_len] + "..."
    else:
        body_part = clean_body
        
    return f"{header}{body_part}{footer}"

def parse_xml_feed(xml_data):
    """Parses the Atom XML feed and splits grouped updates into individual entries."""
    root = ET.fromstring(xml_data)
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    parsed_updates = []
    
    for entry in root.findall('atom:entry', ns):
        # Base entry info
        date_str = entry.find('atom:title', ns).text.strip()
        updated_raw = entry.find('atom:updated', ns).text
        
        # Parse datetime if possible for sorting
        try:
            # Format: 2026-06-16T00:00:00-07:00
            # Remove the timezone offset colon for older python compatibility if needed,
            # but standard isoformat parsing works in modern Python (3.7+).
            dt = datetime.fromisoformat(updated_raw)
            formatted_date = dt.strftime('%b %d, %Y')
        except Exception:
            formatted_date = date_str
            
        link_elem = entry.find('atom:link', ns)
        base_link = link_elem.attrib.get('href') if link_elem is not None else "https://cloud.google.com/bigquery/docs/release-notes"
        
        content_elem = entry.find('atom:content', ns)
        content_html = content_elem.text if content_elem is not None else ""
        
        # Split the HTML content by <h3> tags
        parts = re.split(r'<h3[^>]*>', content_html)
        
        for part in parts:
            if not part.strip():
                continue
                
            subparts = part.split('</h3>', 1)
            if len(subparts) == 2:
                update_type = subparts[0].strip()
                update_body = subparts[1].strip()
            else:
                update_type = "Update"
                update_body = part.strip()
                
            # Create a specific anchor link if the type exists in the header ID
            # Usually the feed links are like: release-notes#June_16_2026
            # We can use that or the base link.
            
            # Formulate individual update object
            tweet_text = make_tweet_text(formatted_date, update_type, update_body, base_link)
            
            parsed_updates.append({
                "date": formatted_date,
                "raw_date": updated_raw,
                "type": update_type,
                "body": update_body,
                "link": base_link,
                "tweet_text": tweet_text
            })
            
    return parsed_updates

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    global cache
    
    now = datetime.now()
    
    # Check if cache is still valid
    if (cache["data"] is not None and 
            cache["last_fetched"] is not None and 
            (now - cache["last_fetched"]).total_seconds() < CACHE_DURATION_SECS):
        return jsonify({
            "status": "success",
            "source": "cache",
            "data": cache["data"]
        })
        
    try:
        req = urllib.request.Request(
            FEED_URL, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_data = response.read()
            
        updates = parse_xml_feed(xml_data)
        
        # Update cache
        cache["data"] = updates
        cache["last_fetched"] = now
        
        return jsonify({
            "status": "success",
            "source": "network",
            "data": updates
        })
    except Exception as e:
        # Fallback to cache if available on network error
        if cache["data"] is not None:
            return jsonify({
                "status": "partial_success",
                "source": "cache_fallback",
                "error": str(e),
                "data": cache["data"]
            })
        return jsonify({
            "status": "error",
            "message": f"Failed to fetch release notes: {str(e)}"
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
