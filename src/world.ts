// @deno-types="npm:@types/leaflet@^1.9.14"
import leaflet from "leaflet";

const NULL_ISLAND = leaflet.latLng(0, 0);
const knownCells: Map<string, Cell> = new Map();

// Definition of a cell
export interface Cell {
  readonly i: number;
  readonly j: number;
}

// Contructor for the world of cells
export function createWorld() {
  const CELL_DEGREES = 1e-4;

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
    getCellForPoint: (point: leaflet.LatLng): Cell => {
      return getKnownCell({
        i: Number((point.lat / CELL_DEGREES).toFixed(0)),
        j: Number((point.lng / CELL_DEGREES).toFixed(0)),
      });
    },
    // Converts cell numbers into lat/lng bounds
    getCellBounds: (cell: Cell): leaflet.LatLngBounds => {
      const mapOrigin = NULL_ISLAND;
      const bounds = leaflet.latLngBounds([
        [
          mapOrigin.lat + cell.i * CELL_DEGREES,
          mapOrigin.lng + cell.j * CELL_DEGREES,
        ],
        [
          mapOrigin.lat + (cell.i + 1) * CELL_DEGREES,
          mapOrigin.lng + (cell.j + 1) * CELL_DEGREES,
        ],
      ]);
      return bounds;
    },
  };
}
