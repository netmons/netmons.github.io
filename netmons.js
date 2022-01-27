/*
* Each Mon has a (typed) Special Attack
* Each Mon has a (untyped) Neutral Attack
* Range and melee attacks
* Range can be avoided, melee attacks only work in melee range
* Utility abilities?

Types:
Gaia > Water > Fire > Gaia
Neutral > Void > Light > Neutral

## Mons

Gooh (Neutral)
    Hit (neutral, melee)

Trolmon (Gaia)
    Axe throw (neutral, range)
    Rootgrip (gaia, melee)

Drakano (Fire)
    Fireball (fire, range)
    Slash (neutral, melee)

Nessya (Water)
    Tide (water, range)
    Choke? (neutral, melee)

Glitchee (Neutral)
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

const DEBUG = false;


const BASE_SIZE = 240;
const SPRITE_SIZE = 32;
const HALF_SPRITE_SIZE = 32 / 2;
const WIDTH = BASE_SIZE;
const HEIGHT = BASE_SIZE;
const ZOOM = getScale();
function getScale() {
    console.log(`w: ${window.innerWidth}, h: ${window.innerHeight}`);
    if (window.innerWidth >= 500 && window.innerHeight >= 530) {
        return 2;
    }
    return 1;
}

let config = {
    type: Phaser.AUTO,
    scale: {
        parent: "game",
        fullscreenTarget: "game",
        mode: Phaser.Scale.FIT,
        width: WIDTH,
        height: HEIGHT
    },
    render: {
        pixelArt: true
    },
    scene: {
        preload: preload,
        create: create,
        update: update
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

let taps = []
let GRAPHICS;
let mon;
function newMon(scene, type) {
    let sprite = scene.add.image(170, HEIGHT / 2, type);

    function getPos() {
        if (this.sprite != null) {
            return {x: this.sprite.x, y: this.sprite.y};
        }
    }

    function moveTo(x, y) {
        // HACK: hardcoded game area, consider onclick on sprites/game area later
        if (x < HALF_SPRITE_SIZE) x = HALF_SPRITE_SIZE;
        if (x >= BASE_SIZE - HALF_SPRITE_SIZE) x = BASE_SIZE - HALF_SPRITE_SIZE;
        if (y < 60) y = 60;
        if (y >= 180 - HALF_SPRITE_SIZE) y = 180 - HALF_SPRITE_SIZE; // don't clip over button row

        let pos = this.getPos();
        let path = new Phaser.Curves.Path(pos.x, pos.y).lineTo(x, y);
        if (this.sprite != null) {
            this.sprite.destroy();
            this.sprite = null;
        }
        this.sprite = this.scene.add.follower(path, pos.x, pos.y, type);
        if (x > pos.x) this.sprite.setFlipX(true);
        this.isMoving = true;
        let self = this;
        function moveToComplete() {
            self.isMoving = false;
        }
        this.sprite.startFollow({
            positionOnPath: true,
            duration: monRunTimeForDistance(distance(pos.x, pos.y, x, y)),
            repeat: 0,
            rotateToPath: false,
            onComplete: moveToComplete
        });
    }

    return {
        type: type,
        sprite: sprite,
        scene: scene,
        isMoving: false,
        isIdling: false,
        getPos: getPos,
        moveTo: moveTo
    }
}

function create() {

    // Background
    this.add.image(WIDTH / 2, 30, 'sky');
    this.add.image(WIDTH / 2, 150, 'ground');

    mon = newMon(this, "drakano");

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

    this.input.on('pointerdown', function (pointer) {
        let x = Math.floor(pointer.x);
        let y = Math.floor(pointer.y);
        if (DEBUG) console.log(`down: ${x}, ${y}, frame: ${this.game.loop.frame}`);
        taps.push({x, y});
    }, this);

    //game.scale.scaleMode = Phaser.Scale.NONE;
    //game.scale.resize(WIDTH, HEIGHT);
    //game.scale.setZoom(ZOOM);

    GRAPHICS = this.add.graphics();
    GRAPHICS.fillStyle(0xffff00, 1.0); // yellow, full alpha
}

function update(t, dt) {
    for (let tap of taps) {
        if (DEBUG) GRAPHICS.fillRect(tap.x, tap.y, 1, 1);
        if (DEBUG) console.log(`${mon.getPos().x} ${mon.getPos().y}`);

        if (mon != null) {
            mon.moveTo(tap.x, tap.y);
        }
    }

    taps = [];
}

// Library
function distance(x1, y1, x2, y2) {
    return Phaser.Math.Distance.Between(x1, y1, x2, y2);
}
const MON_SPEED_IN_PIXEL_PER_S = 90; // TODO: make dependent on mon, 100 fastest? 80 slowest?
function monRunTimeForDistance(distance) {
    return Math.floor((distance / MON_SPEED_IN_PIXEL_PER_S) * 1000);
}

// Fullscreen
game.scale.on(Phaser.Scale.Events.LEAVE_FULLSCREEN, () => {
    game.scale.scaleMode = Phaser.Scale.NONE;
    game.scale.resize(WIDTH, HEIGHT);
    game.scale.setZoom(1);
});

game.scale.on(Phaser.Scale.Events.ENTER_FULLSCREEN, () => {
    game.scale.scaleMode = Phaser.Scale.FIT;
    game.scale.setGameSize(WIDTH, HEIGHT);
});

function goFullscreen() {
    if (!game.scale.isFullscreen) {
        game.scale.startFullscreen();
    }
}
window.netmonsFullscreen = goFullscreen;
