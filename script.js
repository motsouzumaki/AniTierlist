// Constants & Config
const ANILIST_API_URL = 'https://graphql.anilist.co';

// Default Tier Configuration (source of truth)
const DEFAULT_TIER_CONFIG = [
    { id: 1, name: 'S', color: '#fe769b' },
    { id: 2, name: 'A', color: '#ffffa6' },
    { id: 3, name: 'B', color: '#9df79d' },
    { id: 4, name: 'C', color: '#76f8f8' },
    { id: 5, name: 'D', color: '#9998fe' },
    { id: 6, name: 'E', color: '#ffbafd' },
    { id: 7, name: 'F', color: '#989898' },
];

/**
 * Debounce function to limit how often a function is executed.
 * @param {Function} func - The function to be debounced.
 * @param {number} delay - The delay in milliseconds.
 */
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

// Load or initialize tier configuration
function initializeTierConfig() {
    const saved = localStorage.getItem('aniTierList_tierConfig');
    if (saved) {
        return JSON.parse(saved);
    }
    return JSON.parse(JSON.stringify(DEFAULT_TIER_CONFIG));
}

let tierConfig = initializeTierConfig();

const ANIME_FORMATS = [
    { value: 'all', text: 'All Formats' }, { value: 'TV', text: 'TV Show' },
    { value: 'MOVIE', text: 'Movie' }, { value: 'TV_SHORT', text: 'TV Short' },
    { value: 'SPECIAL', text: 'Special' }, { value: 'OVA', text: 'OVA' }, { value: 'ONA', text: 'ONA' }
];

const MANGA_FORMATS = [
    { value: 'all', text: 'All Formats' }, { value: 'MANGA', text: 'Manga' },
    { value: 'NOVEL', text: 'Light Novel' }, { value: 'ONE_SHOT', text: 'One Shot' }
];

const CHARACTER_SORT_OPTIONS = [
    { value: 'SEARCH_MATCH', text: 'Relevance' },
    { value: 'FAVOURITES', text: 'Favorites' },
    { value: 'ID', text: 'Date Added' }
];

const ANILIST_MEDIA_ID_QUERY = `query ($search: String, $type: MediaType) {
    Page(perPage: 1) {
        media(search: $search, type: $type, sort: SEARCH_MATCH) {
            id
            title { romaji english }
        }
    }
}`;

const ANILIST_CHARACTERS_BY_ID_QUERY = `
query ($id: Int, $page: Int) {
  Media(id: $id) {
    id
    title {
      romaji
      english
    }
    characters(page: $page, sort: [ROLE, FAVOURITES_DESC], perPage: 50) {
      pageInfo {
        hasNextPage
      }
      edges {
        role 
        node {
          id
          name {
            full
          }
          image {
            large
          }
          favourites
        }
      }
    }
  }
}
`;

const ANILIST_SEARCH_SERIES_QUERY = `query ($search: String, $type: MediaType) {
    Page(perPage: 20) {
        media(search: $search, type: $type, isAdult: false, sort: SEARCH_MATCH) {
             id title { romaji english } coverImage { extraLarge }
             startDate { year } format popularity averageScore trending
        }
    }
}`;
const CHARACTER_GENDER_OPTIONS = [
    { value: 'all', text: 'All Genders' }, { value: 'Male', text: 'Male' },
    { value: 'Female', text: 'Female' }
];

// State - Initialize tiers from tierConfig (first 4 tiers by default)
let tiers = tierConfig.slice(0, 4).map(cfg => ({ name: cfg.name, color: cfg.color, items: [] }));
let pool = [];
let searchType = 'ANIME';
let characterSearchMode = 'NAME'; // 'NAME' or 'SERIES'
let draggedItem = null;
let draggedFrom = null;
let currentResults = [];
let activeTab = 'search';
let lastSeriesSearchResults = [];

// DOM Elements
const tierContainer = document.getElementById('tier-container');
const addTierBtn = document.getElementById('add-tier-btn');
const remTierBtn = document.getElementById('rem-tier-btn');
const poolItems = document.getElementById('pool-items');
const tabSearch = document.getElementById('tab-search');
const tabSync = document.getElementById('tab-sync');
const tabSeasons = document.getElementById('tab-seasons');
const panelSearch = document.getElementById('panel-search');
const panelSync = document.getElementById('panel-sync');
const panelSeasons = document.getElementById('panel-seasons');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const searchResultsContainer = document.getElementById('search-results');
const typeAnimeBtn = document.getElementById('type-anime');
const typeMangaBtn = document.getElementById('type-manga');
const typeCharacterBtn = document.getElementById('type-character');
const typeAnimeSyncBtn = document.getElementById('type-anime-sync');
const typeMangaSyncBtn = document.getElementById('type-manga-sync');
const usernameInput = document.getElementById('username-input');
const syncBtn = document.getElementById('sync-btn');
const syncStatus = document.getElementById('sync-status');
const syncResultsContainer = document.getElementById('sync-results');
const exportBtn = document.getElementById('export-btn');
const saveBtn = document.getElementById('save-btn');
const clearRankedTiersBtn = document.getElementById('clear-ranked-tiers-btn');
const clearUnrankedPoolBtn = document.getElementById('clear-unranked-pool-btn');

// Character Search Mode Elements
const characterSearchModeToggle = document.getElementById('character-search-mode-toggle');
const modeCharacterNameBtn = document.getElementById('mode-character-name');
const modeSeriesTitleBtn = document.getElementById('mode-series-title');

// Seasons Tab Elements
const seasonSelect = document.getElementById('season-select');
const yearInput = document.getElementById('year-input');
const seasonUsernameInput = document.getElementById('season-username-input');
const seasonSearchBtn = document.getElementById('season-search-btn');
const seasonStatus = document.getElementById('season-status');
const seasonResultsContainer = document.getElementById('season-results');

// Filters - Search Tab
const globalFilterControls = document.getElementById('global-filter-controls');
const filterSortBy = document.getElementById('filter-sort-by');
const filterSortDirection = document.getElementById('filter-sort-direction');
const filterFormat = document.getElementById('filter-format');
const filterStatus = document.getElementById('filter-status');

// Filters - Sync Tab
const globalFilterControlsSync = document.getElementById('global-filter-controls-sync');
const filterSortBySync = document.getElementById('filter-sort-by-sync');
const filterSortDirectionSync = document.getElementById('filter-sort-direction-sync');
const filterFormatSync = document.getElementById('filter-format-sync');
const filterStatusSync = document.getElementById('filter-status-sync');

// Filters - Seasons Tab
const globalFilterControlsSeasons = document.getElementById('global-filter-controls-seasons');
const filterSortBySeasons = document.getElementById('filter-sort-by-seasons');
const filterSortDirectionSeasons = document.getElementById('filter-sort-direction-seasons');
const filterFormatSeasons = document.getElementById('filter-format-seasons');

// Title Filter Inputs
const filterTitleInput = document.getElementById('filter-title-input');
const filterTitleInputSync = document.getElementById('filter-title-input-sync');
const filterTitleInputSeasons = document.getElementById('filter-title-input-seasons');

// Layout Toggle Buttons
const layoutToggleBtn = document.getElementById('layout-toggle-btn');
const layoutToggleBtnSync = document.getElementById('layout-toggle-btn-sync');
const layoutToggleBtnSeasons = document.getElementById('layout-toggle-btn-seasons');

// Settings Modal Elements
const settingsModal = document.getElementById('settings-modal');
const settingsBtn = document.getElementById('settings-btn');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const resetSettingsBtn = document.getElementById('reset-settings-btn');
const tierSettingsContainer = document.getElementById('tier-settings-container');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    renderTiers();
    renderPool();
    setupEventListeners();
    updateTypeButtons();
    updateFormatFilterOptions('ANIME');
    yearInput.value = new Date().getFullYear();

    // Rendering
    function renderTiers() {
        tierContainer.innerHTML = '';
        tiers.forEach((tier, index) => {
            const box = document.createElement('div');
            box.className = 'box';
            const nameDiv = document.createElement('div');
            nameDiv.className = 'name';
            nameDiv.style.backgroundColor = tier.color;
            nameDiv.textContent = tier.name;
            box.appendChild(nameDiv);
            const itemsDiv = document.createElement('div');
            itemsDiv.className = 'items';
            itemsDiv.dataset.tierIndex = index;
            tier.items.forEach(item => itemsDiv.appendChild(createDraggableImage(item, { tierIndex: index })));
            itemsDiv.addEventListener('dragover', handleDragOver);
            itemsDiv.addEventListener('drop', (e) => handleDrop(e, { tierIndex: index }));
            box.appendChild(itemsDiv);
            tierContainer.appendChild(box);
        });
        addTierBtn.style.display = tiers.length >= 7 ? 'none' : 'block';
        remTierBtn.style.display = tiers.length <= 0 ? 'none' : 'block';
    }

    function renderPool() {
        poolItems.innerHTML = '';
        if (pool.length === 0) {
            poolItems.innerHTML = '<div class="w-full text-center text-gray-500 py-8">Pool Empty</div>';
            return;
        }
        pool.forEach(item => poolItems.appendChild(createDraggableImage(item, 'pool')));
    }

    function createDraggableImage(item, source) {
        const wrapper = document.createElement('div');
        wrapper.className = 'album group';
        // HARDENED TOUCH SETTINGS:
        wrapper.style.touchAction = 'none';
        wrapper.style.userSelect = 'none';
        wrapper.style.webkitUserSelect = 'none';

        const img = document.createElement('img');
        img.src = item.img;
        img.draggable = true; // Keep true for Mouse Drag
        // Prevent native touch actions on image too
        img.style.touchAction = 'none';
        img.style.webkitUserDrag = 'none'; // Webkit specific disable
        img.style.userSelect = 'none';

        const tooltip = document.createElement('div');
        tooltip.className = 'absolute bottom-0 left-0 right-0 bg-black/80 text-white text-[10px] p-1 opacity-0 group-hover:opacity-100 transition-opacity truncate text-center pointer-events-none';
        tooltip.textContent = item.title;
        wrapper.appendChild(img);
        wrapper.appendChild(tooltip);
        img.addEventListener('dragstart', () => {
            draggedItem = item;
            draggedFrom = source;
            img.classList.add('dragging');
        });
        img.addEventListener('dragend', () => img.classList.remove('dragging'));

        // Touch Events explicitly on wrapper for better capture
        wrapper.addEventListener('touchstart', (e) => handleTouchStart(e, item, source), { passive: false });
        wrapper.addEventListener('touchmove', handleTouchMove, { passive: false });
        wrapper.addEventListener('touchend', handleTouchEnd);

        return wrapper;
    }

    // Touch Handling Variables
    let touchDragItem = null; // The visual clone
    let touchDragOffsetX = 0;
    let touchDragOffsetY = 0;

    function handleTouchStart(e, item, source) {
        if (e.touches.length > 1) return;
        e.preventDefault();

        const target = e.target;
        const wrapper = target.closest('.album');
        if (!wrapper) return;

        // Disable native drag on the image to prevent conflict
        const imgEl = wrapper.querySelector('img');
        if (imgEl) imgEl.draggable = false;

        draggedItem = item;
        draggedFrom = source;

        const touch = e.touches[0];
        const rect = wrapper.getBoundingClientRect();

        touchDragOffsetX = touch.clientX - rect.left;
        touchDragOffsetY = touch.clientY - rect.top;

        // GHOST STRATEGY: Create a fresh visual ghost instead of deep cloning
        // This avoids inheriting context-specific styles (like opacity transitions) that might hide the element
        const ghost = document.createElement('div');
        ghost.style.position = 'fixed';
        ghost.style.left = rect.left + 'px';
        ghost.style.top = rect.top + 'px';
        ghost.style.width = rect.width + 'px';
        ghost.style.height = rect.height + 'px';
        ghost.style.zIndex = '2147483647'; // Max Z-Index
        ghost.style.pointerEvents = 'none';
        ghost.style.transform = 'scale(1.1)';
        ghost.style.borderRadius = '4px';
        ghost.style.boxShadow = '0 0 15px #00dfff'; // Strong glow
        ghost.style.border = '2px solid #00dfff';
        ghost.style.overflow = 'hidden';
        ghost.style.backgroundColor = '#17212b'; // Background in case image transparent

        const ghostImg = document.createElement('img');
        ghostImg.src = item.img;
        ghostImg.style.width = '100%';
        ghostImg.style.height = '100%';
        ghostImg.style.objectFit = 'cover';
        ghostImg.style.display = 'block';

        ghost.appendChild(ghostImg);
        document.body.appendChild(ghost);
        touchDragItem = ghost;

        // Visual feedback on the source element
        wrapper.classList.add('opacity-20');
    }

    function handleTouchMove(e) {
        if (!touchDragItem) return;
        e.preventDefault();

        const touch = e.touches[0];
        const newX = touch.clientX - touchDragOffsetX;
        const newY = touch.clientY - touchDragOffsetY;

        touchDragItem.style.left = newX + 'px';
        touchDragItem.style.top = newY + 'px';
    }

    function handleTouchEnd(e) {
        if (!touchDragItem) return;
        e.preventDefault();

        // 1. Identify drop target through the clone/pointer
        const touch = e.changedTouches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);

        // Remove the clone
        if (touchDragItem && touchDragItem.parentNode === document.body) {
            document.body.removeChild(touchDragItem);
        }
        touchDragItem = null;

        // 2. Determine Destination
        let destination = null;

        if (target) {
            const poolContainer = target.closest('#pool-items');
            const itemsContainer = target.closest('.items');

            if (poolContainer) {
                destination = 'pool';
            } else if (itemsContainer && itemsContainer.dataset.tierIndex !== undefined) {
                destination = { tierIndex: parseInt(itemsContainer.dataset.tierIndex) };
            }
        }

        // 3. Execute Drop
        if (destination) {
            // Remove from source
            if (draggedFrom === 'pool') {
                pool = pool.filter(i => i.id !== draggedItem.id);
            } else if (typeof draggedFrom === 'object') {
                const sourceTier = tiers[draggedFrom.tierIndex];
                if (sourceTier) {
                    sourceTier.items = sourceTier.items.filter(i => i.id !== draggedItem.id);
                }
            }

            // Add to destination
            if (destination === 'pool') {
                pool.push(draggedItem);
            } else if (typeof destination === 'object') {
                const destTier = tiers[destination.tierIndex];

                let insertIndex = destTier.items.length;
                const itemsContainer = tierContainer.children[destination.tierIndex].querySelector('.items');

                // For logic, we need to compare against static items.
                // Since we used a CLONE, the original item is still in the DOM (just transparent).
                // We should EXCLUDE it from calculation to avoid self-reference madness.
                const itemElements = Array.from(itemsContainer.children).filter(el => {
                    return !el.classList.contains('opacity-20');
                });

                for (let i = 0; i < itemElements.length; i++) {
                    const rect = itemElements[i].getBoundingClientRect();
                    const centerX = rect.left + rect.width / 2;
                    if (touch.clientX < centerX) {
                        insertIndex = i;
                        break;
                    }
                }

                destTier.items.splice(insertIndex, 0, draggedItem);
            }
            // Manual save matching existing logic
            // (Note: user removed saveState call in previous turn, but we must ensure state persists differently? 
            // The original handleDrop had saveState() commented out in my earlier view? No, it called `saveState()`.
            // Wait, I removed `saveState()` in step 29 explicitly.
            // I should respect that or re-add it if needed.
            // Actually, handleDrop calls saveState?
            // Let's check view_file from step 8 lines 681.
            // "renderTiers(); renderPool();"
            // It does NOT call saveState at end of handleDrop inside the snippet I saw?
            // Wait, I saw "saveState(); // Ensure state is saved after move" in step 25.
            // Then I removed it in step 29.
            // So I will NOT add it here.)
        }

        // 4. Reset & Render
        draggedItem = null;
        draggedFrom = null;
        renderTiers();
        renderPool();
    }

    // Search
    async function performSearch() {
        if (searchType === 'CHARACTER') {
            handleCharacterSearch();
            return;
        }
        const query = searchInput.value;
        if (!query) return;
        searchResultsContainer.innerHTML = '<div class="col-span-2 text-center text-neon-blue animate-pulse">Searching...</div>';
        const gqlQuery = `query ($search: String, $type: MediaType) {
    Page(perPage: 20) {
        media(search: $search, type: $type, isAdult: false) {
                id title { romaji english } coverImage { extraLarge }
                startDate { year } format popularity averageScore trending
        }
    }
}`;
        try {
            const response = await fetch(ANILIST_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ query: gqlQuery, variables: { search: query, type: searchType } })
            });
            const data = await response.json();
            currentResults = data.data.Page.media;
            globalFilterControls.style.display = 'flex';
            applyFiltersAndSort();
        } catch (error) {
            console.error(error);
            searchResultsContainer.innerHTML = '<div class="col-span-2 text-center text-red-500">Error fetching data</div>';
        }
    }

    function renderSearchResults(results) {
        let container;
        if (activeTab === 'sync') {
            container = syncResultsContainer;
        } else if (activeTab === 'seasons') {
            container = seasonResultsContainer;
        } else {
            container = searchResultsContainer;
        }
        container.innerHTML = '';
        if (!results || results.length === 0) {
            container.innerHTML = '<div class="col-span-full text-center text-gray-500">No results found</div>';
            return;
        }
        results.forEach(media => {
            const title = media.title.english || media.title.romaji;
            const imgUrl = media.coverImage.extraLarge;
            const isCharacter = media.format === 'CHARACTER';
            const card = document.createElement('div');

            // Fix: Only apply pink hover border to Characters, else Blue
            const borderClass = isCharacter
                ? 'border-neon-pink/30 hover:border-neon-pink'
                : 'border-neon-blue/30 hover:border-neon-blue';

            card.className = `search-result-card flex flex-col rounded overflow-hidden group cursor-pointer border ${borderClass} transition-colors`;

            if (isCharacter) {
                const gender = media.gender || '';
                const mediaTitle = media.description || '';
                card.innerHTML = `
                <div class="relative w-full overflow-hidden">
                    <img src="${imgUrl}" class="w-full aspect-[2/3] object-cover group-hover:scale-110 transition-transform duration-500">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2">
                        <button class="add-to-pool-btn bg-neon-pink text-black font-bold px-3 py-1 text-[10px] uppercase hover:bg-white hover:text-neon-pink transition-colors shadow-[0_0_10px_#ff00ff]">
                            <i class="fas fa-plus mr-1"></i> Add
                        </button>
                    </div>
                </div>
                <div class="p-2 flex flex-col flex-1">
                    <div class="search-result-title text-xs font-bold text-neon-pink truncate mb-1" title="${title}">${title}</div>
                    <div class="text-[10px] text-gray-400" title="${mediaTitle}">${mediaTitle}</div>
                    ${gender ? `<div class="text-[10px] text-white opacity-70">${gender}</div>` : ''}
                </div>
`;
            } else {
                card.innerHTML = `
                <div class="relative w-full overflow-hidden">
                    <img src="${imgUrl}" class="w-full aspect-[2/3] object-cover group-hover:scale-110 transition-transform duration-500">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2">
                        <button class="add-to-pool-btn bg-neon-blue text-black font-bold px-3 py-1 text-[10px] uppercase hover:bg-white transition-colors shadow-neon">
                            <i class="fas fa-plus mr-1"></i> Add
                        </button>
                    </div>
                </div>
                <div class="p-2 flex flex-col flex-1">
                    <div class="search-result-title text-xs font-bold text-neon-blue truncate mb-1" title="${title}">${title}</div>
                    <div class="text-[10px] text-gray-400">${media.startDate.year || '?'} • ${media.format}</div>
                    ${media.userStatus ? `<div class="text-[10px] text-neon-pink">${media.userStatus}</div>` : ''}
                </div>
`;
            }

            const addToPoolHandler = (e) => {
                e.stopPropagation();
                addToPool({ id: media.id, title: title, img: imgUrl });
                // Brief visual feedback
                card.style.opacity = '0.5';
                setTimeout(() => {
                    card.style.opacity = '1';
                }, 300);
            };

            // Add button click
            const addBtn = card.querySelector('.add-to-pool-btn');
            if (addBtn) addBtn.addEventListener('click', addToPoolHandler);

            // Click on entire card also adds
            card.addEventListener('click', addToPoolHandler);

            // Explicitly add listener to title for List View reliability
            const titleEl = card.querySelector('.search-result-title');
            if (titleEl) titleEl.addEventListener('click', addToPoolHandler);

            container.appendChild(card);
        });
    }

    function addToPool(item) {
        if (pool.some(i => i.id === item.id)) return;
        if (tiers.some(t => t.items.some(i => i.id === item.id))) return;
        pool.push(item);
        renderPool();
    }

    // User Sync
    async function syncUserList() {
        const username = usernameInput.value;
        if (!username) return;
        syncStatus.innerHTML = '<span class="text-neon-pink animate-pulse">Syncing...</span>';
        syncBtn.disabled = true;
        const query = `query($name: String, $type: MediaType) {
    MediaListCollection(userName: $name, type: $type) {
            lists {
                entries {
                    media { id title { romaji english } coverImage { extraLarge }
                        startDate { year } format popularity averageScore trending
                }
                    score status
            }
        }
    }
} `;
        try {
            const response = await fetch(ANILIST_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ query: query, variables: { name: username, type: searchType } })
            });
            const data = await response.json();
            if (data.errors) throw new Error(data.errors[0].message);
            const lists = data.data.MediaListCollection.lists;
            const entries = lists.flatMap(l => l.entries);
            const results = entries.map(entry => ({
                id: entry.media.id,
                title: { english: entry.media.title.english, romaji: entry.media.title.romaji },
                coverImage: { extraLarge: entry.media.coverImage.extraLarge },
                startDate: entry.media.startDate,
                format: entry.media.format,
                popularity: entry.media.popularity,
                averageScore: entry.media.averageScore,
                trending: entry.media.trending,
                userScore: entry.score,
                userStatus: entry.status
            }));
            currentResults = results;
            globalFilterControlsSync.style.display = 'flex';
            applyFiltersAndSort();
            syncStatus.innerHTML = `< span class="text-green-400" > Fetched ${results.length} items!</span > `;
        } catch (error) {
            console.error(error);
            syncStatus.innerHTML = `< span class="text-red-500" > Error: ${error.message}</span > `;
        } finally {
            syncBtn.disabled = false;
        }
    }

    // Fetch user's complete anime list for filtering
    async function fetchUserAnimeList(username) {
        const query = `query($name: String, $type: MediaType) {
    MediaListCollection(userName: $name, type: $type) {
            lists {
                entries {
                    media { id }
            }
        }
    }
} `;

        const response = await fetch(ANILIST_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ query: query, variables: { name: username, type: 'ANIME' } })
        });

        const data = await response.json();

        if (data.errors) {
            throw new Error(data.errors[0].message);
        }

        if (!data.data.MediaListCollection) {
            throw new Error('User not found or list is private');
        }

        // Extract all anime IDs into a Set for O(1) lookup
        const userAnimeIdSet = new Set();
        const lists = data.data.MediaListCollection.lists;
        lists.forEach(list => {
            list.entries.forEach(entry => {
                userAnimeIdSet.add(entry.media.id);
            });
        });

        console.log(`Fetched ${userAnimeIdSet.size} anime from ${username} 's list`);
        return userAnimeIdSet;
    }

    // Fetch all seasonal anime with pagination
    async function fetchAllSeasonalAnime(season, year, statusCallback) {
        const query = `query ($season: MediaSeason, $seasonYear: Int, $page: Int) {
        Page(page: $page, perPage: 50) {
            pageInfo {
                hasNextPage
                currentPage
                total
            }
            media(season: $season, seasonYear: $seasonYear, type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
                id
                title { romaji english }
                coverImage { extraLarge }
                averageScore
                popularity
                trending
                format
                status
                startDate { year }
            }
        }
    }`;

        let allResults = [];
        let page = 1;
        let hasNextPage = true;

        while (hasNextPage) {
            if (statusCallback) {
                statusCallback(`Fetching page ${page}...`);
            }

            const response = await fetch(ANILIST_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({
                    query: query,
                    variables: { season: season, seasonYear: year, page: page }
                })
            });

            const data = await response.json();

            if (data.errors) {
                throw new Error(data.errors[0].message);
            }

            const pageData = data.data.Page;
            const normalizedResults = pageData.media.map(media => ({
                id: media.id,
                title: { english: media.title.english, romaji: media.title.romaji },
                coverImage: { extraLarge: media.coverImage.extraLarge },
                startDate: media.startDate,
                format: media.format,
                popularity: media.popularity,
                averageScore: media.averageScore,
                trending: media.trending,
                status: media.status
            }));

            allResults = allResults.concat(normalizedResults);
            hasNextPage = pageData.pageInfo.hasNextPage;
            page++;

            // Rate limiting - small delay between requests
            if (hasNextPage) {
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }

        return allResults;
    }

    // Season Search - Full API Implementation with User Filter & Pagination
    async function handleSeasonSearch() {
        const season = seasonSelect.value;
        const year = parseInt(yearInput.value);
        const username = seasonUsernameInput.value.trim();

        if (!year || year < 1940 || year > 2100) {
            seasonStatus.innerHTML = '<span class="text-red-500">Please enter a valid year (1940-2100)</span>';
            return;
        }

        seasonStatus.innerHTML = '<span class="text-neon-blue animate-pulse">Searching...</span>';
        seasonSearchBtn.disabled = true;

        try {
            // Fetch all seasonal anime with pagination
            const seasonalResults = await fetchAllSeasonalAnime(season, year, (msg) => {
                seasonStatus.innerHTML = `<span class="text-neon-blue animate-pulse">${msg}</span>`;
            });

            let finalResults = seasonalResults;
            let statusMessage = `Found ${seasonalResults.length} anime for ${season} ${year}`;

            // If username provided, filter by user's list
            if (username) {
                seasonStatus.innerHTML = '<span class="text-neon-blue animate-pulse">Fetching user list...</span>';

                try {
                    const userAnimeIdSet = await fetchUserAnimeList(username);

                    // Filter seasonal results by user's list
                    finalResults = seasonalResults.filter(anime => userAnimeIdSet.has(anime.id));

                    statusMessage = `<span class="text-green-400">Found ${finalResults.length}/${seasonalResults.length} anime on ${username}'s list for ${season} ${year}</span>`;
                } catch (userError) {
                    // User fetch failed - show warning but still display full results
                    console.error('User list fetch failed:', userError);
                    statusMessage = `<span class="text-yellow-400">${userError.message}. Showing all ${seasonalResults.length} results for ${season} ${year}</span>`;
                }
            } else {
                statusMessage = `<span class="text-green-400">${statusMessage}!</span>`;
            }

            currentResults = finalResults;
            globalFilterControlsSeasons.style.display = 'flex';
            applyFiltersAndSort();
            seasonStatus.innerHTML = statusMessage;

        } catch (error) {
            console.error('Season search error:', error);
            seasonStatus.innerHTML = `<span class="text-red-500">Error: ${error.message}</span>`;
        } finally {
            seasonSearchBtn.disabled = false;
        }
    }

    // Drag & Drop
    function handleDragOver(e) { e.preventDefault(); }

    function handleDrop(e, destination) {
        e.preventDefault();
        if (!draggedItem) return;
        // If dropping into the same container from which it was dragged,
        // we must first remove it to calculate the correct new index.
        // However, if we remove it first, we might mess up if the code relies on indices for other things.
        // But since `pool` and `items` are arrays of objects, removing by ID is safe.

        // 1. Remove item from source
        if (draggedFrom === 'pool') {
            pool = pool.filter(i => i.id !== draggedItem.id);
        } else if (typeof draggedFrom === 'object') {
            const sourceTier = tiers[draggedFrom.tierIndex];
            sourceTier.items = sourceTier.items.filter(i => i.id !== draggedItem.id);
        }

        // 2. Add item to destination at specific index
        if (destination === 'pool') {
            // For pool, just push to end (or we could implement sorting later)
            pool.push(draggedItem);
        } else if (typeof destination === 'object') {
            const destTier = tiers[destination.tierIndex];

            // Find insertion index based on mouse position
            // We need to look at the DOM elements in the destination tier
            // The container for items in a tier is the .items div inside the .box
            // In renderTiers(), we set the id or class or reference?
            // Actually, handledrop is called via event listener which passes `e`.
            // `e.target` might be the container or an item.
            // It's safest to query the specific tier container from the DOM.

            // Since we re-render on every drop, we need to find the specific tier container element again.
            // tiers in DOM are children of tierContainer.
            const tierBox = tierContainer.children[destination.tierIndex];
            const itemsContainer = tierBox.querySelector('.items');

            // Get all item elements in the destination container
            // Note: draggedItem's original DOM element might still be there or ghosted, 
            // but we are interested in the *static* positions of *other* elements.
            const itemElements = Array.from(itemsContainer.children).filter(el => {
                // Exclude the element being dragged if it's currently in this container (visual ghost)
                // But since we are in 'drop', the native drag operation is ending.
                // HTML5 dnd ghost is not a real DOM element we usually worry about here unless we made a custom one.
                // The issue is that the element we started dragging is still in the DOM until we re-render.
                // But we can just calculate based on geometry.
                return el.querySelector('img').src !== draggedItem.img;
            });

            let insertIndex = itemElements.length; // Default to end

            for (let i = 0; i < itemElements.length; i++) {
                const rect = itemElements[i].getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;

                // If mouse is to the left of the item's center, insert before this item
                if (e.clientX < centerX) {
                    insertIndex = i;
                    break;
                }
            }

            destTier.items.splice(insertIndex, 0, draggedItem);
        }

        draggedItem = null;
        draggedFrom = null;
        renderTiers();
        renderPool();
    }

    // Persistence
    function saveState() {
        localStorage.setItem('aniTierList_tiers', JSON.stringify(tiers));
        localStorage.setItem('aniTierList_pool', JSON.stringify(pool));
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fas fa-check mr-2"></i>SAVED';
        saveBtn.classList.add('bg-neon-blue', 'text-black');
        saveBtn.classList.remove('text-neon-blue');
        setTimeout(() => {
            saveBtn.innerHTML = originalText;
            saveBtn.classList.remove('bg-neon-blue', 'text-black');
            saveBtn.classList.add('text-neon-blue');
        }, 1000);
    }

    function loadState() {
        const savedTiers = localStorage.getItem('aniTierList_tiers');
        const savedPool = localStorage.getItem('aniTierList_pool');
        if (savedTiers) tiers = JSON.parse(savedTiers);
        if (savedPool) pool = JSON.parse(savedPool);
    }

    function clearRankedTiers() {
        if (!confirm('Are you sure you want to clear all ranked items? This cannot be undone.')) return;
        tiers.forEach(tier => tier.items = []);
        saveState();
        renderTiers();
    }

    function clearUnrankedPool() {
        if (!confirm('Are you sure you want to clear the unranked pool? This cannot be undone.')) return;
        pool = [];
        saveState();
        renderPool();
    }

    // Helper to update button states
    function updateTypeButtons() {
        const isAnime = searchType === 'ANIME';

        // Search Tab Buttons
        // Search Tab Buttons - Reset
        [typeAnimeBtn, typeMangaBtn].forEach(btn => {
            if (btn) {
                btn.classList.remove('bg-neon-blue', 'text-black');
                btn.classList.add('text-neon-blue', 'hover:bg-neon-blue/20');
            }
        });

        if (typeCharacterBtn) {
            typeCharacterBtn.classList.remove('bg-neon-pink', 'text-black');
            typeCharacterBtn.classList.add('text-neon-pink', 'hover:bg-neon-pink/20');
        }

        if (searchType === 'ANIME') {
            typeAnimeBtn.classList.add('bg-neon-blue', 'text-black');
            typeAnimeBtn.classList.remove('text-neon-blue', 'hover:bg-neon-blue/20');
        } else if (searchType === 'MANGA') {
            typeMangaBtn.classList.add('bg-neon-blue', 'text-black');
            typeMangaBtn.classList.remove('text-neon-blue', 'hover:bg-neon-blue/20');
        } else if (searchType === 'CHARACTER') {
            typeCharacterBtn.classList.add('bg-neon-pink', 'text-black');
            typeCharacterBtn.classList.remove('text-neon-pink', 'hover:bg-neon-pink/20');
        }

        // Sync Tab Buttons
        if (isAnime) {
            typeAnimeSyncBtn.classList.add('bg-neon-blue', 'text-black');
            typeAnimeSyncBtn.classList.remove('text-neon-blue', 'hover:bg-neon-blue/20');
            typeMangaSyncBtn.classList.remove('bg-neon-blue', 'text-black');
            typeMangaSyncBtn.classList.add('text-neon-blue', 'hover:bg-neon-blue/20');
        } else {
            typeMangaSyncBtn.classList.add('bg-neon-blue', 'text-black');
            typeMangaSyncBtn.classList.remove('text-neon-blue', 'hover:bg-neon-blue/20');
            typeAnimeSyncBtn.classList.remove('bg-neon-blue', 'text-black');
            typeAnimeSyncBtn.classList.add('text-neon-blue', 'hover:bg-neon-blue/20');
        }

        // Toggle Visibility
        if (searchType === 'CHARACTER') {
            characterSearchModeToggle.classList.remove('hidden');
        } else {
            characterSearchModeToggle.classList.add('hidden');
        }

        // Update Search Instructions Note
        const searchNote = document.getElementById('search-instructions-note');
        if (searchNote) {
            if (searchType === 'CHARACTER') {
                searchNote.innerHTML = '<i class="fas fa-info-circle mr-1"></i>Refresh the search when you switch between Character Name/Series Title.';
                searchNote.className = 'search-note text-xs text-neon-pink mt-2 mb-4 italic';
            } else {
                searchNote.innerHTML = '<i class="fas fa-info-circle mr-1"></i>Refresh the search when you switch between anime, manga, or characters.';
                searchNote.className = 'search-note text-xs text-gray-400 mt-2 mb-4 italic';
            }
        }
    }

    // Helper to set active tab styling
    function setActiveTab(tab) {
        const tabs = [tabSearch, tabSync, tabSeasons];
        const panels = [panelSearch, panelSync, panelSeasons];

        tabs.forEach((t, i) => {
            if (t === tab) {
                t.classList.add('border-b-2', 'border-neon-blue', 'bg-neon-blue/10', 'text-neon-blue');
                t.classList.remove('text-gray-400');
                panels[i].classList.remove('hidden');
            } else {
                t.classList.remove('border-b-2', 'border-neon-blue', 'bg-neon-blue/10', 'text-neon-blue');
                t.classList.add('text-gray-400');
                panels[i].classList.add('hidden');
            }
        });
    }

    // Helper to clear results on tab switch
    function clearAllResults() {
        // Clear containers
        if (searchResultsContainer) searchResultsContainer.innerHTML = '';
        if (syncResultsContainer) syncResultsContainer.innerHTML = '';
        if (seasonResultsContainer) seasonResultsContainer.innerHTML = '';

        // Hide Filter Controls
        if (globalFilterControls) globalFilterControls.style.display = 'none';
        if (globalFilterControlsSync) globalFilterControlsSync.style.display = 'none';
        if (globalFilterControlsSeasons) globalFilterControlsSeasons.style.display = 'none';

        // Reset State
        currentResults = [];
    }

    // Event Listeners
    function setupEventListeners() {
        addTierBtn.addEventListener('click', () => {
            if (tiers.length < 7) {
                const nextConfig = tierConfig[tiers.length];
                tiers.push({ name: nextConfig.name, color: nextConfig.color, items: [] });
                renderTiers();
            }
        });
        remTierBtn.addEventListener('click', () => {
            if (tiers.length > 0) {
                const removed = tiers.pop();
                pool.push(...removed.items);
                renderTiers();
                renderPool();
            }
        });
        poolItems.addEventListener('dragover', handleDragOver);
        poolItems.addEventListener('drop', (e) => handleDrop(e, 'pool'));

        // Tab switching
        tabSearch.addEventListener('click', () => {
            clearAllResults();
            activeTab = 'search';
            setActiveTab(tabSearch);
        });

        tabSync.addEventListener('click', () => {
            clearAllResults();
            activeTab = 'sync';
            setActiveTab(tabSync);
        });

        tabSeasons.addEventListener('click', () => {
            clearAllResults();
            activeTab = 'seasons';
            setActiveTab(tabSeasons);
        });

        const debouncedSearch = debounce(performSearch, 500);

        // Real-time search
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.trim();
            if (query.length > 2) {
                debouncedSearch();
            } else {
                clearAllResults();
            }
        });

        // Optional: Re-purpose the button to trigger an immediate search
        searchBtn.addEventListener('click', () => {
            const query = searchInput.value.trim();
            if (query.length > 2) {
                performSearch();
            }
        });

        typeAnimeBtn.addEventListener('click', () => {
            searchType = 'ANIME';
            updateFormatFilterOptions('ANIME');
            updateTypeButtons();
        });

        typeMangaBtn.addEventListener('click', () => {
            searchType = 'MANGA';
            updateFormatFilterOptions('MANGA');
            updateTypeButtons();
        });

        typeCharacterBtn.addEventListener('click', () => {
            searchType = 'CHARACTER';
            updateFormatFilterOptions('CHARACTER');
            updateTypeButtons();
        });

        // Character Search Mode Toggle
        modeCharacterNameBtn.addEventListener('click', () => {
            characterSearchMode = 'NAME';
            modeCharacterNameBtn.classList.add('bg-neon-pink', 'text-black');
            modeCharacterNameBtn.classList.remove('text-neon-pink', 'hover:bg-neon-pink/20');
            modeSeriesTitleBtn.classList.remove('bg-neon-pink', 'text-black');
            modeSeriesTitleBtn.classList.add('text-neon-pink', 'hover:bg-neon-pink/20');
            searchInput.placeholder = 'Search Character Name...';
        });

        modeSeriesTitleBtn.addEventListener('click', () => {
            characterSearchMode = 'SERIES';
            modeSeriesTitleBtn.classList.add('bg-neon-pink', 'text-black');
            modeSeriesTitleBtn.classList.remove('text-neon-pink', 'hover:bg-neon-pink/20');
            modeCharacterNameBtn.classList.remove('bg-neon-pink', 'text-black');
            modeCharacterNameBtn.classList.add('text-neon-pink', 'hover:bg-neon-pink/20');
            searchInput.placeholder = 'Enter Series Title (e.g. Naruto)...';
        });

        typeAnimeSyncBtn.addEventListener('click', () => {
            searchType = 'ANIME';
            updateFormatFilterOptions('ANIME');
            updateTypeButtons();
        });

        typeMangaSyncBtn.addEventListener('click', () => {
            searchType = 'MANGA';
            updateFormatFilterOptions('MANGA');
            updateTypeButtons();
        });

        syncBtn.addEventListener('click', syncUserList);
        seasonSearchBtn.addEventListener('click', handleSeasonSearch);
        // exportBtn listener is at end of file
        saveBtn.addEventListener('click', saveState);
        clearRankedTiersBtn.addEventListener('click', clearRankedTiers);
        clearUnrankedPoolBtn.addEventListener('click', clearUnrankedPool);

        // Settings modal
        settingsBtn.addEventListener('click', openSettingsModal);
        closeSettingsBtn.addEventListener('click', closeSettingsModal);
        saveSettingsBtn.addEventListener('click', saveSettings);
        resetSettingsBtn.addEventListener('click', resetSettings);
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) closeSettingsModal();
        });

        // Search tab filters
        filterSortBy.addEventListener('change', () => {
            if (searchType === 'CHARACTER') {
                handleCharacterSearch();
            } else {
                applyFiltersAndSort();
            }
        });
        filterSortDirection.addEventListener('change', () => {
            if (searchType === 'CHARACTER') {
                handleCharacterSearch();
            } else {
                applyFiltersAndSort();
            }
        });
        filterFormat.addEventListener('change', () => {
            if (searchType === 'CHARACTER') {
                handleCharacterSearch();
            } else {
                applyFiltersAndSort();
            }
        });
        filterStatus.addEventListener('change', applyFiltersAndSort);

        // Sync tab filters
        filterSortBySync.addEventListener('change', applyFiltersAndSort);
        filterSortDirectionSync.addEventListener('change', applyFiltersAndSort);
        filterFormatSync.addEventListener('change', applyFiltersAndSort);
        filterStatusSync.addEventListener('change', applyFiltersAndSort);

        // Seasons tab filters
        filterSortBySeasons.addEventListener('change', applyFiltersAndSort);
        filterSortDirectionSeasons.addEventListener('change', applyFiltersAndSort);
        filterFormatSeasons.addEventListener('change', applyFiltersAndSort);

        // Title filter inputs (local search)
        filterTitleInput.addEventListener('input', applyFiltersAndSort);
        filterTitleInputSync.addEventListener('input', applyFiltersAndSort);
        filterTitleInputSeasons.addEventListener('input', applyFiltersAndSort);
    }

    // Filtering & Sorting
    function updateFormatFilterOptions(dataType) {
        let options;
        if (dataType === 'CHARACTER') {
            options = CHARACTER_GENDER_OPTIONS;
            // Update sort options for characters
            filterSortBy.innerHTML = '';
            CHARACTER_SORT_OPTIONS.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.value;
                option.textContent = opt.text;
                filterSortBy.appendChild(option);
            });
            filterStatus.style.display = 'none';
        } else {
            options = (dataType === 'MANGA') ? MANGA_FORMATS : ANIME_FORMATS;
            // Reset sort options for Anime/Manga
            filterSortBy.innerHTML = `
            <option value="title">Title</option>
            <option value="popularity">Popularity</option>
            <option value="averageScore">Score</option>
            <option value="trending">Trending</option>
            <option value="id">Date Added</option>
            <option value="startDate">Release Date</option>
        `;
            filterStatus.style.display = 'block';
        }

        [filterFormat, filterFormatSync, filterFormatSeasons].forEach(select => {
            select.innerHTML = '';
            options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.value;
                option.textContent = opt.text;
                select.appendChild(option);
            });
        });
    }

    function applyFiltersAndSort() {
        let results = [...currentResults];
        let sortValue, sortDir, formatValue, statusValue, titleFilter;

        if (activeTab === 'sync') {
            sortValue = filterSortBySync.value;
            sortDir = filterSortDirectionSync.value.toUpperCase();
            formatValue = filterFormatSync.value;
            statusValue = filterStatusSync.value;
            titleFilter = filterTitleInputSync.value.toLowerCase().trim();
        } else if (activeTab === 'seasons') {
            sortValue = filterSortBySeasons.value;
            sortDir = filterSortDirectionSeasons.value.toUpperCase();
            formatValue = filterFormatSeasons.value;
            statusValue = 'all';
            titleFilter = filterTitleInputSeasons.value.toLowerCase().trim();
        } else {
            sortValue = filterSortBy.value;
            sortDir = filterSortDirection.value.toUpperCase();
            formatValue = filterFormat.value;
            statusValue = filterStatus.value;
            titleFilter = filterTitleInput.value.toLowerCase().trim();
        }

        // Title filter
        if (titleFilter) {
            results = results.filter(item => {
                const title = (item.title.english || item.title.romaji || '').toLowerCase();
                return title.includes(titleFilter);
            });
        }

        if (formatValue !== 'all') results = results.filter(item => item.format === formatValue);
        if (activeTab === 'sync' && statusValue !== 'all') results = results.filter(item => item.userStatus === statusValue);

        results.sort((a, b) => {
            let valA, valB, comparison = 0;
            switch (sortValue) {
                case 'title':
                    valA = (a.title.english || a.title.romaji || '').toLowerCase();
                    valB = (b.title.english || b.title.romaji || '').toLowerCase();
                    comparison = valA.localeCompare(valB);
                    break;
                case 'popularity': comparison = (a.popularity || 0) - (b.popularity || 0); break;
                case 'averageScore': comparison = (a.averageScore || 0) - (b.averageScore || 0); break;
                case 'trending': comparison = (a.trending || 0) - (b.trending || 0); break;
                case 'startDate':
                    valA = (a.startDate.year || 0);
                    valB = (b.startDate.year || 0);
                    comparison = valA - valB;
                    break;
                case 'id': comparison = a.id - b.id; break;
            }
            return sortDir === 'DESC' ? -comparison : comparison;
        });

        renderSearchResults(results);
    }

    // ============ SETTINGS MODAL FUNCTIONS ============

    // Open the settings modal and populate it with current tier config
    function openSettingsModal() {
        populateSettingsModal();
        settingsModal.classList.remove('hidden');
    }

    // Close the settings modal
    function closeSettingsModal() {
        settingsModal.classList.add('hidden');
    }

    // Populate the settings modal with current tier configuration
    function populateSettingsModal() {
        tierSettingsContainer.innerHTML = '';

        tierConfig.forEach((tier, index) => {
            const row = document.createElement('div');
            row.className = 'tier-setting-row';
            row.innerHTML = `
            <div class="tier-color-preview" style="background-color: ${tier.color}"></div>
            <input type="text" class="tier-name-input" data-tier-id="${tier.id}" value="${tier.name}" maxlength="3">
            <input type="color" class="tier-color-input" data-tier-id="${tier.id}" value="${tier.color}">
        `;

            // Update color preview when color changes
            const colorInput = row.querySelector('.tier-color-input');
            const colorPreview = row.querySelector('.tier-color-preview');
            colorInput.addEventListener('input', (e) => {
                colorPreview.style.backgroundColor = e.target.value;
            });

            tierSettingsContainer.appendChild(row);
        });
    }

    // Save settings from modal to tierConfig and localStorage
    function saveSettings() {
        const nameInputs = tierSettingsContainer.querySelectorAll('.tier-name-input');
        const colorInputs = tierSettingsContainer.querySelectorAll('.tier-color-input');

        nameInputs.forEach((input, index) => {
            tierConfig[index].name = input.value || tierConfig[index].name;
        });

        colorInputs.forEach((input, index) => {
            tierConfig[index].color = input.value;
        });

        // Persist to localStorage
        localStorage.setItem('aniTierList_tierConfig', JSON.stringify(tierConfig));

        // Update existing tiers with new names and colors (preserve items)
        tiers.forEach((tier, index) => {
            if (tierConfig[index]) {
                tier.name = tierConfig[index].name;
                tier.color = tierConfig[index].color;
            }
        });

        // Re-render the tier list
        renderTiers();

        // Close modal
        closeSettingsModal();

        // Visual feedback
        saveSettingsBtn.innerHTML = '<i class="fas fa-check mr-2"></i>Saved!';
        setTimeout(() => {
            saveSettingsBtn.innerHTML = '<i class="fas fa-save mr-2"></i>Save Settings';
        }, 1000);
    }

    // Reset tierConfig to defaults
    function resetSettings() {
        if (!confirm('Reset all tier labels and colors to defaults?')) return;

        tierConfig = JSON.parse(JSON.stringify(DEFAULT_TIER_CONFIG));
        localStorage.setItem('aniTierList_tierConfig', JSON.stringify(tierConfig));

        // Update existing tiers
        tiers.forEach((tier, index) => {
            if (tierConfig[index]) {
                tier.name = tierConfig[index].name;
                tier.color = tierConfig[index].color;
            }
        });

        renderTiers();
        populateSettingsModal();
    }

    // Character Search - Full API Implementation
    async function handleCharacterSearch() {
        const query = searchInput.value;
        const gender = filterFormat.value; // Using format filter as gender
        const sortValue = filterSortBy.value;
        const sortDir = filterSortDirection.value;

        if (!query) return;

        if (characterSearchMode === 'SERIES') {
            fetchSeriesForSelection(query);
            return;
        }

        // Default: Character Name Search
        searchResultsContainer.innerHTML = '<div class="col-span-2 text-center text-neon-blue animate-pulse">Searching Characters...</div>';

        // Map sort options to API enums
        let sort = 'SEARCH_MATCH';
        if (sortValue === 'FAVOURITES') sort = 'FAVOURITES';
        if (sortValue === 'ID') sort = 'ID';

        // Append direction (AniList uses _DESC for descending)
        if (sortDir === 'DESC' && sort !== 'SEARCH_MATCH') sort += '_DESC';

        const gqlQuery = `query ($search: String, $page: Int, $sort: [CharacterSort]) {
        Page(page: $page, perPage: 50) {
            characters(search: $search, sort: $sort) {
                id
                name { full native }
                image { large }
                gender
                favourites
                media(sort: POPULARITY_DESC, perPage: 1) {
                    nodes { title { romaji english } }
                }
            }
        }
    }`;

        try {
            const response = await fetch(ANILIST_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({
                    query: gqlQuery,
                    variables: {
                        search: query,
                        page: 1,
                        sort: [sort]
                    }
                })
            });

            const data = await response.json();
            if (data.errors) throw new Error(data.errors[0].message);

            let results = data.data.Page.characters;

            // Client-side Gender Filter
            if (gender !== 'all') {
                results = results.filter(char => char.gender === gender);
            }

            // Normalize for renderSearchResults
            const normalizedResults = results.map(char => ({
                id: char.id,
                title: { english: char.name.full, romaji: char.name.native },
                coverImage: { extraLarge: char.image.large },
                startDate: { year: null },
                format: 'CHARACTER',
                popularity: char.favourites,
                averageScore: null,
                trending: null,
                userStatus: null,
                gender: char.gender,
                description: char.media.nodes[0] ? (char.media.nodes[0].title.english || char.media.nodes[0].title.romaji) : ''
            }));

            currentResults = normalizedResults;
            globalFilterControls.style.display = 'flex';
            renderSearchResults(normalizedResults);

        } catch (error) {
            console.error(error);
            searchResultsContainer.innerHTML = `<div class="col-span-2 text-center text-red-500">Error: ${error.message}</div>`;
        }
    }

    // Series Selection Flow
    async function fetchSeriesForSelection(query) {
        searchResultsContainer.innerHTML = '<div class="col-span-2 text-center text-neon-pink animate-pulse">Searching for Series...</div>';

        try {
            const response = await fetch(ANILIST_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ query: ANILIST_SEARCH_SERIES_QUERY, variables: { search: query, type: 'ANIME' } })
            });
            const data = await response.json();
            if (data.errors) throw new Error(data.errors[0].message);

            const results = data.data.Page.media;
            lastSeriesSearchResults = results; // Store for Back button
            renderSeriesSelectionList(results);
        } catch (error) {
            console.error(error);
            searchResultsContainer.innerHTML = `<div class="col-span-2 text-center text-red-500">Error: ${error.message}</div>`;
        }
    }

    function renderSeriesSelectionList(results) {
        searchResultsContainer.innerHTML = '';
        if (!results || results.length === 0) {
            searchResultsContainer.innerHTML = '<div class="col-span-full text-center text-gray-500">No series found</div>';
            return;
        }

        // Add Feedback Text
        const feedback = document.createElement('div');
        feedback.className = 'col-span-full text-center text-neon-pink text-xs mb-2 font-bold animate-pulse';
        feedback.textContent = 'Select a series to view its characters:';
        searchResultsContainer.appendChild(feedback);

        results.forEach(media => {
            const title = media.title.english || media.title.romaji;
            const imgUrl = media.coverImage.extraLarge;
            const card = document.createElement('div');
            card.className = 'search-result-card flex flex-col rounded overflow-hidden group border border-neon-pink/30 hover:border-neon-pink transition-colors';
            card.innerHTML = `
            <div class="relative w-full overflow-hidden">
                <img src="${imgUrl}" class="w-full aspect-[2/3] object-cover group-hover:scale-110 transition-transform duration-500">
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2">
                    <button class="select-series-btn bg-neon-pink text-black font-bold px-3 py-1 text-[10px] uppercase hover:bg-white hover:text-neon-pink transition-colors shadow-[0_0_10px_#ff00ff]">
                        <i class="fas fa-check mr-1"></i> SELECT
                    </button>
                </div>
            </div>
            <div class="p-2 flex flex-col flex-1 bg-black/40">
                <div class="text-xs font-bold text-neon-pink truncate mb-1" title="${title}">${title}</div>
                <div class="text-[10px] text-gray-400">${media.startDate.year || '?'} • ${media.format}</div>
            </div>
        `;

            // Click handler for both card and button
            const selectionHandler = () => fetchCharactersByMediaId(media.id, title);
            card.addEventListener('click', selectionHandler);

            const selectBtn = card.querySelector('.select-series-btn');
            selectBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                selectionHandler();
            });

            searchResultsContainer.appendChild(card);
        });
    }

    async function fetchCharactersByMediaId(mediaId, mediaTitle) {
        searchResultsContainer.innerHTML = `<div class="col-span-2 text-center text-neon-pink animate-pulse">Fetching Characters for "${mediaTitle}"...</div>`;

        // Check gender filter
        const gender = filterFormat.value;

        try {
            const response = await fetch(ANILIST_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ query: ANILIST_CHARACTERS_BY_ID_QUERY, variables: { id: mediaId, page: 1 } })
            });

            const data = await response.json();
            if (data.errors) throw new Error(data.errors[0].message);

            // --- Data Normalization (CRITICAL STEP) ---
            // We must map 'edges' to a flat array.
            // We also map 'edge.role' to the item so it displays correctly.
            const rawEdges = data.data.Media.characters.edges;

            const normalizedResults = rawEdges.map(edge => {
                return {
                    id: edge.node.id,
                    title: { english: edge.node.name.full, romaji: edge.node.name.full }, // Map name to title structure
                    coverImage: { extraLarge: edge.node.image.large }, // Match expected image structure
                    format: 'CHARACTER', // Internal type
                    description: `${mediaTitle} (${edge.role})`, // Use role in description
                    gender: edge.node.gender, // Keep gender
                    favourites: edge.node.favourites,
                    popularity: edge.node.favourites, // for sorting
                    userStatus: null,
                    startDate: { year: null }
                };
            });

            // Client-side Gender Filter (if gender data exists)
            let finalResults = normalizedResults;
            if (gender !== 'all') {
                finalResults = normalizedResults.filter(char => char.gender === gender);
            }

            currentResults = finalResults;
            globalFilterControls.style.display = 'flex';
            renderSearchResults(finalResults);

            // Add Back Button into the search container
            if (lastSeriesSearchResults && lastSeriesSearchResults.length > 0) {
                const backBtnContainer = document.createElement('div');
                backBtnContainer.className = 'col-span-full mb-2 flex justify-start';
                backBtnContainer.innerHTML = `
                    <button id="back-to-series-btn" class="text-neon-pink hover:text-white flex items-center gap-2 text-xs font-bold uppercase transition-colors">
                        <i class="fas fa-arrow-left"></i> Back to Series Results
                    </button>
                `;
                // Insert at the VERY top (before the newly rendered cards)
                searchResultsContainer.insertBefore(backBtnContainer, searchResultsContainer.firstChild);

                const backBtn = document.getElementById('back-to-series-btn');
                if (backBtn) {
                    backBtn.addEventListener('click', () => {
                        renderSeriesSelectionList(lastSeriesSearchResults);
                    });
                }
            }

        } catch (error) {
            console.error(error);
            searchResultsContainer.innerHTML = `<div class="col-span-2 text-center text-red-500">Error: ${error.message}</div>`;
        }
    }




    // Layout Toggle Function
    function toggleLayoutView(container, button) {
        const isListView = container.classList.toggle('list-view');
        if (isListView) {
            button.classList.add('list-active');
            button.innerHTML = '<i class="fas fa-th-large"></i>';
            button.title = 'Switch to Grid View';
        } else {
            button.classList.remove('list-active');
            button.innerHTML = '<i class="fas fa-th"></i>';
            button.title = 'Switch to List View';
        }
    }

    // Layout Toggle Event Listeners
    if (layoutToggleBtn) {
        layoutToggleBtn.addEventListener('click', () => {
            toggleLayoutView(searchResultsContainer, layoutToggleBtn);
        });
    }

    if (layoutToggleBtnSync) {
        layoutToggleBtnSync.addEventListener('click', () => {
            toggleLayoutView(syncResultsContainer, layoutToggleBtnSync);
        });
    }

    if (layoutToggleBtnSeasons) {
        layoutToggleBtnSeasons.addEventListener('click', () => {
            toggleLayoutView(seasonResultsContainer, layoutToggleBtnSeasons);
        });
    }

    // ============================================================
    // PNG Export Functionality for Tierlist
    // ============================================================

    /**
     * Converts an image URL to a base64 data URL to avoid CORS issues
     */
    async function convertImageToDataURL(url) {
        return new Promise(async (resolve) => {
            try {
                // Try direct approach first
                const img = new Image();
                img.crossOrigin = 'anonymous';

                const directLoad = new Promise((resolveImg) => {
                    img.onload = () => {
                        try {
                            const canvas = document.createElement('canvas');
                            canvas.width = img.width;
                            canvas.height = img.height;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0);
                            const dataUrl = canvas.toDataURL('image/png');
                            console.log('Image converted successfully:', url.substring(0, 50));
                            resolveImg(dataUrl);
                        } catch (e) {
                            console.warn('Canvas conversion failed:', e);
                            resolveImg(null);
                        }
                    };
                    img.onerror = (e) => {
                        console.warn('Image load failed:', e);
                        resolveImg(null);
                    };
                    img.src = url;
                });

                const result = await Promise.race([
                    directLoad,
                    new Promise(r => setTimeout(() => r(null), 5000)) // 5s timeout
                ]);

                if (result) {
                    resolve(result);
                    return;
                }

                console.log('Direct load failed, trying CORS proxy for:', url.substring(0, 50));

                // If direct approach fails, use fetch with CORS proxy
                const corsProxy = 'https://corsproxy.io/?';
                const response = await fetch(corsProxy + encodeURIComponent(url));
                const blob = await response.blob();

                const reader = new FileReader();
                reader.onloadend = () => {
                    console.log('CORS proxy conversion successful');
                    resolve(reader.result);
                };
                reader.onerror = () => resolve(url);
                reader.readAsDataURL(blob);

            } catch (e) {
                console.warn('Failed to convert image:', url, e);
                resolve(url);
            }
        });
    }

    /**
     * Exports the tierlist as a PNG image
     */
    async function exportTierListAsPNG() {
        if (!tierContainer || tiers.every(t => t.items.length === 0)) {
            alert('No items in tierlist to export!');
            return;
        }

        if (typeof html2canvas !== 'function') {
            alert('MODULE_MISSING: html2canvas');
            return;
        }

        const originalLabel = exportBtn.innerHTML;
        exportBtn.disabled = true;
        exportBtn.innerHTML = '<i class="fas fa-cog fa-spin"></i> PROCESSING...';

        try {
            // Get all images in the tierlist
            const images = tierContainer.querySelectorAll('.album img');
            const originalSources = [];

            // Convert external images to base64 data URLs to avoid CORS issues
            let processedCount = 0;
            for (const img of images) {
                const src = img.src;
                if (src && src.startsWith('http')) {
                    processedCount++;
                    exportBtn.innerHTML = `<i class="fas fa-cog fa-spin"></i> ${processedCount}/${images.length}...`;

                    originalSources.push({
                        img,
                        original: src
                    });

                    // Convert to data URL
                    const dataURL = await convertImageToDataURL(src);
                    if (dataURL && dataURL.startsWith('data:')) {
                        img.src = dataURL;
                    }
                }
            }

            // Wait for images to render
            await new Promise(resolve => setTimeout(resolve, 500));

            exportBtn.innerHTML = '<i class="fas fa-cog fa-spin"></i> RENDERING...';

            // Clone the tier container for export (to avoid affecting the original)
            const clone = tierContainer.cloneNode(true);
            clone.style.position = 'absolute';
            clone.style.left = '-9999px';
            clone.style.backgroundColor = '#17212b';
            document.body.appendChild(clone);

            // Copy image sources to clone
            const cloneImages = clone.querySelectorAll('.album img');
            const origImages = tierContainer.querySelectorAll('.album img');
            cloneImages.forEach((cloneImg, i) => {
                if (origImages[i]) {
                    cloneImg.src = origImages[i].src;
                }
            });

            await new Promise(resolve => setTimeout(resolve, 300));

            // Render with html2canvas (Scale 2 for better quality)
            const canvas = await html2canvas(clone, {
                backgroundColor: '#17212b',
                scale: 2,
                logging: false,
                useCORS: true,
                allowTaint: true
            });

            // Remove clone
            document.body.removeChild(clone);

            // Restore original sources
            originalSources.forEach(({ img, original }) => {
                img.src = original;
            });

            // Create download link
            const link = document.createElement('a');
            link.download = `ANI_TIERLIST_${new Date().toISOString().slice(0, 10)}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            // Success feedback
            exportBtn.innerHTML = '<i class="fas fa-check"></i> SUCCESS!';
            setTimeout(() => {
                exportBtn.innerHTML = originalLabel;
                exportBtn.disabled = false;
            }, 2000);

        } catch (error) {
            console.error('Error exporting tierlist:', error);
            alert('EXPORT_FAILED: ' + error.message);
            exportBtn.innerHTML = originalLabel;
            exportBtn.disabled = false;
        }
    }

    // Export button event listener
    if (exportBtn) {
        exportBtn.addEventListener('click', exportTierListAsPNG);
    }


});
