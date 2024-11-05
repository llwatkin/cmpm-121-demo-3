import "./style.css";
const app = document.querySelector<HTMLDivElement>("#app")!;
const APP_NAME = "FossilFinder";
document.title = APP_NAME;

const titleDisplay = document.createElement("h1");
titleDisplay.innerHTML = APP_NAME;
app.append(titleDisplay);

// Config object for general button creation function
interface ButtonConfig {
  name: string;
  div: HTMLDivElement;
  clickFunction(): void;
}
// General function to create a button with a name and click function in a certain div
function createButton(config: ButtonConfig) {
  const newButton = document.createElement("button");
  newButton.innerHTML = config.name;
  config.div.append(newButton);

  newButton.addEventListener("click", config.clickFunction);
  return newButton;
}

const clickButton = createButton({
  name: "Click Me!",
  div: app,
  clickFunction: () => {
    alert("you clicked the button!");
  },
});

clickButton.style.backgroundColor = "#535bf2";
