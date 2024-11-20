// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Deterministic random number generator
import luck from "./luck.ts";

// Import leaflet map service
import { LeafletMapService } from "./map.ts";
const leafletMapService = new LeafletMapService();

// Create the world of cells (includes functions to get cell from point and get a cell's bounds)
import { createWorld } from "./world.ts";
const world = createWorld();

// Import type definitions
import { Cache, Cell, Geopoint, Item } from "./types.ts";

// Import helper functions
import { createButton } from "./utils.ts";

// App and item names
const APP_NAME = "Smileycache";
document.title = APP_NAME;
const ITEM_NAME = "Smiley";

// Currently the location of our classroom
const ORIGIN_LOCATION: Geopoint = {
  lat: 36.98949379578401,
  lng: -122.06277128548504,
};

// Tunable gameplay parameters
const GAMEPLAY_ZOOM_LEVEL = 19;
const CELL_VISIBILITY_RADIUS = 8;
const CACHE_SPAWN_CHANCE = 0.1;
const MAX_CACHE_ITEMS = 10;

// Get list of all possible item types
import data from "./itemTypes.json" with { type: "json" };
const ITEM_TYPES = data.types;

// Create the map (element with id "map" is defined in index.html)
const mapDiv = document.querySelector<HTMLDivElement>("#map")!;
leafletMapService.initialize(
  mapDiv,
  ORIGIN_LOCATION,
  GAMEPLAY_ZOOM_LEVEL,
);

// Load saved player location or it will be set to the origin location defined above
const playerLocation: Geopoint = loadPlayerLocation();

// Previous location used for determining whether caches need to be re-genenerated
const prevPlayerLocation: Geopoint = {
  lat: playerLocation.lat,
  lng: playerLocation.lng,
};

// Add a marker to represent the player
const playerMarker = leafletMapService.addMarker(playerLocation, "You");

// Returns a string in coordinate format (i, j) for a given cell
function coords(cell: Cell): string {
  return `(${cell.i}, ${cell.j})`;
}

// Returns a string in format i:j#serial for a given item
function getItemName(item: Item): string {
  return `${item.origin.i}:${item.origin.j}#${item.serial}`;
}

// Returns a string representing a list of items
function displayItems(items: Item[], showData: boolean): string {
  let output = "";
  for (let i = 0; i < items.length; i++) {
    output += items[i].type;
    if (showData) {
      output += getItemName(items[i]) + ", ";
    } else {
      output += ", ";
    }
  }
  output = output.slice(0, -2); // Remove extra space and comma
  return output;
}

// Display the player's items as a collection of unique items
let playerInventory: Item[] = loadPlayerInventory();
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!; // element `statusPanel` is defined in index.html

// Updates the status panel to display current player inventory
function updatePlayerInventoryDisplay() {
  statusPanel.innerHTML = `${ITEM_NAME}s collected: ${
    displayItems(
      playerInventory,
      true,
    )
  }`;
}
updatePlayerInventoryDisplay();

// Updates item displays for player inventory and a given pop-up
function updateItemDisplay(popupDiv: HTMLDivElement, cacheInventory: Item[]) {
  popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML = displayItems(
    cacheInventory,
    false,
  );
  updatePlayerInventoryDisplay();
}

// Constructor for cache object
function createCache(cell: Cell): Cache {
  const location = cell;
  const numItems = 0;
  const inventory: Item[] = [];

  return {
    location: location,
    numItems: numItems,
    inventory: inventory,
  };
}

// Returns a string representing cache object
function toMemento(cache: Cache): string {
  return JSON.stringify({
    location: cache.location,
    numItems: cache.numItems,
    inventory: cache.inventory,
  });
}

// Restores saved cache state from string
function fromMemento(cache: Cache, memento: string) {
  const obj = JSON.parse(memento);
  cache.location = obj.location;
  cache.numItems = obj.numItems;
  cache.inventory = obj.inventory;
}

// Deterministically sets a cache's number of items
function setRandomNumItems(cache: Cache) {
  cache.numItems = Math.floor(
    luck([cache.location.i, cache.location.j, "initialValue"].toString()) *
      MAX_CACHE_ITEMS,
  );
}

// Returns a random item type
function getRandomItemType(cell: Cell, serialNum: number): string {
  const randIndex = Math.floor(
    luck([cell.i, cell.j, serialNum].toString()) * ITEM_TYPES.length,
  );
  return ITEM_TYPES[randIndex];
}

// Fills a cache with randomly generated items
function fillCache(cache: Cache) {
  setRandomNumItems(cache);
  for (let i = 0; i < cache.numItems; i++) {
    const newItem: Item = {
      type: getRandomItemType(cache.location, i),
      origin: cache.location,
      serial: i,
    };
    cache.inventory.push(newItem);
  }
}

// Dictionary of cache mementos (saved cache states)
let mementoDictionary: { [key: string]: string } = loadCacheData();

// Returns a unique key for a given cell for use in memento dictionary
function getMementoKey(cell: Cell) {
  return cell.i.toString() + cell.j.toString();
}

// Returns saved cache if it exists, otherwise returns null
function getSavedCache(cell: Cell): Cache | null {
  const key = getMementoKey(cell);
  if (mementoDictionary[key]) {
    const cache = createCache(cell);
    fromMemento(cache, mementoDictionary[key]);
    return cache;
  }
  return null;
}

// Saves a cache's state to the memento dictionary
function saveCacheState(cache: Cache) {
  const key = getMementoKey(cache.location);
  mementoDictionary[key] = toMemento(cache);
}

// Removes an item from the cache and adds it to the player's items
function collectItem(popupDiv: HTMLDivElement, cache: Cache) {
  if (cache.inventory.length > 0) {
    const cacheItem = cache.inventory.pop();
    playerInventory.push(cacheItem!);
    updateItemDisplay(popupDiv, cache.inventory);
    saveCacheState(cache);
    saveGameState();
  }
}

// Removes an item from the player's collection and adds it to the cache
function depositItem(popupDiv: HTMLDivElement, cache: Cache) {
  if (playerInventory.length > 0) {
    const playerItem = playerInventory.pop();
    cache.inventory.push(playerItem!);
    updateItemDisplay(popupDiv, cache.inventory);
    saveCacheState(cache);
    saveGameState();
  }
}

// Creates or retrieves a cache at the given cell and adds it to the map
function spawnCache(cell: Cell) {
  // Retrieve existing cache or create new one
  let cache = getSavedCache(cell);
  if (!cache) {
    cache = createCache(cell);
    fillCache(cache);
    saveCacheState(cache);
  }

  // Convert cell numbers into lat/lng bounds
  const bounds = world.getCellBounds(cell);
  // Add a rectangle to the map to represent the cache
  const rect = leafletMapService.addRect(bounds);

  // Handle interactions with the cache
  rect.bindPopup(() => {
    // The popup offers a description and button
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `There is a cache here at ${
      coords(cell)
    }. ${ITEM_NAME}s: <span id="value">${
      displayItems(
        cache.inventory,
        false,
      )
    }</span>`;
    // Clicking this button removes an item from the cache and adds it to the player's items
    createButton({
      name: "Collect",
      div: popupDiv,
      clickFunction: () => {
        collectItem(popupDiv, cache);
      },
    });
    // Clicking this button removes an item from the player's collection and adds it to the cache
    createButton({
      name: "Deposit",
      div: popupDiv,
      clickFunction: () => {
        depositItem(popupDiv, cache);
      },
    });
    return popupDiv;
  });
}

// Spawns all caches within the player's visibility radius
function spawnCaches() {
  for (let i = -CELL_VISIBILITY_RADIUS; i < CELL_VISIBILITY_RADIUS; i++) {
    for (let j = -CELL_VISIBILITY_RADIUS; j < CELL_VISIBILITY_RADIUS; j++) {
      const playerCell = world.getCellForPoint(playerLocation);
      const iTrue = playerCell.i + i;
      const jTrue = playerCell.j + j;
      // If location i, j is lucky enough, spawn a cache
      if (luck([iTrue, jTrue].toString()) < CACHE_SPAWN_CHANCE) {
        spawnCache({ i: iTrue, j: jTrue });
      }
    }
  }
}
spawnCaches();

// Returns the number of degrees player has moved since previous stored location
function distanceMoved(point: Geopoint) {
  const latDiff = point.lat - prevPlayerLocation.lat;
  const lngDiff = point.lng - prevPlayerLocation.lng;
  const distance = Math.sqrt(latDiff ** 2 + lngDiff ** 2);
  return distance;
}

// Refreshes caches on map
function refreshCaches() {
  leafletMapService.clearRects();
  spawnCaches();
}

// Updates player marker and centers view on it
function updatePlayerMarker() {
  leafletMapService.setView(playerLocation, GAMEPLAY_ZOOM_LEVEL);
  leafletMapService.moveMarker(playerMarker, playerLocation);
}
updatePlayerMarker();

// Moves the player by a discrete amount in a certain direction
function movePlayerInDirection(direction: { x: number; y: number }) {
  playerLocation.lat += direction.y * world.CELL_DEGREES;
  playerLocation.lng += direction.x * world.CELL_DEGREES;
  updatePlayerMarker();
  refreshCaches();
  saveGameState();
}

// Moves the player to any point on the globe, refreshing caches if needed
function movePlayerToLocation(point: Geopoint) {
  prevPlayerLocation.lat = playerLocation.lat;
  prevPlayerLocation.lng = playerLocation.lng;
  playerLocation.lat = point.lat;
  playerLocation.lng = point.lng;
  updatePlayerMarker();
  // If player moved far enough to see new caches, refresh caches
  if (distanceMoved(point) > world.CELL_DEGREES) {
    refreshCaches();
  }
  saveGameState();
}

// Create movement buttons
const toolPanel = document.querySelector<HTMLDivElement>("#toolPanel")!;
const movementButtons = [
  { name: "⬆️", direction: { x: 0, y: 1 } },
  { name: "⬇️", direction: { x: 0, y: -1 } },
  { name: "⬅️", direction: { x: -1, y: 0 } },
  { name: "➡️", direction: { x: 1, y: 0 } },
];
for (let i = 0; i < movementButtons.length; i++) {
  const button = movementButtons[i];
  createButton({
    name: button.name,
    div: toolPanel,
    clickFunction: () => {
      movePlayerInDirection(button.direction);
    },
  });
}

// Whether or not auto movement based on real-world geolocation is turned on
const autoMoveOn: boolean = false;
let watchId: number;

// Moves the player to a point on the globe according to real-world geolocation
function autoMove(position: GeolocationPosition) {
  movePlayerToLocation({
    lat: position.coords.latitude,
    lng: position.coords.longitude,
  });
}

// Gets the player's geolocation if supported by browser
function toggleAutoMove() {
  if (navigator.geolocation) {
    if (!autoMoveOn) {
      watchId = navigator.geolocation.watchPosition(autoMove);
    } else {
      navigator.geolocation.clearWatch(watchId);
    }
  }
}

// Geolocation toggle button
createButton({
  name: "🌐",
  div: toolPanel,
  clickFunction: () => {
    toggleAutoMove();
  },
});

// Clear save data and reset game state button
createButton({
  name: "🚮",
  div: toolPanel,
  clickFunction: () => {
    localStorage.clear();
    playerLocation.lat = ORIGIN_LOCATION.lat;
    playerLocation.lng = ORIGIN_LOCATION.lng;
    playerInventory = [];
    mementoDictionary = {};
    updatePlayerInventoryDisplay();
    updatePlayerMarker();
    refreshCaches();
  },
});

// Save player location, inventory, and cache states to local storage
function saveGameState() {
  localStorage.setItem("locationData", JSON.stringify(playerLocation));
  localStorage.setItem("inventoryData", JSON.stringify(playerInventory));
  localStorage.setItem("cacheData", JSON.stringify(mementoDictionary));
}

// Attempts to load and restore saved cache data from local storage
function loadCacheData(): { [key: string]: string } {
  const cacheData = localStorage.getItem("cacheData");
  return cacheData ? JSON.parse(cacheData) : {};
}

// Attempts to load and restore saved player inventory data from local storage
function loadPlayerInventory(): Item[] {
  const inventoryData = localStorage.getItem("inventoryData");
  return inventoryData ? JSON.parse(inventoryData) : [];
}

// Attempts to load and restore saved player location from local storage
function loadPlayerLocation(): Geopoint {
  const locationData = localStorage.getItem("locationData");
  return locationData
    ? JSON.parse(locationData)
    : { lat: ORIGIN_LOCATION.lat, lng: ORIGIN_LOCATION.lng };
}
