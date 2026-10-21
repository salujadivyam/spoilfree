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

      if (data && data.length > 0) {
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
    try {
      const url = `${this.BASE_URL}/shows/${showId}/cast`;
      const response = await this.fetchWithTimeout(url, this.TIMEOUT);
      const data = await response.json();

      if (data) {
        //extracts both character names and actor names
        const names = [];
        
        data.forEach((entry) => {
          if (entry.character && entry.character.name) {
            names.push(entry.character.name.toLowerCase());
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
    try {
      const url = `${this.BASE_URL}/shows/${showId}/episodes`;
      const response = await this.fetchWithTimeout(url, this.TIMEOUT);
      const data = await response.json();

      if (data) {
        const episodes = [];
        
        data.forEach((ep) => {
          if (ep.name) {
            episodes.push(ep.name.toLowerCase());
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
    const cast = await this.getShowCast(showId);
    const episodes = await this.getShowEpisodes(showId);

    return {
      name: searchResult.name,
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
  static fetchWithTimeout(url, timeout) {
    return Promise.race([
      fetch(url),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("TVMaze fetch timeout")), timeout)
      ),
    ]);
  }
}
