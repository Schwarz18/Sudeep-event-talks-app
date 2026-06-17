# BigQuery Release Notes Hub

A sleek, premium web application that parses, structures, and displays the official Google Cloud BigQuery Release Notes feed. It breaks down grouped updates into individual announcements, features, or issues, and provides an integrated, character-optimized sharing mechanism to publish updates directly to X (formerly Twitter).

---

## 🚀 Key Features

*   **Granular Parsing**: Splitting grouped feed items by daily releases into unique update cards.
*   **X (Twitter) Sharing**: Built-in helper to automatically truncate long updates to fit within the 280-character limit, appending the source link.
*   **Client-Side Filtering & Search**: Instant filter-by-category chips (Features, Issues, Announcements, Changes, Deprecations) and real-time full-text search.
*   **In-Memory Server Cache**: Implements a 60-second caching mechanism for fast response times and to prevent rate-limiting.
*   **Responsive Glassmorphic UI**: Premium dark mode theme using translucent components, glowing cards, and smooth micro-animations.

---

## 🛠️ Technology Stack

*   **Backend**: Python, Flask, ElementTree (standard library XML parser)
*   **Frontend**: Plain HTML5, Vanilla CSS3 (Custom Variables, Flexbox/Grid layouts), Vanilla ES6 JavaScript (Fetch API, local state management)
*   **Icons & Fonts**: FontAwesome (icons), Google Fonts (Plus Jakarta Sans, JetBrains Mono)

---

## 📂 Project Structure

```text
├── app.py                   # Flask server, Atom feed fetcher & XML parser
├── .gitignore               # Standard Python gitignore rules
├── README.md                # Project documentation
├── templates/
│   └── index.html           # Main dashboard layout
└── static/
    ├── css/
    │   └── styles.css       # Glassmorphism styling and custom keyframes
    └── js/
        └── app.js           # AJAX fetch requests, filters, and UI rendering
```

---

## ⚙️ Installation & Setup

### Prerequisites
Make sure you have **Python 3.8+** and **npm** installed on your system.

### 1. Clone or Copy the Repository
Place the project files into your desired workspace directory.

### 2. Install Python Dependencies
Install Flask using pip:
```bash
python -m pip install flask
```

### 3. Run the Application
Start the Flask development server:
```bash
python app.py
```
By default, the application will bind to port `5000` on your localhost.

### 4. Access in Browser
Open your web browser and navigate to:
👉 **[http://localhost:5000](http://localhost:5000)**

---

## 🔄 API Endpoints

### `GET /`
Renders the HTML single-page dashboard.

### `GET /api/release-notes`
Fetches and processes the RSS/Atom feed from Google Cloud.
*   **Headers**: None required.
*   **Sample Response**:
    ```json
    {
      "status": "success",
      "source": "network",
      "data": [
        {
          "date": "Jun 16, 2026",
          "type": "Feature",
          "body": "<p>BigQuery AI functions can use ObjectRef values...</p>",
          "link": "https://docs.cloud.google.com/bigquery/docs/release-notes#June_16_2026",
          "tweet_text": "Google Cloud BigQuery [Feature] (Jun 16, 2026): BigQuery AI functions can use ObjectRef values... https://docs.cloud.google.com/bigquery/docs/release-notes#June_16_2026"
        }
      ]
    }
    ```
    *Possible sources are `"network"` (cache expired/fresh fetch), `"cache"` (served from memory), and `"cache_fallback"` (served from expired cache due to offline/network failure).*

---

## 🤝 Contributing
Feel free to fork this project, open pull requests, or submit issues for any design upgrades or new features.

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
