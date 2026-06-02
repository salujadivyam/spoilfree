// watchlist-manager.js
// stores TVMaze data alongside series

class WatchlistManager {
  static STORAGE_KEY = "spoilfree_watchlist";
  static TVMAZE_DATA_KEY = "spoilfree_tvmaze_data"; //stores TVMaze data

  static async init() {
    return new Promise((resolve) => {
      chrome.storage.local.get({ [this.STORAGE_KEY]: [] }, (data) => {
        resolve(data[this.STORAGE_KEY]);
      });
    });
  }

  static async getWatchlist() {
    return new Promise((resolve) => {
      chrome.storage.local.get({ [this.STORAGE_KEY]: [] }, (data) => {
        resolve(data[this.STORAGE_KEY]);
      });
    });
  }

  /**
    adds series to watchlist with TVMaze data
    @param {string} seriesName - name of the series
   */
  static async addSeries(seriesName) {
    if (!seriesName || seriesName.trim().length === 0) return false;

    const watchlist = await this.getWatchlist();
    const normalized = seriesName.trim().toLowerCase();

    if (watchlist.some((item) => item.title.toLowerCase() === normalized)) {
      return false;
    }

    // fetches TVMaze data for this series first to get the ID
    console.log(`Fetching TVMaze data for ${seriesName}...`);
    const tvmazeData = await TVMazeFetcher.getShowData(seriesName);

    const newItem = {
      id: Date.now(),
      title: seriesName.trim(),
      tvmazeId: tvmazeData.tvmazeId || null, //version1.1: store for show_id matching
      active: true,
      addedAt: new Date().toISOString(),
    };

    watchlist.push(newItem);

    //stores TVMaze data
    const tvmazeDataStore = await this.getTVMazeData();
    tvmazeDataStore[seriesName.toLowerCase()] = tvmazeData;

    return new Promise((resolve) => {
      chrome.storage.local.set(
        {
          [this.STORAGE_KEY]: watchlist,
          [this.TVMAZE_DATA_KEY]: tvmazeDataStore,
        },
        () => {
          resolve(true);
        }
      );
    });
  }

  /**
   removes series from watchlist
   @param {number} id - Item ID
   */
  static async removeSeries(id) {
    const watchlist = await this.getWatchlist();
    const itemToRemove = watchlist.find((item) => item.id === id);
    const filtered = watchlist.filter((item) => item.id !== id);

    if (itemToRemove) {
      const tvmazeDataStore = await this.getTVMazeData();
      delete tvmazeDataStore[itemToRemove.title.toLowerCase()];

      return new Promise((resolve) => {
        chrome.storage.local.set(
          {
            [this.STORAGE_KEY]: filtered,
            [this.TVMAZE_DATA_KEY]: tvmazeDataStore,
          },
          () => {
            resolve(true);
          }
        );
      });
    }

    return new Promise((resolve) => {
      chrome.storage.local.set({ [this.STORAGE_KEY]: filtered }, () => {
        resolve(true);
      });
    });
  }

  //toggle active status of a series
  
  static async toggleActive(id) {
    const watchlist = await this.getWatchlist();
    const item = watchlist.find((item) => item.id === id);

    if (item) {
      item.active = !item.active;
      return new Promise((resolve) => {
        chrome.storage.local.set({ [this.STORAGE_KEY]: watchlist }, () => {
          resolve(true);
        });
      });
    }
    return false;
  }

  // get only active series titles
   
  static async getActiveSeries() {
    const watchlist = await this.getWatchlist();
    return watchlist
      .filter((item) => item.active)
      .map((item) => ({
        title: item.title.toLowerCase(),
        tvmazeId: item.tvmazeId || null  // Version1.1: expose for show_id matching
      }));
  }

  //get TVMaze data for all series
   
  static async getTVMazeData() {
    return new Promise((resolve) => {
      chrome.storage.local.get({ [this.TVMAZE_DATA_KEY]: {} }, (data) => {
        resolve(data[this.TVMAZE_DATA_KEY]);
      });
    });
  }

  //get TVMaze data for specific series
   
  static async getTVMazeDataForSeries(seriesName) {
    const tvmazeData = await this.getTVMazeData();
    return tvmazeData[seriesName.toLowerCase()] || null;
  }

  // clear entire watchlist
   
  static async clear() {
    return new Promise((resolve) => {
      chrome.storage.local.set(
        { [this.STORAGE_KEY]: [], [this.TVMAZE_DATA_KEY]: {} },
        () => {
          resolve(true);
        }
      );
    });
  }
}