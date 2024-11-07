// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./leafletWorkaround.ts";

// Deterministic random number generator
import luck from "./luck.ts";

// App name
const APP_NAME = "Smileycache";
document.title = APP_NAME;
const ITEM_NAME = "Smiley";

// Location of our classroom (as identified on Google Maps)
const OAKES_CLASSROOM = leaflet.latLng(36.98949379578401, -122.06277128548504);

// Tunable gameplay parameters
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const CACHE_SPAWN_PROBABILITY = 0.1;
const MAX_CACHE_ITEMS = 10;

// Representation of a cell location
interface CellLocation {
  i: number;
  j: number;
}

// Representation of an item with a type and an origin location
interface Item {
  type: string;
  origin: CellLocation;
}

// List of all possible item types
const ITEM_TYPES: string[] = [
  "😀",
  "😃",
  "😄",
  "😁",
  "😆",
  "😅",
  "🤣",
  "😂",
  "🙂",
  "😉",
  "😊",
  "😇",
  "🥰",
];

// Config object for button creation function
interface ButtonConfig {
  name: string;
  div: HTMLDivElement;
  clickFunction(): void;
}

// Create a button with a name and click function in a certain div
function createButton(config: ButtonConfig) {
  const newButton = document.createElement("button");
  newButton.innerHTML = config.name;
  config.div.append(newButton);
  newButton.addEventListener("click", config.clickFunction);
  return newButton;
}

// Create the map (element with id "map" is defined in index.html)
const map = leaflet.map(document.getElementById("map")!, {
  center: OAKES_CLASSROOM,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

// Populate the map with a background tile layer
leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

// Add a marker to represent the player
const playerMarker = leaflet.marker(OAKES_CLASSROOM);
playerMarker.bindTooltip("You're Here");
playerMarker.addTo(map);

// Display the player's items as a collection of unique items
const playerItems: Item[] = [];
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!; // element `statusPanel` is defined in index.html
statusPanel.innerHTML = `Go out and collect some ${ITEM_NAME}s!`;

// Returns a string representing a list of items
function displayItems(items: Item[]) {
  let output = "";
  for (let i = 0; i < items.length; i++) {
    output += `${items[i].type} (${items[i].origin.i}, ${items[i].origin.j}), `;
  }
  output = output.slice(0, -2); // Remove extra space and comma
  return output;
}

// Add caches to the map by cell numbers
function spawnCache(location: CellLocation) {
  // Convert cell numbers into lat/lng bounds
  const mapOrigin = OAKES_CLASSROOM;
  const bounds = leaflet.latLngBounds([
    [
      mapOrigin.lat + location.i * TILE_DEGREES,
      mapOrigin.lng + location.j * TILE_DEGREES,
    ],
    [
      mapOrigin.lat + (location.i + 1) * TILE_DEGREES,
      mapOrigin.lng + (location.j + 1) * TILE_DEGREES,
    ],
  ]);

  // Add a rectangle to the map to represent the cache
  const rect = leaflet.rectangle(bounds);
  rect.addTo(map);

  // Handle interactions with the cache
  rect.bindPopup(() => {
    // Each cache has a random item amount
    const itemCount = Math.floor(
      luck([location.i, location.j, "initialValue"].toString()) *
        MAX_CACHE_ITEMS,
    );
    // Fill cache with randomly generated items
    const cacheItems: Item[] = [];
    for (let i = 0; i < itemCount; i++) {
      const newItem: Item = {
        type: ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)],
        origin: location,
      };
      cacheItems.push(newItem);
    }

    // The popup offers a description and button
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML =
      `There is a cache here at (${location.i},${location.j}). ${ITEM_NAME}s: <span id="value">${
        displayItems(cacheItems)
      }</span>`;
    // Clicking this button removes an item from the cache and adds it to the player's items
    createButton({
      name: "Collect",
      div: popupDiv,
      clickFunction: () => {
        if (cacheItems.length > 0) {
          const cacheItem = cacheItems.pop();
          popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML =
            displayItems(cacheItems);
          playerItems.push(cacheItem!);
          statusPanel.innerHTML = `${ITEM_NAME}s collected: ${
            displayItems(
              playerItems,
            )
          }`;
        }
      },
    });
    // Clicking this button removes an item from the player's collection and adds it to the cache
    createButton({
      name: "Deposit",
      div: popupDiv,
      clickFunction: () => {
        if (playerItems.length > 0) {
          const playerItem = playerItems.pop();
          statusPanel.innerHTML = `${ITEM_NAME}s collected: ${
            displayItems(
              playerItems,
            )
          }`;
          cacheItems.push(playerItem!);
          popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML =
            displayItems(cacheItems);
        }
      },
    });

    return popupDiv;
  });
}

// Look around the player's neighborhood for caches to spawn
for (let i = -NEIGHBORHOOD_SIZE; i < NEIGHBORHOOD_SIZE; i++) {
  for (let j = -NEIGHBORHOOD_SIZE; j < NEIGHBORHOOD_SIZE; j++) {
    // If location i,j is lucky enough, spawn a cache
    if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
      spawnCache({ i: i, j: j });
    }
  }
}
