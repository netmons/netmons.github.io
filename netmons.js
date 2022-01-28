"use strict";

/*
* Each Mon has a (typed) Special Attack
* Each Mon has a (untyped) Neutral Attack
* Range and melee attacks
* Range can be avoided, melee attacks only work in melee range
* Utility abilities?
*/

const DEBUG = false;

const BASE_SIZE = 240;
const GRID_SIZE = BASE_SIZE / 8;
const HALF_GRID_SIZE = GRID_SIZE / 2;
const SPRITE_SIZE = 32;
const HALF_SPRITE_SIZE = 32 / 2;
const ITEM_SIZE = HALF_SPRITE_SIZE;
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
    items: [
        {
            name: "Candy"
        },
        {
            name: "Salad"
        },
        {
            name: "Steak"
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

function loadAsset(scene, name) {
    scene.load.image(name.toLowerCase(), `a/su${name.toLowerCase()}.png`);
}
function preload() {
    this.load.image('btn_back', 'a/back.png');
    this.load.image('btn1', 'a/su1.png');
    this.load.image('btn2', 'a/su2.png');
    this.load.image('btn3', 'a/su3.png');
    this.load.image('btn4', 'a/su4.png');

    this.load.image('sky', 'a/susky.png');
    this.load.image('ground', 'a/sugrass.png');

    for (let item of DB.items) {
        loadAsset(this, item.name);
    }

    for (let mon of DB.mons) {
        loadAsset(this, mon.name);
    }
}

let GRAPHICS;
let events = [];
let _gameState = {
    scene: null,
    mon: null,
    stomach: [],
    maxStomachSize: 4,
    idleTime: 0,
    idleThreshold: 5000,
    itemWaitTime: 0,
    itemWaitThreshold: 10000,
    itemSpawnLocations: [ // 0 top left, 1 top right, 2 bottom left, 3 bottom right
        [HALF_GRID_SIZE, GRID_SIZE * 2 + HALF_GRID_SIZE],
        [GRID_SIZE * 7 + HALF_GRID_SIZE, GRID_SIZE * 2 + HALF_GRID_SIZE],
        [HALF_GRID_SIZE, GRID_SIZE * 7 + HALF_GRID_SIZE],
        [GRID_SIZE * 7 + HALF_GRID_SIZE, GRID_SIZE * 7 + HALF_GRID_SIZE],
    ],
    items: [
        null,
        null,
        null,
        null
    ]
};

// Events
class NMEvent {
    constructor() { }
    update(t, dt) { return null; }
}
class EventTap extends NMEvent {
    constructor(x, y, item=null) {
        super();
        _gameState.idleTime = 0;
        if (_gameState.mon != null) {
            if (item !== null) {
                _gameState.mon.moveToItem(item)
            } else {
                _gameState.mon.moveTo(x, y);
            }
        }
    }
}
class EventMonSpawn extends NMEvent {
    constructor(scene, x, y, kind) {
        super();
        this.mon = newMon(scene, x, y, kind);
    }
}
class EventPlayerSpawn extends EventMonSpawn {
    constructor(scene, x, y, kind) {
        super(scene, x, y, kind);
        _gameState.mon = this.mon;
    }
}
const IDLE_RANGE = 32;
class EventIdle extends EventTap {
    constructor() {
        let monPos = _gameState.mon.getPos();
        super(monPos.x + random(-IDLE_RANGE, IDLE_RANGE), monPos.y + random(-IDLE_RANGE, IDLE_RANGE));
        _gameState.idleThreshold = random(3500, 7000);
    }
}
class EventItemSpawn extends NMEvent {
    constructor() {
        super();
        let locationIdx = random(0, 3);
        let locationCoords = _gameState.itemSpawnLocations[locationIdx];
        let itemName = DB.items[random(0, DB.items.length - 1)].name;
        if (_gameState.items[locationIdx] !== null) {
            _gameState.items[locationIdx].destroy();
            _gameState.items[locationIdx] = null;
        }
        _gameState.items[locationIdx] = _gameState.scene.add.sprite(locationCoords[0], locationCoords[1], itemName.toLowerCase()).setInteractive();
        _gameState.items[locationIdx].setDepth(locationCoords[1] - ITEM_SIZE / 2);
        _gameState.items[locationIdx].itemName = itemName;
        _gameState.items[locationIdx].on('pointerdown', (pointer) => {
            let x = Math.floor(pointer.x);
            let y = Math.floor(pointer.y);
            events.push(new EventTap(x, y, locationIdx));
        });
    }
}
class EventItemConsume extends NMEvent {
    constructor(mon, itemIdx) {
        super();
        if (_gameState.items[itemIdx] !== null) {
            _gameState.stomach.push(DB.items.map(i => i.name).indexOf(_gameState.items[itemIdx].itemName));
            _gameState.items[itemIdx].destroy();
            _gameState.items[itemIdx] = null;
            while (_gameState.stomach.length > _gameState.maxStomachSize) {
                _gameState.stomach.shift();
            }
            if (DEBUG) console.log("Stomach:", _gameState.stomach);
        }
    }
}

// Mon
function newMon(scene, x, y, kind) {
    function _checkKind(kind) {
        if (DB.mons.map(m => m.name.toLowerCase()).some(n => n === kind)) {
            return kind;
        }
        return 'glitchee';
    }
    kind = _checkKind(kind);
    let sprite = scene.add.follower(null, x, y, kind);
    sprite.setDepth(y);

    function getPos() {
        return {x: this.sprite.x, y: this.sprite.y};
    }
    function onMoveUpdate(self) {
        return () => self.sprite.setDepth(self.getPos().y);
    }
    function onMoveToItemUpdate(self, item, itemIdx) {
        return () => {
            onMoveUpdate.apply(self);
            let pos = self.getPos();
            let distanceToItem = distance(pos.x, pos.y, item.x, item.y);
            if (distanceToItem <= 12) {
                events.push(new EventItemConsume(_gameState.mon, itemIdx));
            }
        }
    }
    function moveTo(x, y, onUpdate=onMoveUpdate(this)) {
        let pos = this.getPos();
        if (x > pos.x)
            this.sprite.setFlipX(true);
        else
            this.sprite.setFlipX(false);

        // HACK: hardcoded game area, consider onclick on sprites/game area later
        if (x < HALF_SPRITE_SIZE) x = HALF_SPRITE_SIZE;
        if (x >= BASE_SIZE - HALF_SPRITE_SIZE) x = BASE_SIZE - HALF_SPRITE_SIZE;
        if (y < 56) y = 56;
        if (y >= BASE_SIZE - HALF_SPRITE_SIZE) y = BASE_SIZE - HALF_SPRITE_SIZE;

        this.sprite.setPath(new Phaser.Curves.Path(pos.x, pos.y).lineTo(x, y));
        let self = this;
        this.sprite.startFollow({
            positionOnPath: true,
            duration: monRunTimeForDistance(distance(pos.x, pos.y, x, y)),
            repeat: 0,
            rotateToPath: false,
            onComplete: () => { },
            onUpdate: onUpdate
        });
    }
    function moveToItem(positionIdx) {
        let item = _gameState.items[positionIdx];
        if (item !== null) {
            this.moveTo(item.x, item.y, onMoveToItemUpdate(this, item, positionIdx));
        }
    }

    return {
        kind: kind,
        sprite: sprite,
        scene: scene,
        getPos: getPos,
        moveTo: moveTo,
        moveToItem: moveToItem
    }
}

function onTap(pointer) {
    let x = Math.floor(pointer.x);
    let y = Math.floor(pointer.y);
    if (DEBUG) console.log(`down: ${x}, ${y}, frame: ${this.game.loop.frame}`);
    events.push(new EventTap(x, y));
}
function create() {
    _gameState.scene = this;

    // Background
    let sky = this.add.image(WIDTH / 2, 30, 'sky').setInteractive();
    let ground = this.add.sprite(WIDTH / 2, 150, 'ground').setInteractive();

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

    /*
    this.input.on('pointerdown', onTap, this);
    */
    sky.on('pointerdown', onTap);
    ground.on('pointerdown', onTap);

    //game.scale.scaleMode = Phaser.Scale.NONE;
    //game.scale.resize(WIDTH, HEIGHT);
    //game.scale.setZoom(ZOOM);

    events.push(new EventMonSpawn(this, 18, HEIGHT / 2, "trolmon"));
    events.push(new EventMonSpawn(this, 53, HEIGHT / 2, "drakano"));
    events.push(new EventMonSpawn(this, 88, HEIGHT / 2, "nessya"));
    if (DEBUG) events.push(new EventMonSpawn(this, 60, HEIGHT / 2 - 40, "haXx"));
    events.push(new EventPlayerSpawn(this, WIDTH / 2, HEIGHT / 2, "gooh"));

    if (DEBUG) {
        GRAPHICS = this.add.graphics();
        GRAPHICS.fillStyle(0xffff00, 1.0); // yellow, full alpha

        for (let itemSpawnLocation of _gameState.itemSpawnLocations) {
            GRAPHICS.fillRect(itemSpawnLocation[0], itemSpawnLocation[1], 1, 1);
        }
    }
}

function update(t, dt) {
    gameMaster(t, dt, events)

    let event = undefined;
    let newEvent = null;
    let leftovers = [];
    while(typeof(event = events.shift()) !== 'undefined') {
        newEvent = event.update(t, dt);
        if (newEvent !== null) leftovers.push(newEvent);
    }
    Array.prototype.push.apply(events, leftovers);
}

// Game Master populates the event queue based on game state
function gameMaster(t, dt, events) {
    // Idling
    if (_gameState.idleTime > _gameState.idleThreshold) {
        if (_gameState.mon !== null) events.push(new EventIdle());
    } else {
        _gameState.idleTime += dt;
    }

    // Item spawn
    if (_gameState.itemWaitTime > _gameState.itemWaitThreshold) {
        events.push(new EventItemSpawn());
        _gameState.itemWaitTime = 0;
    } else {
        _gameState.itemWaitTime += dt;
    }
}

// Library
function distance(x1, y1, x2, y2) {
    return Phaser.Math.Distance.Between(x1, y1, x2, y2);
}
const MON_SPEED_IN_PIXEL_PER_S = 90; // TODO: make dependent on mon, 100 fastest? 80 slowest?
function monRunTimeForDistance(distance) {
    return Math.floor((distance / MON_SPEED_IN_PIXEL_PER_S) * 1000);
}
function random(min, max) {
    return Phaser.Math.RND.between(min, max);
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
