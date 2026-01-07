# AniTierlist

## Overview
AniTierlist is an easy‑to‑use web app for creating tier lists for **Anime**, **Manga**, and **Characters**. It focuses on fast search, clean layout, and simple drag‑and‑drop tools, without extra complexity.

## Why You'll Love It
- **Never Lose Your Place** – Your search stays waiting for you even if you switch tabs or refresh the page.
- **Instant Results** – Just start typing to find Anime, Manga, or Characters instantly.
- **Find Characters Your Way** – Look up characters by their name or find everyone from a specific series.
- **Easy Tier Builder** – Drag and drop to rank your favorites. Customize colors, rename tiers, and make it your own.
- **Sync with AniList** – Log in to pull your own "Watching" or "Completed" lists directly into the tier maker.
- **Explore Seasons** – Browse what's airing this season without messing up your main search filters.
- **Perfect for Mobile** – A smooth experience on your phone with easy-to-read text, smaller icons, and clear controls.
- **Clean Layout** – The unranked pool scrolls sideways to save space, keeping your screen clutter-free.
- **Dark Mode** – Easy on the eyes for those late-night ranking sessions.
- **External Image Import** – Don't see what you're looking for? Import any image via URL or upload multiple local files directly into your rankings.
- **Share Your Lists** – Generate a shareable URL hash link to instantly share your tier list with friends. No database required!
  > **Note:** Share Link only works with anime/manga/characters from the AniList database. Local/custom imported images will not be included in shared links.
- **Backup & Restore** – Save your complete tier list state as a JSON file. Perfect for moving between devices or keeping long-term backups of your rankings.
  > **Note:** Unlike Share Link, JSON export/import preserves ALL items including local/custom imported images.
- **Multiple Export Options** – Share your list exactly how you want: 
  - **PNG Image**: High-quality visual snapshot for social media.
  - **Text List**: A cleanly formatted text file listing every anime by tier—perfect for sharing lists in Discord or forums.
  - **JSON Configuration**: A complete data backup containing all your items and tier settings.
- **Dynamic Portability** – All exports now prioritize accuracy, ensuring anime titles are used in text files and images are properly restored in JSON imports.

## Installation & Usage
1. **Launch the App**: Clone the repository and open `index.html` in any modern web browser.
2. **Select Content Type**: Choose between **Anime**, **Manga**, or **Characters** to filter your searches.
3. **Build Your Pool**:
   - Use the **Search** bar to find items via the AniList API.
   - Use the **Import** tab to add your own custom images via URL or local file upload.
   - Click the **+ Add to Pool** button on any item to add it to your unranked collection.
4. **Rank Your Items**: Drag and drop items from the pool into the tiers. You can reorder items within tiers or swap them as needed.
5. **Customize Tiers**: Click on tier names to rename them or change their colors to match your aesthetic.
6. **Save & Share**:
   - **Save the Tierlist**: Click to download a complete JSON backup with all items and settings (including custom images).
   - **Share Link**: Generate a URL hash to share your tierlist instantly (AniList items only).
   - **Export Text**: Download a formatted text list of your rankings.
   - **Save PNG**: Download a visual snapshot of your tier list.
7. **Restore**:
   - Have a JSON backup? Go to the **Import** tab and select **Load Saved Tierlist** to instantly restore your tiers, items, and settings.

## File Structure
```
AniTierlist/
├── index.html          # Main interface (Tailwind CDN integrated)
├── style.css           # Custom visual effects (scanlines, grid, scrollbars)
├── script.js           # Application logic & API handling
└── README.md           # Documentation
```

## Acknowledgments
- [AniList API](https://anilist.co)
- [Tailwind CSS](https://tailwindcss.com)
- [Font Awesome](https://fontawesome.com)
