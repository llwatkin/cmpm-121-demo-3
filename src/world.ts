// Import type definitions
import { Cell, Geobounds, Geopoint } from "./types.ts";

// Fix missing marker images
import "./leafletWorkaround.ts";

// Constants
const CELL_DEGREES = 1e-4;
const NULL_ISLAND = { lat: 0, lng: 0 };

// Contructor for the world of cells
export function createWorld() {
  const knownCells: Map<string, Cell> = new Map();

  // Returns a cell that has already been constructed or constructs a new cell to return
  function getKnownCell(cell: Cell): Cell {
    const { i, j } = cell;
    const key = [i, j].toString();
    // If this cell has not been constructed already, construct it
    if (!knownCells.has(key)) {
      knownCells.set(key, { i, j });
    }
    return knownCells.get(key)!;
  }

  return {
    CELL_DEGREES: CELL_DEGREES,
    // Returns the cell for a given lat/lng point
    getCellForPoint: (point: Geopoint): Cell => {
      return getKnownCell({
        i: Number((point.lat / CELL_DEGREES).toFixed(0)),
        j: Number((point.lng / CELL_DEGREES).toFixed(0)),
      });
    },
    // Converts cell numbers into lat/lng bounds
    getCellBounds: (cell: Cell): Geobounds => {
      const mapOrigin = NULL_ISLAND;
      const bounds = {
        startCoord: {
          lat: mapOrigin.lat + cell.i * CELL_DEGREES,
          lng: mapOrigin.lng + cell.j * CELL_DEGREES,
        },
        endCoord: {
          lat: mapOrigin.lat + (cell.i + 1) * CELL_DEGREES,
          lng: mapOrigin.lng + (cell.j + 1) * CELL_DEGREES,
        },
      };
      return bounds;
    },
  };
}
