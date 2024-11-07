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
const APP_NAME = "FossilFinder";
document.title = APP_NAME;

// Location of our classroom (as identified on Google Maps)
const OAKES_CLASSROOM = leaflet.latLng(36.98949379578401, -122.06277128548504);

// Tunable gameplay parameters
const GAMEPLAY_ZOOM_LEVEL = 19;
const TILE_DEGREES = 1e-4;
const NEIGHBORHOOD_SIZE = 8;
const CACHE_SPAWN_PROBABILITY = 0.1;

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

// Display the player's fossils
let playerFossils = 0;
const statusPanel = document.querySelector<HTMLDivElement>("#statusPanel")!; // element `statusPanel` is defined in index.html
statusPanel.innerHTML = "No fossils yet! Go out and collect some!";

// Add caches to the map by cell numbers
function spawnCache(i: number, j: number) {
  // Convert cell numbers into lat/lng bounds
  const origin = OAKES_CLASSROOM;
  const bounds = leaflet.latLngBounds([
    [origin.lat + i * TILE_DEGREES, origin.lng + j * TILE_DEGREES],
    [origin.lat + (i + 1) * TILE_DEGREES, origin.lng + (j + 1) * TILE_DEGREES],
  ]);

  // Add a rectangle to the map to represent the cache
  const rect = leaflet.rectangle(bounds);
  rect.addTo(map);

  // Handle interactions with the cache
  rect.bindPopup(() => {
    // Each cache has a random fossil amount, mutable by the player
    let cacheFossils = Math.floor(
      luck([i, j, "initialValue"].toString()) * 100,
    );

    // The popup offers a description and button
    const popupDiv = document.createElement("div");
    popupDiv.innerHTML =
      `There is a cache here at (${i},${j}). It contains <span id="value">${cacheFossils}</span> fossils.`;
    // Clicking this button decrements the cache's fossils and increments the player's fossils
    createButton({
      name: "Collect",
      div: popupDiv,
      clickFunction: () => {
        if (cacheFossils > 0) {
          cacheFossils--;
          popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML =
            cacheFossils.toString();
          playerFossils++;
          statusPanel.innerHTML = `Fossils collected: ${playerFossils}`;
        }
      },
    });
    // Clicking this button increments the cache's fossils and decrements the player's fossils
    createButton({
      name: "Deposit",
      div: popupDiv,
      clickFunction: () => {
        if (playerFossils > 0) {
          cacheFossils++;
          popupDiv.querySelector<HTMLSpanElement>("#value")!.innerHTML =
            cacheFossils.toString();
          playerFossils--;
          statusPanel.innerHTML = `Fossils collected: ${playerFossils}`;
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
      spawnCache(i, j);
    }
  }
}
