/*
* Each Mon has a (typed) Special Attack
* Each Mon has a (untyped) Neutral Attack
* Range and melee attacks
* Range can be avoided, melee attacks only work in melee range
* Utility abilities?

Types:
Neutral
Light > Void > ???
Fire > Gaia > Water

## Mons

Gooh
    Hit (neutral, melee)

Trolmon
    Axe throw (neutral, range)
    Rootgrip (gaia, melee)

Drakano
    Fireball (fire, range)
    Slash (neutral, melee)

Nessya
    Tide (water, range)
    Choke? (neutral, melee)

Glitchee
    Cheat (neutral, does nothing)

Stats:
    * HP
    * Attack
    * Def
    * Speed
    (exp:
    * Special
    * Resist
    )
*/

const BASE_SIZE = 240;
const WIDTH = BASE_SIZE;
const HEIGHT = BASE_SIZE;
const ZOOM = getScale();
function getScale() {
    console.log(`w: ${window.innerWidth}, h: ${window.innerHeight}`);
    if (window.innerWidth >= 500 && window.innerHeight >= 500) {
        console.log("double zoom");
        return 2;
    }
    console.log("normal zoom");
    return 1;
}

let config = {
    parent: "game",
    type: Phaser.AUTO,
    width: WIDTH,
    height: HEIGHT,
    scale: {
        width: WIDTH,
        height: HEIGHT,
        zoom: ZOOM
    },
    scene: {
        preload: preload,
        create: create
    }
};

let game = new Phaser.Game(config);

// Pyxel color palette
// https://github.com/kitao/pyxel#color-palette

function preload() {
    this.load.image('btn_back', 'a/back.png');
    this.load.image('btn1', 'a/su1.png');
    this.load.image('btn2', 'a/su2.png');
    this.load.image('btn3', 'a/su3.png');
    this.load.image('btn4', 'a/su4.png');

    this.load.image('sky', 'a/susky.png');
    this.load.image('ground', 'a/sugrass.png');

    // Mons
    this.load.image('drakano', 'a/sudrakano.png');
}

function create() {
    // Background
    this.add.image(WIDTH / 2, 30, 'sky');
    this.add.image(WIDTH / 2, 150, 'ground');

    this.add.image(170, HEIGHT / 2, 'drakano');

    // UI
    this.add.image(225, 15, 'btn_back');
    this.add.image(30, 210, 'btn1');
    this.add.image(90, 210, 'btn2');
    this.add.image(150, 210, 'btn3');
    this.add.image(210, 210, 'btn4');

    /*
    // Use for flame attack later
    var particles = this.add.particles('btn_back');
    var emitter = particles.createEmitter({
        speed: 100,
        scale: { start: 1, end: 0 },
        blendMode: 'ADD'
    });
    */
}
