/*
* Each Mon has a (typed) Special Attack
* Each Mon has a (untyped) Neutral Attack
* Range and melee attacks
* Range can be avoided, melee attacks only work in melee range
* Utility abilities?
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

const TB = 1.5; // Bonus
const TN = 1.0; // Neutral
const TM = 0.5; // Malus
const DB = { // Stats: HP, Atk, Def, Spd
    types: ["Neutral", "Gaia", "Fire", "Water"],
    typeMatrix: [ // BASE: Gaia > Water > Fire > Gaia | EXP: Neutral > Void > Light > Neutral
        [TN, TN, TN, TN],
        [TN, TN, TM, TB],
        [TN, TB, TN, TM],
        [TN, TM, TB, TN],
    ],
    food: [
        {
            name: "Candy"
        },
        {
            name: "Salad"
        },
        {
            name: "Meat"
        },
        {
            name: "Water"
        },
    ],
    attacks: [
        {
            name: "Nope",
            type: 0,
            dmg: 3
        },
        {
            name: "Hit",
            type: 0,
            dmg: 5
        },
        {
            name: "Axe Throw",
            type: 0,
            dmg: 5
        },
        {
            name: "Rootgrip",
            type: 1,
            dmg: 5
        },
        {
            name: "Fireball",
            type: 2,
            dmg: 5
        },
        {
            name: "Slash",
            type: 0,
            dmg: 5
        },
        {
            name: "Tide",
            type: 3,
            dmg: 5
        },
        {
            name: "Choke",
            type: 0,
            dmg: 5
        },
    ],
    mons: [
        {
            name: "Glitchee",
            type: 0,
            stats: [10, 3, 3, 3],
            melee: 0,
            range: null,
            evo: {}
        },
        {
            name: "Gooh",
            type: 0,
            stats: [15, 5, 5, 5],
            melee: 1,
            range: null,
            evo: {
                "1113": 2,
                "1222": 3,
                "2333": 4,
            }
        },
        {
            name: "Trolmon",
            type: 1,
            stats: [30, 10, 10, 10],
            melee: 3,
            range: 2,
            evo: {}
        },
        {
            name: "Drakano",
            type: 2,
            stats: [30, 10, 10, 10],
            melee: 5,
            range: 4,
            evo: {}
        },
        {
            name: "Nessya",
            type: 3,
            stats: [30, 10, 10, 10],
            melee: 7,
            range: 6,
            evo: {}
        },
    ]
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
    this.load.image('gooh', 'a/sugooh.png');
    this.load.image('trolmon', 'a/sutrolmon.png');
    this.load.image('drakano', 'a/sudrakano.png');
    this.load.image('nessya', 'a/sunessya.png');
}

let events = [];
let GRAPHICS;
let mon;
let rival;

// Events
class NMEvent {
    constructor() { }
    update(t, dt) { return null; }
}
class EventTap extends NMEvent {
    constructor(x, y) {
        super();
        this.x = x;
        this.y = y;
    }
    update(t, dt) {
        if (mon != null) {
            mon.moveTo(this.x, this.y);
        }
        return null;
    }
}

// Mon
function newMon(scene, x, y, type) {
    let sprite = scene.add.follower(null, x, y, type);
    sprite.setDepth(y);

    function getPos() {
        return {x: this.sprite.x, y: this.sprite.y};
    }

    function moveTo(x, y) {
        let pos = this.getPos();
        if (x > pos.x)
            this.sprite.setFlipX(true);
        else
            this.sprite.setFlipX(false);

        // HACK: hardcoded game area, consider onclick on sprites/game area later
        if (x < HALF_SPRITE_SIZE) x = HALF_SPRITE_SIZE;
        if (x >= BASE_SIZE - HALF_SPRITE_SIZE) x = BASE_SIZE - HALF_SPRITE_SIZE;
        if (y < 56) y = 56;
        if (y >= 180 - HALF_SPRITE_SIZE) y = 180 - HALF_SPRITE_SIZE; // don't clip over button row

        this.sprite.setPath(new Phaser.Curves.Path(pos.x, pos.y).lineTo(x, y));
        this.isMoving = true;
        let self = this;
        this.sprite.startFollow({
            positionOnPath: true,
            duration: monRunTimeForDistance(distance(pos.x, pos.y, x, y)),
            repeat: 0,
            rotateToPath: false,
            onComplete: () => { self.isMoving = false; },
            onUpdate: () => { self.sprite.setDepth(self.getPos().y); }
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

    rival = newMon(this, 80, HEIGHT / 2, "gooh");
    newMon(this, 50, HEIGHT / 2, "trolmon");
    newMon(this, 110, HEIGHT / 2, "nessya");
    mon = newMon(this, 170, HEIGHT / 2, "drakano");

    // UI
    /*
    this.add.image(225, 15, 'btn_back');
    this.add.image(30, 210, 'btn1');
    this.add.image(90, 210, 'btn2');
    this.add.image(150, 210, 'btn3');
    this.add.image(210, 210, 'btn4');
    */

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
        events.push(new EventTap(x, y));
    }, this);

    //game.scale.scaleMode = Phaser.Scale.NONE;
    //game.scale.resize(WIDTH, HEIGHT);
    //game.scale.setZoom(ZOOM);

    if (DEBUG) {
        GRAPHICS = this.add.graphics();
        GRAPHICS.fillStyle(0xffff00, 1.0); // yellow, full alpha
    }
}

function update(t, dt) {
    let event = undefined;
    let newEvent = null;
    let leftovers = [];
    while(typeof(event = events.shift()) !== 'undefined') {
        newEvent = event.update(t, dt);
        if (newEvent !== null) leftovers.push(newEvent);
    }
    Array.prototype.push.apply(events, leftovers);
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
