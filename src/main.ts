// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./leafletWorkaround.ts";

// Deterministic random number generator
import luck from "./luck.ts";

// Cell definition
import { Cell } from "./world.ts";
import { CELL_DEGREES } from "./world.ts";
// Create the world of cells
import { createWorld } from "./world.ts";
const world = createWorld();

// App and item names
const APP_NAME = "Smileycache";
document.title = APP_NAME;
const ITEM_NAME = "Smiley";

// Location of our classroom (as identified on Google Maps)
const ORIGIN_LOCATION = leaflet.latLng(36.98949379578401, -122.06277128548504);

// Tunable gameplay parameters
const GAMEPLAY_ZOOM_LEVEL = 19;
const CELL_VISIBILITY_RADIUS = 8;
const CACHE_SPAWN_PROBABILITY = 0.1;
const MAX_CACHE_ITEMS = 10;

// Interface of item object with a type, origin cell, and serial number
interface Item {
  readonly type: string;
  readonly origin: Cell;
  readonly serial: number;
}

// Get list of all possible item types
import data from "./items.json" with { type: "json" };
const ITEM_TYPES = data.types;

// Config object for button creation function
interface ButtonConfig {
  name: string;
  div: HTMLDivElement;
  clickFunction(): void;
}

// Create and return a button with a name and click function in a certain div
function createButton(config: ButtonConfig): HTMLButtonElement {
  const newButton = document.createElement("button");
  newButton.innerHTML = config.name;
  config.div.append(newButton);
  newButton.addEventListener("click", config.clickFunction);
  return newButton;
}

// Create the map (element with id "map" is defined in index.html)
const map = leaflet.map(document.getElementById("map")!, {
  center: ORIGIN_LOCATION,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

// Populate the map with a background tile layer
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: GAMEPLAY_ZOOM_LEVEL,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

// Array of cache rectangles added to the map
const cacheRects: leaflet.Rectangle[] = [];

const playerLocation: leaflet.LatLng = ORIGIN_LOCATION; // Initial location is Oakes Classroom for now
// Add a marker to represent the player
const playerMarker = leaflet.marker(playerLocation);
playerMarker.bindTooltip("You're Here");
playerMarker.addTo(map);

// Display the player's items as a collection of unique items
const playerItems: Item[] = [];
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!; // element `statusPanel` is defined in index.html
statusPanel.innerHTML = `Go out and collect some ${ITEM_NAME}s!`;

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

// Updates item displays for inventory and pop-ups
function updateItemDisplay(popupDiv: HTMLDivElement, cacheItems: Item[]) {
  popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML = displayItems(
    cacheItems,
    false,
  );
  statusPanel.innerHTML = `${ITEM_NAME}s collected: ${
    displayItems(
      playerItems,
      true,
    )
  }`;
}

// Cache object that implements Memento pattern
type Memento = string;
interface Cache {
  location: Cell;
  numItems: number;
  cacheItems: Item[];
}

// Constructor for cache object
function createCache(cell: Cell): Cache {
  const location = cell;
  const numItems = 0;
  const cacheItems: Item[] = [];

  return {
    location: location,
    numItems: numItems,
    cacheItems: cacheItems,
  };
}

// Returns a string representing cache object
function toMemento(cache: Cache): Memento {
  return JSON.stringify({
    location: cache.location,
    numItems: cache.numItems,
    cacheItems: cache.cacheItems,
  });
}

// Restores saved cache state from string
function fromMemento(cache: Cache, memento: Memento) {
  const obj = JSON.parse(memento);
  cache.location = obj.location;
  cache.numItems = obj.numItems;
  cache.cacheItems = obj.cacheItems;
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
    cache.cacheItems.push(newItem);
  }
}

// Dictionary of cache mementos (saved cache states)
const mementoDictionary: { [key: string]: string } = {};

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
  if (cache.cacheItems.length > 0) {
    const cacheItem = cache.cacheItems.pop();
    playerItems.push(cacheItem!);
    updateItemDisplay(popupDiv, cache.cacheItems);
    saveCacheState(cache);
  }
}

// Removes an item from the player's collection and adds it to the cache
function depositItem(popupDiv: HTMLDivElement, cache: Cache) {
  if (playerItems.length > 0) {
    const playerItem = playerItems.pop();
    cache.cacheItems.push(playerItem!);
    updateItemDisplay(popupDiv, cache.cacheItems);
    saveCacheState(cache);
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
  const rect = leaflet.rectangle(bounds);
  rect.addTo(map);
  cacheRects.push(rect);

  // Handle interactions with the cache
  rect.bindPopup(() => {
    // The popup offers a description and button
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `There is a cache here at ${
      coords(cell)
    }. ${ITEM_NAME}s: <span id="value">${
      displayItems(
        cache.cacheItems,
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
      const originCell = world.getCellForPoint(ORIGIN_LOCATION);
      const iTrue = originCell.i + i;
      const jTrue = originCell.j + j;
      // If location i, j is lucky enough, spawn a cache
      if (
        luck([iTrue, jTrue].toString()) <
          CACHE_SPAWN_PROBABILITY
      ) {
        spawnCache({ i: iTrue, j: jTrue });
      }
    }
  }
}
spawnCaches();

// Clears all currently drawn cache rectangles
function clearCaches() {
  for (let i = 0; i < cacheRects.length; i++) {
    cacheRects[i].removeFrom(map);
  }
}

// Clears caches, moves player marker, sets new map viewpoint, and respawns caches
function refreshMap() {
  clearCaches();
  map.setView(playerLocation);
  playerMarker.setLatLng(playerLocation);
  spawnCaches();
}

// Create movement buttons
const toolPanel = document.querySelector<HTMLDivElement>("#toolPanel")!;
const movementButtons = [
  { name: "⬆️", direction: { lat: 1, lng: 0 } },
  { name: "⬇️", direction: { lat: -1, lng: 0 } },
  { name: "⬅️", direction: { lat: 0, lng: -1 } },
  { name: "➡️", direction: { lat: 0, lng: 1 } },
];
for (let i = 0; i < movementButtons.length; i++) {
  const button = movementButtons[i];
  createButton({
    name: button.name,
    div: toolPanel,
    clickFunction: () => {
      playerLocation.lat += button.direction.lat * CELL_DEGREES;
      playerLocation.lng += button.direction.lng * CELL_DEGREES;
      refreshMap();
    },
  });
}
