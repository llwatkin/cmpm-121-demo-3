// Helpful functions whose implementations don't need to be seen in main program

// Import type definitions
import { ButtonConfig } from "./types.ts";

// Create and return a button with a name and click function in a certain div
export function createButton(config: ButtonConfig): HTMLButtonElement {
  const newButton = document.createElement("button");
  newButton.innerHTML = config.name;
  config.div.append(newButton);
  newButton.addEventListener("click", config.clickFunction);
  return newButton;
}
