class TVMazeFetcher {
  static BASE_URL = "https://api.tvmaze.com";
  static TIMEOUT = 5000; 

  /**
    search for a tv show on TVMaze
    @param {string} seriesName - name of the show to search for
    @returns {Promise<Object>} - show data with id, name
   */
  static async searchShow(seriesName) {
    try {
      const query = encodeURIComponent(seriesName);
      const url = `${this.BASE_URL}/search/shows?q=${query}`;

      const response = await this.fetchWithTimeout(url, this.TIMEOUT);
      const data = await response.json();

      if (Array.isArray(data) && data.length > 0 && data[0].show) {
        return data[0].show; //returns the best match
      }
      return null;
    } catch (err) {
      console.warn("TVMaze search error:", err);
      return null;
    }
  }

  /**
    get cast for a TV show
    @param {number} showId - TVMaze show ID
    @returns {Promise<Array>} - array of character/actor names
   */
  static async getShowCast(showId) {
    if (!Number.isInteger(showId)) return []; //id goes into the url, numbers only
    try {
      const url = `${this.BASE_URL}/shows/${showId}/cast`;
      const response = await this.fetchWithTimeout(url, this.TIMEOUT);
      const data = await response.json();

      if (Array.isArray(data)) {
        //extracts both character names and actor names
        const names = [];
        
        data.forEach((entry) => {
          if (entry.character && typeof entry.character.name === "string") {
            names.push(entry.character.name.toLowerCase().slice(0, 60));
          }
        });

        return [...new Set(names)]; //we don't need no duplicates
      }
      return [];
    } catch (err) {
      console.warn("TVMaze cast fetch error:", err);
      return [];
    }
  }

  /**
   get episodes for a TV show
   @param {number} showId - TVMaze show ID
   @returns {Promise<Array>} - episode titles and keywords
   */
  static async getShowEpisodes(showId) {
    if (!Number.isInteger(showId)) return [];
    try {
      const url = `${this.BASE_URL}/shows/${showId}/episodes`;
      const response = await this.fetchWithTimeout(url, this.TIMEOUT);
      const data = await response.json();

      if (Array.isArray(data)) {
        const episodes = [];
        
        data.forEach((ep) => {
          if (typeof ep.name === "string") {
            episodes.push(ep.name.toLowerCase().slice(0, 100));
          }
        });

        return [...new Set(episodes)]; //we don't need no duplicates 
      }
      return [];
    } catch (err) {
      console.warn("TVMaze episodes fetch error:", err);
      return [];
    }
  }

  /**
    extracts keywords from text, basically episode summaries
   @param {string} text - text to extract from
   @returns {Array} - keywords
   */
  static extractKeywords(text) {
    if (!text) return [];

    const words = text.toLowerCase().match(/\b\w+\b/g) || [];

    // filter stop words
    const stopwords = new Set([
      "the", "a", "an", "and", "or", "but", "is", "are", "was", "were",
      "be", "being", "have", "has", "had", "do", "does", "did", "will",
      "would", "should", "could", "may", "might", "must", "can", "it",
      "its", "that", "this", "as", "in", "on", "at", "to", "from",
      "by", "for", "with", "about", "into", "through", "during",
    ]);

    return words.filter((w) => w.length > 3 && !stopwords.has(w));
  }

  /**
    get complete show data for spoiler matching
    @param {string} seriesName - show name
    @returns {Promise<Object>} - comprehensive show data
   */
  static async getShowData(seriesName) {
    const searchResult = await this.searchShow(seriesName);

    if (!searchResult) {
      return {
        name: seriesName,
        characters: [],
        episodes: [],
        fetchedAt: new Date().toISOString(),
        found: false,
      };
    }

    const showId = searchResult.id;
    if (!Number.isInteger(showId)) {
      return { name: seriesName, characters: [], episodes: [], fetchedAt: new Date().toISOString(), found: false };
    }
    const cast = await this.getShowCast(showId);
    const episodes = await this.getShowEpisodes(showId);

    return {
      name: typeof searchResult.name==="string" ? searchResult.name.slice(0,100) : seriesName,   // trust nothing from outside
      tvmazeId: showId,
      characters: cast.slice(0, 50),
      episodes: episodes.slice(0, 100), 
      fetchedAt: new Date().toISOString(),
      found: true,
    };
  }

  /**
    fetch with timeout
    @param {string} url - URL to fetch
    @param {number} timeout - timeout in ms
   */
  static async fetchWithTimeout(url, timeout) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeout);
    try {
      const response = await fetch(url, { signal: ctl.signal, credentials: "omit" });
      if (!response.ok) throw new Error(`TVMaze ${response.status}`); //429, 404, 5xx are not data
      return response;
    } finally {
      clearTimeout(timer);
    }
  }
}
