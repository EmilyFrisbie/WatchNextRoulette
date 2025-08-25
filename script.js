// API Configuration
const API_KEY = 'a27a4cb0b4msh037f9e56e65dbb7p1b1585jsnb62d5e0917c8';
const API_BASE_URL = 'https://streaming-availability.p.rapidapi.com';

// Movie memory to prevent recent duplicates
let recentlyShownMovies = [];
const MAX_RECENT_MOVIES = 25;

// Use consistent sorting to get reliable results
const sortingOptions = [
    'popularity_1year'  // Use only one reliable sorting method
];

// DOM Elements
const spinButton = document.getElementById('spinButton');
const movieResult = document.getElementById('movieResult');
const genreFilter = document.getElementById('genreFilter');
const ratingFilter = document.getElementById('ratingFilter');
const decadeFilter = document.getElementById('decadeFilter');
const languageFilter = document.getElementById('languageFilter');

// Movie result elements
const moviePoster = document.getElementById('moviePoster');
const movieTitle = document.getElementById('movieTitle');
const movieYear = document.getElementById('movieYear');
const movieRating = document.getElementById('movieRating');
const movieDescription = document.getElementById('movieDescription');
const streamingServices = document.getElementById('streamingServices');

// Service mapping - maps checkbox values to API service IDs
const serviceMapping = {
    'netflix': 'netflix',
    'hulu': 'hulu',
    'prime': 'prime',
    'disney': 'disney',
    'hbo': 'hbo',
    'apple': 'apple',
    'paramount': 'paramount',
    'peacock': 'peacock'
};

// Genre mapping for API
const genreMapping = {
    'action': 'action',
    'comedy': 'comedy',
    'drama': 'drama',
    'horror': 'horror',
    'romance': 'romance',
    'thriller': 'thriller',
    'sci-fi': 'scifi'
};

// Add movie to recently shown list
function addToRecentlyShown(movieId) {
    // Add to beginning of array
    recentlyShownMovies.unshift(movieId);
    
    // Keep only last 25 movies
    if (recentlyShownMovies.length > MAX_RECENT_MOVIES) {
        recentlyShownMovies = recentlyShownMovies.slice(0, MAX_RECENT_MOVIES);
    }
    
    console.log(`Added movie to recent list. Recent count: ${recentlyShownMovies.length}`);
}

// Check if movie was recently shown
function wasRecentlyShown(movieId) {
    return recentlyShownMovies.includes(movieId);
}

// Filter out recently shown movies
function filterOutRecentMovies(movies) {
    const filtered = movies.filter(movie => !wasRecentlyShown(movie.id));
    console.log(`Filtered ${movies.length - filtered.length} recent movies. ${filtered.length} options remaining.`);
    return filtered;
}

// Get random sorting option for API variety
function getRandomSorting() {
    const randomSort = sortingOptions[Math.floor(Math.random() * sortingOptions.length)];
    console.log(`Using random sorting: ${randomSort}`);
    return randomSort;
}
function getSelectedServices() {
    const checkboxes = document.querySelectorAll('.streaming-services input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => serviceMapping[cb.value]).filter(Boolean);
}

// Get filters
function getFilters() {
    return {
        genre: genreMapping[genreFilter.value] || '',
        rating: ratingFilter.value || '',
        decade: decadeFilter.value || '',
        language: languageFilter.value || ''
    };
}

// Search for movies using the API with enhanced randomization
async function searchMovies(services, filters) {
    try {
        // Build the catalogs parameter (service.subscription for subscription-only content)
        const catalogs = services.map(service => `${service}.subscription`).join(',');
        
        // Get random sorting for variety
        const randomSort = getRandomSorting();
        
        // Build query parameters with random sorting
        const params = new URLSearchParams({
            country: 'us',
            catalogs: catalogs,
            output_language: 'en',
            order_by: randomSort,
            desc: 'true'
        });

        // Add genre filter if selected
        if (filters.genre) {
            params.append('genres', filters.genre);
        }

        // Add year filter if decade selected
        if (filters.decade) {
            const endYear = parseInt(filters.decade) + 9;
            params.append('year_min', filters.decade);
            params.append('year_max', endYear.toString());
        }

        // Add language filter if selected
        if (filters.language) {
            params.append('show_original_language', filters.language);
        }

        console.log('Searching with URL:', `${API_BASE_URL}/shows/search/filters?${params}`);

        const response = await fetch(`${API_BASE_URL}/shows/search/filters?${params}`, {
            method: 'GET',
            headers: {
                'X-RapidAPI-Key': API_KEY,
                'X-RapidAPI-Host': 'streaming-availability.p.rapidapi.com'
            }
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('API Response:', data);
        console.log(`Initial API results: ${data.shows ? data.shows.length : 0} movies`);
        
        // Log first few movies with their ratings
        if (data.shows && data.shows.length > 0) {
            console.log('First few movies from API:');
            data.shows.slice(0, 5).forEach((show, index) => {
                console.log(`${index}: ${show.title} - Rating: ${show.rating}`);
            });
        }

        // Filter by rating if specified
        let filteredShows = data.shows || [];
        console.log(`Starting with ${filteredShows.length} shows before rating filter`);
        
        if (filters.rating) {
            const minRating = parseInt(filters.rating); // Use rating as-is (70, 80, 90)
            console.log(`Filtering for ratings >= ${minRating}`);
            
            filteredShows = filteredShows.filter(show => {
                const rating = show.rating || 0; // API rating (like 85 for whatever scale they use)
                const passes = rating >= minRating;
                if (!passes && rating > 85) {
                    console.log(`${show.title} has rating ${rating}, filtered out by ${minRating} threshold`);
                }
                return passes;
            });
            console.log(`Filtered by rating >= ${minRating}. ${filteredShows.length} movies remaining.`);
            
            // Log what passed the rating filter
            if (filteredShows.length > 0) {
                console.log('Movies that passed rating filter:');
                filteredShows.slice(0, 5).forEach((show, index) => {
                    console.log(`${index}: ${show.title} - Rating: ${show.rating}`);
                });
            }
        }

        // Filter out kids/family content for mature audience (very targeted)
        filteredShows = filteredShows.filter(show => {
            const title = (show.title || '').toLowerCase();
            
            // Only filter out very obvious kids content
            const kidsKeywords = ['baby', 'toddler', 'preschool', 'sesame street', 'dora', 'barney', 'teletubbies', 'peppa pig'];
            const hasKidsKeywords = kidsKeywords.some(keyword => title.includes(keyword));
            
            // Keep everything except obvious baby/toddler content
            return !hasKidsKeywords;
        });

        console.log(`Filtered out kids content. ${filteredShows.length} adult-oriented movies remaining.`);

        // Filter out recently shown movies for variety
        const nonRecentMovies = filterOutRecentMovies(filteredShows);
        
        // If we filtered out too many, fall back to full list but still try to avoid most recent ones
        if (nonRecentMovies.length === 0) {
            console.log('No non-recent movies available');
            // If no movies pass filters, inform user rather than showing wrong content
            if (filteredShows.length === 0) {
                return []; // Return empty array - will trigger "no movies found" message
            }
            // If movies exist but all were recent, allow the most recent 5 but keep others
            const veryRecentMovies = recentlyShownMovies.slice(0, 5);
            return filteredShows.filter(movie => !veryRecentMovies.includes(movie.id));
        }

        return nonRecentMovies;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Format movie data for display
function formatMovieData(show) {
    // Get streaming services for this show
    const availableServices = [];
    if (show.streamingOptions && show.streamingOptions.us) {
        show.streamingOptions.us.forEach(option => {
            if (option.type === 'subscription') {
                availableServices.push(option.service.name);
            }
        });
    }

    // Get the best available image
    const posterUrl = show.imageSet?.verticalPoster?.w480 || 
                     show.imageSet?.horizontalPoster?.w720 || 
                     'https://via.placeholder.com/300x450?text=No+Image';

    return {
        title: show.title || 'Unknown Title',
        year: show.releaseYear ? show.releaseYear.toString() : 'Unknown Year',
        rating: show.rating ? `${(show.rating / 10).toFixed(1)}/10 IMDB` : 'No Rating',
        description: show.overview || 'No description available.',
        poster: posterUrl,
        services: availableServices,
        id: show.id // Make sure we include the ID for memory system
    };
}

// Display movie result
function displayMovie(movie) {
    moviePoster.src = movie.poster;
    moviePoster.alt = movie.title;
    movieTitle.textContent = movie.title;
    movieYear.textContent = movie.year;
    movieRating.textContent = movie.rating;
    movieDescription.textContent = movie.description;
    
    // Display streaming services
    streamingServices.innerHTML = '';
    movie.services.forEach(service => {
        const badge = document.createElement('span');
        badge.className = 'streaming-badge';
        badge.textContent = service;
        streamingServices.appendChild(badge);
    });
    
    // Show the result with animation
    movieResult.classList.remove('hidden');
    movieResult.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Main spin function
async function spinForMovie() {
    const selectedServices = getSelectedServices();
    
    if (selectedServices.length === 0) {
        alert('Please select at least one streaming service!');
        return;
    }
    
    // Add spinning animation
    spinButton.classList.add('spinning');
    spinButton.textContent = '🎲 SPINNING... 🎲';
    spinButton.disabled = true;
    
    // Hide previous result
    movieResult.classList.add('hidden');
    
    try {
        const filters = getFilters();
        console.log('Searching for movies with services:', selectedServices, 'and filters:', filters);
        
        const movies = await searchMovies(selectedServices, filters);
        
        if (movies.length === 0) {
            alert('No movies found matching your criteria. Try adjusting your filters or selecting different streaming services!');
        } else {
            // Get a random movie from the results
            console.log(`Choosing from ${movies.length} available movies after all filtering`);
            const randomIndex = Math.floor(Math.random() * movies.length);
            const randomMovie = movies[randomIndex];
            const formattedMovie = formatMovieData(randomMovie);
            
            // Add to recently shown list to prevent repeats (use original movie object ID)
            addToRecentlyShown(randomMovie.id);
            
            console.log(`Selected index ${randomIndex} of ${movies.length} options`);
            console.log('Selected movie from API:', randomMovie.title);
            console.log('Formatted for display:', formattedMovie);
            displayMovie(formattedMovie);
        }
    } catch (error) {
        console.error('Error fetching movies:', error);
        alert('Sorry, there was an error fetching movies. Please try again in a moment!');
    } finally {
        // Reset button
        spinButton.classList.remove('spinning');
        spinButton.textContent = '🎲 CLICK HERE TO SPIN 🎲';
        spinButton.disabled = false;
    }
}

// Event listeners
spinButton.addEventListener('click', spinForMovie);

// Add some fun interactions
document.querySelectorAll('.streaming-services input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
        // Hide result when services change
        movieResult.classList.add('hidden');
    });
});

// Add keyboard support
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !spinButton.disabled) {
        e.preventDefault();
        spinForMovie();
    }
});

// Welcome message
console.log('🎬 Watch Next Roulette loaded with enhanced randomization! Press SPACE or click SPIN to get started!');
