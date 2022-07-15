// initialize a pixijs stage using the #battle_canvas element
let app = new PIXI.Application({ width: 1000, height: 500 });

// set background color to white
app.renderer.backgroundColor = 0x2c3338;

// add app to our #battle_canvas element
document.getElementById("battle_canvas").appendChild(app.view);

// fetch battle info from the server
let battle_id = window.location.pathname.split("/")[2];
fetch("/battle/" + battle_id)
  .then((response) => response.json())
  .then((battle) => {
    // get the challenger and challenged items
    let challenger = battle.challenger;
    let challenged = battle.challenged;
  });
