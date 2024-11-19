// Definition of a point on the globe
export interface Geopoint {
  lat: number;
  lng: number;
}

// Represents a rectangluar geographical area on a map
export interface Geobounds {
  startCoord: Geopoint;
  endCoord: Geopoint;
}

// Represents a world cell described by an i, j pair that is not the same as its lat/lng location
export interface Cell {
  readonly i: number;
  readonly j: number;
}

// Represents an item with a type, origin cell, and serial number
export interface Item {
  readonly type: string;
  readonly origin: Cell;
  readonly serial: number;
}

// Represents a cache that has a cell location, number of items, and an inventory of items
export interface Cache {
  location: Cell;
  numItems: number;
  inventory: Item[];
}

// Config object for button creation function
export interface ButtonConfig {
  name: string;
  div: HTMLDivElement;
  clickFunction(): void;
}
