// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./leafletWorkaround.ts";

// Deterministic random number generator
import luck from "./luck.ts";

// Import Cell definition
import { Cell } from "./world.ts";
// Import cell degrees
import { CELL_DEGREES } from "./world.ts";
// Create the world of cells
import { createWorld } from "./world.ts";
const world = createWorld();

// App name
const APP_NAME = "Smileycache";
document.title = APP_NAME;
const ITEM_NAME = "Smiley";

// Location of our classroom (as identified on Google Maps)
const OAKES_CLASSROOM = leaflet.latLng(36.98949379578401, -122.06277128548504);

// Tunable gameplay parameters
const GAMEPLAY_ZOOM_LEVEL = 19;
const CELL_VISIBILITY_RADIUS = 8;
const CACHE_SPAWN_PROBABILITY = 0.1;
const MAX_CACHE_ITEMS = 10;

// Representation of an item with a type, origin cell, and serial number
interface Item {
  readonly type: string;
  readonly origin: Cell;
  readonly serial: number;
}

// Current serial number
let serialNum = 0;

// Get list of all possible item types
import data from "./items.json" with { type: "json" };
const ITEM_TYPES = data.types;

// Returns a random item type from the item types array
function getRandomItemType(): string {
  const randIndex = Math.floor(Math.random() * ITEM_TYPES.length);
  return ITEM_TYPES[randIndex];
}

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
    maxZoom: GAMEPLAY_ZOOM_LEVEL,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

const playerLocation: leaflet.LatLng = OAKES_CLASSROOM; // Initial location is Oakes Classroom for now
// Add a marker to represent the player
let playerMarker = leaflet.marker(playerLocation);
playerMarker.bindTooltip("You're Here");
playerMarker.addTo(map);

function drawPlayerMarker(location: leaflet.LatLng) {
  playerMarker.removeFrom(map);
  playerMarker = leaflet.marker(location);
  playerMarker.bindTooltip("You're Here");
  playerMarker.addTo(map);
}
drawPlayerMarker(playerLocation);

// Display the player's items as a collection of unique items
const playerItems: Item[] = [];
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!; // element `statusPanel` is defined in index.html
statusPanel.innerHTML = `Go out and collect some ${ITEM_NAME}s!`;

// Returns a string in coordinate format (i, j) for a given cell
function coords(cell: Cell): string {
  return `(${cell.i.toFixed(0)}, ${cell.j.toFixed(0)})`;
}

// Returns a string in format i:j#serial for a given item
function getItemName(item: Item): string {
  return `${item.origin.i.toFixed(0)}:${
    item.origin.j.toFixed(0)
  }#${item.serial}`;
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

// Add caches to the map by cell numbers
function spawnCache(cell: Cell) {
  // Convert cell numbers into lat/lng bounds
  const bounds = world.getCellBounds(cell);

  // Add a rectangle to the map to represent the cache
  const rect = leaflet.rectangle(bounds);
  rect.addTo(map);

  // Each cache has a random item amount
  const itemCount = Math.floor(
    luck([cell.i, cell.j, "initialValue"].toString()) * MAX_CACHE_ITEMS,
  );
  // Fill cache with randomly generated items
  const cacheItems: Item[] = [];
  for (let i = 0; i < itemCount; i++) {
    const newItem: Item = {
      type: getRandomItemType(),
      origin: cell,
      serial: serialNum,
    };
    cacheItems.push(newItem);
    serialNum++;
  }

  // Handle interactions with the cache
  rect.bindPopup(() => {
    // The popup offers a description and button
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML = `There is a cache here at ${
      coords(cell)
    }. ${ITEM_NAME}s: <span id="value">${
      displayItems(
        cacheItems,
        false,
      )
    }</span>`;
    // Clicking this button removes an item from the cache and adds it to the player's items
    createButton({
      name: "Collect",
      div: popupDiv,
      clickFunction: () => {
        if (cacheItems.length > 0) {
          const cacheItem = cacheItems.pop();
          playerItems.push(cacheItem!);
          updateItemDisplay(popupDiv, cacheItems);
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
          cacheItems.push(playerItem!);
          updateItemDisplay(popupDiv, cacheItems);
        }
      },
    });

    return popupDiv;
  });
}

// Look around the player's neighborhood for caches to spawn
for (let i = -CELL_VISIBILITY_RADIUS; i < CELL_VISIBILITY_RADIUS; i++) {
  for (let j = -CELL_VISIBILITY_RADIUS; j < CELL_VISIBILITY_RADIUS; j++) {
    // If location i,j is lucky enough, spawn a cache
    if (luck([i, j].toString()) < CACHE_SPAWN_PROBABILITY) {
      const playerCell = world.getCellForPoint(OAKES_CLASSROOM);
      spawnCache({ i: playerCell.i + i, j: playerCell.j + j });
    }
  }
}

// Movement buttons
const toolPanel = document.querySelector<HTMLDivElement>("#toolPanel")!;
createButton({
  name: "⬆️",
  div: toolPanel,
  clickFunction: () => {
    // Move North
    playerLocation.lat += CELL_DEGREES;
    drawPlayerMarker(playerLocation);
  },
});
createButton({
  name: "⬇️",
  div: toolPanel,
  clickFunction: () => {
    // Move South
    playerLocation.lat -= CELL_DEGREES;
    drawPlayerMarker(playerLocation);
  },
});
createButton({
  name: "⬅️",
  div: toolPanel,
  clickFunction: () => {
    // Move West
    playerLocation.lng -= CELL_DEGREES;
    drawPlayerMarker(playerLocation);
  },
});
createButton({
  name: "➡️",
  div: toolPanel,
  clickFunction: () => {
    // Move East
    playerLocation.lng += CELL_DEGREES;
    drawPlayerMarker(playerLocation);
  },
});
