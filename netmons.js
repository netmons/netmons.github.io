"use strict";

/*
Copyright (c) 2022 Oliver "oz" Z.
This software is free-as-in-freedom and licensed under GNU AGPLv3.

See LICENSE.txt for details!
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

/*
* Each Mon has a (typed) Special Attack
* Each Mon has a (untyped) Neutral Attack
* Range can be avoided, melee attacks only work in melee range
* Utility abilities?
*/
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
        {
            name: "Phone"
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
            evo: {
                "1234": "Gooh"
            }
        },
        {
            name: "Gooh",
            type: 0,
            stats: [15, 5, 5, 5],
            melee: 1,
            range: null,
            evo: {
                "1113": "Trolmon",
                "1222": "Drakano",
                "2333": "Nessya",
                "4444": "Glomon",
            }
        },
        {
            name: "Trolmon",
            type: 1,
            stats: [30, 10, 10, 10],
            melee: 3,
            range: 2,
            evo: {
                "2222": "Gooh"
            }
        },
        {
            name: "Drakano",
            type: 2,
            stats: [30, 10, 10, 10],
            melee: 5,
            range: 4,
            evo: {
                "3333": "Gooh"
            }
        },
        {
            name: "Nessya",
            type: 3,
            stats: [30, 10, 10, 10],
            melee: 7,
            range: 6,
            evo: {
                "1111": "Gooh"
            }
        },
        {
            name: "Glomon",
            type: 2, // Neutral (0) type would be more accurate, but it should glow at night for now (like fire types do)!
            stats: [30, 10, 10, 10],
            melee: 0,
            range: null,
            evo: {
                "1234": "Gooh"
            }
        }
    ],
    phonebook: {
        "ghostbusters": {url: "https://www.youtube.com/watch?v=Fe93CLbHjxQ", embeddable: false},
        "god": {url: "https://www.youtube.com/watch?v=79fzeNUqQbQ", embeddable: false},
        "rick astley": {url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", embeddable: false},
        "adventures": {url: youtubeAutoplayURL("MkNeIUgNPQ8"), embeddable: true}, // A Himitsu
        "stop": {url: "", embeddable: true},
        "mute": {url: "", embeddable: true},
        "off": {url: "", embeddable: true},
        "sound off": {url: "", embeddable: true},
    },
    decor: {
        grasses: ["grass0", "grass1", "grass2", "grass3"],
        flowers: ["flower1", "flower2"]
    }
}
function sanitizeKind(kind) {
    if (DB.mons.map(m => m.name).some(n => n === kind)) {
        return kind;
    }
    return 'Glitchee';
}
function dbEntryForKind(kind) {
    kind = sanitizeKind(kind);
    return DB.mons.filter(m => m.name === kind)[0];
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
    loadAsset(this, "sun");
    loadAsset(this, "moon");
    loadAsset(this, "sky");
    loadAsset(this, "ground");

    loadAsset(this, "evolution");

    this.load.spritesheet('flowers', "a/suflowers.png", {frameWidth: 16, frameHeight: 16});

    for (let item of DB.items) {
        loadAsset(this, item.name);
    }
    for (let mon of DB.mons) {
        loadAsset(this, mon.name);
    }
    for (let grass of DB.decor.grasses) {
        loadAsset(this, grass);
    }
}

let GRAPHICS;
let events = [];
let _gameState = {
    scene: null,
    mon: null,
    stomach: [],
    maxStomachSize: 4,
    idleThreshold: 5000,
    itemWaitTime: 0,
    itemWaitThreshold: 8000,
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
    ],
    sun: null,
    moon: null,
    tint: 0xFFFFFF
};

// Events
class NMEvent {
    constructor() { }
    update(t, dt) { return null; } // Return this if you want to keep event, return null if done processing and drop it
}
class EventMonMoveTo extends NMEvent {
    constructor(mon, x, y, item=null) {
        super();
        this.mon = mon;
        this.x = x;
        this.y = y;
        this.item = item;
    }
    update(t, dt) {
        if (this.mon !== null) {
            this.mon.idleTime = 0;
            if (this.item !== null) {
                this.mon.moveToItem(this.item);
            } else {
                this.mon.moveTo(this.x, this.y);
            }
        }
        return null;
    }
}
class EventTap extends EventMonMoveTo {
    constructor(x, y, item=null) {
        super(_gameState.mon, x, y, item);
    }
}
class EventMonSpawn extends NMEvent {
    constructor(x, y, kind) {
        super();
        this.mon = newMon(_gameState.scene, x, y, kind);
        this.x = x;
        this.y = y;
    }
    update(t, dt) {
        // Out of bounds? Move to center, used for friends
        if (this.x < 0 || this.x >= BASE_SIZE || this.y < 0 || this.y >= BASE_SIZE)
            this.mon.moveTo(BASE_SIZE / 2 + random(-40, 40), BASE_SIZE / 2 + random(-40, 40));
        return null;
    }
}
class EventPlayerSpawn extends EventMonSpawn {
    constructor(x, y, kind) {
        super(x, y, kind);
        _gameState.mon = this.mon;
        setFavicon(`a/su${_gameState.mon.kind.toLowerCase()}.png`);
    }
}
const IDLE_RANGE = 32;
class EventIdle extends EventMonMoveTo {
    constructor(mon) {
        let pos = mon.getPos();
        super(mon, pos.x, pos.y);
        this.idleThreshold = random(3500, 7000);
    }
    update(t, dt) {
        if (this.mon.idleCount !== undefined) {
            if (this.mon.idleTime >= this.idleThreshold) {
                if (this.mon.idleCount > 0) {
                    events.push(new EventIdle(this.mon));
                } else {
                    events.push(new EventFriendLeave(this.mon));
                    return null;
                }
                this.mon.idleCount -= 1;
            } else {
                this.mon.idleTime += dt;
                return this;
            }
        }
        let pos = this.mon.getPos();
        this.x = pos.x + random(-IDLE_RANGE, IDLE_RANGE);
        this.y = pos.y + random(-IDLE_RANGE, IDLE_RANGE);
        return super.update(t, dt);
    }
}
class EventItemSpawn extends NMEvent {
    constructor() {
        super();
        let locationIdx = this._determineLocation();
        let locationCoords = [..._gameState.itemSpawnLocations[locationIdx]];
        locationCoords[0] += random(-2, 2);
        locationCoords[1] += random(-2, 2);
        let itemName = DB.items[random(0, DB.items.length - 1)].name;
        this._destroyLocationIfNeeded(locationIdx);
        _gameState.items[locationIdx] = _gameState.scene.add.sprite(locationCoords[0], locationCoords[1], itemName.toLowerCase()).setInteractive();
        _gameState.items[locationIdx].setDepth(locationCoords[1] - ITEM_SIZE / 2);
        _gameState.items[locationIdx].setTint(_gameState.tint);
        _gameState.items[locationIdx].itemName = itemName;
        _gameState.items[locationIdx].on('pointerdown', (pointer) => {
            events.push(new EventTap(Math.floor(pointer.x), Math.floor(pointer.y), locationIdx));
        });
    }
    _determineLocation() {
        let freeLocationIndices = [0, 1, 2, 3].filter(idx => _gameState.items[idx] === null);
        if (freeLocationIndices.length > 0) {
            return freeLocationIndices[random(0, freeLocationIndices.length - 1)];
        }
        return random(0, 3);
    }
    _destroyLocationIfNeeded(locationIdx) {
        if (_gameState.items[locationIdx] !== null) {
            _gameState.items[locationIdx].destroy();
        }
    }
}
class EventItemConsume extends NMEvent {
    constructor(mon, itemIdx) {
        super();
        if (_gameState.items[itemIdx] !== null) {
            let itemId = DB.items.map(i => i.name).indexOf(_gameState.items[itemIdx].itemName);
            if (itemId === 4) { // 4 is Phone
                let friendURL = prompt("Whom to call?") || "";
                if (friendURL === "") {
                    _gameState.stomach.push(itemId);
                } else {
                    events.push(new EventCallFriend(friendURL));
                }
            } else {
                _gameState.stomach.push(itemId);
            }
            _gameState.items[itemIdx].destroy();
            _gameState.items[itemIdx] = null;
            while (_gameState.stomach.length > _gameState.maxStomachSize || (itemId == 0 && _gameState.stomach.length > 0)) {
                _gameState.stomach.shift();
            }
            writeStateToURL();
            if (_gameState.stomach.length === 4) {
                let stomachString = [..._gameState.stomach].sort().reduce((a, b) => String(a) + String(b));
                let monKind = _gameState.mon.kind;
                let maybeEvolution = DB.mons.filter(mon => mon.name === monKind).map(mon => mon.evo[stomachString]).shift();
                if (maybeEvolution !== undefined) events.push(new EventEvolution(maybeEvolution));
            }
        }
    }
}
class EventEvolution extends NMEvent {
    constructor(toMon) {
        super();
        if (_gameState.mon !== null) {
            _gameState.mon.evolve(toMon);
            _gameState.stomach = [];
            setFavicon(`a/su${toMon.toLowerCase()}.png`);
            writeStateToURL();
        }
    }
}
class EventCallFriend extends NMEvent {
    constructor(friendURL) {
        super();
        let phonebookEntry = DB.phonebook[friendURL.toLowerCase()];
        if (phonebookEntry !== undefined) {
            events.push(new EventJukebox(phonebookEntry.url, phonebookEntry.embeddable));
            return;
        }
        this._inviteFriend(friendURL);
    }
    _inviteFriend(friendURL) {
        let friendState = readStateFromURL(friendURL);
        let x = (random(0, 1) === 0) ? -32 : BASE_SIZE + 32;
        let y = 150 + random(-BASE_SIZE / 4, BASE_SIZE / 4);
        let event = new EventMonSpawn(x, y, friendState.kind);
        events.push(event);
        event.mon.idleCount = random(5, 8); // Friends leave after idling a few times
        events.push(new EventIdle(event.mon));
    }
}
class EventFriendLeave extends NMEvent {
    constructor(mon) {
        super();
        this.mon = mon;
        this.timer = 0;
    }
    update(t, dt) {
        if (this.timer >= 1000) {
            this.mon.leave();
            return null;
        }
        this.timer += dt;
        return this;
    }
}
class EventJukebox extends NMEvent {
    constructor(url, embeddable=false) {
        super();
        this.url = url;
        this.embeddable = embeddable;
    }
    update(t, dt) {
        if (this.embeddable) {
            document.getElementById("jukebox").src = this.url;
        } else {
            window.location.href = this.url;
        }
        return null;
    }
}

// Mon
function newMon(scene, x, y, kind) {
    let dbEntry = dbEntryForKind(kind);
    kind = dbEntry.name;
    let sprite = scene.add.follower(null, x, y, kind.toLowerCase());
    sprite.setDepth(y);
    if (dbEntry.type == 2) {
        sprite.toggleData("burns");
    } else {
        sprite.setTint(_gameState.tint);
    }

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
        this.sprite.setFlipX(x > pos.x);

        // HACK: hardcoded game area, consider onclick on sprites/game area later
        if (x < HALF_SPRITE_SIZE) x = HALF_SPRITE_SIZE;
        if (x >= BASE_SIZE - HALF_SPRITE_SIZE) x = BASE_SIZE - HALF_SPRITE_SIZE;
        if (y < 56) y = 56;
        if (y >= BASE_SIZE - HALF_SPRITE_SIZE) y = BASE_SIZE - HALF_SPRITE_SIZE;

        this.sprite.setPath(new Phaser.Curves.Path(pos.x, pos.y).lineTo(x, y));
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
    function evolve(toKind) {
        let dbEntry = dbEntryForKind(toKind);
        let pos = this.getPos();
        let flip = this.sprite.flipX;
        this.sprite.destroy();
        this.sprite = this.scene.add.follower(null, pos.x, pos.y, toKind.toLowerCase())
        this.sprite.setFlipX(flip);
        this.sprite.setDepth(pos.y);
        this.kind = toKind;
        this.type = dbEntry.type;
        if (this.type == 2) {
            this.sprite.toggleData("burns");
        } else {
            this.sprite.setTint(_gameState.tint);
        }
        _evoFX(this.scene, pos);
    }
    function _evoFX(scene, pos) {
        let evoFX = scene.add.follower(null, pos.x, pos.y, "evolution");
        evoFX.setPath(new Phaser.Curves.Path(pos.x, pos.y).lineTo(pos.x, pos.y - 40));
        evoFX.setDepth(pos.y + 1);
        evoFX.toggleData("burns");
        evoFX.startFollow({
            positionOnPath: true,
            duration: 500,
            repeat: 0,
            rotateToPath: false,
            onComplete: () => { evoFX.destroy(); },
        });
    }
    function leave() {
        let x = (random(0, 1) === 0) ? -32 : BASE_SIZE + 32;
        let y = 150 + random(-BASE_SIZE / 4, BASE_SIZE / 4);
        let pos = this.getPos();
        this.sprite.setFlipX(x > pos.x);

        this.sprite.setPath(new Phaser.Curves.Path(pos.x, pos.y).lineTo(x, y));
        this.sprite.startFollow({
            positionOnPath: true,
            duration: monRunTimeForDistance(distance(pos.x, pos.y, x, y)),
            repeat: 0,
            rotateToPath: false,
            onComplete: () => { this.sprite.destroy() }
        });
    }

    return {
        kind: kind,
        type: dbEntry.type,
        sprite: sprite,
        scene: scene,
        idleTime: 0,
        getPos: getPos,
        moveTo: moveTo,
        moveToItem: moveToItem,
        evolve: evolve,
        leave: leave
    }
}

function onTap(pointer) {
    events.push(new EventTap(Math.floor(pointer.x), Math.floor(pointer.y)));
}
function create() {
    _gameState.scene = this;

    // Background
    let sky = this.add.image(WIDTH / 2, 60, 'sky');
    _gameState.sun = this.add.image(2 * BASE_SIZE, 0, 'sun');
    _gameState.moon = this.add.image(2 * BASE_SIZE, 0, 'moon');
    let ground = this.add.sprite(WIDTH / 2, HEIGHT / 2, 'ground').setInteractive();

    this.anims.create({
        key: "flower1",
        frames: this.anims.generateFrameNumbers("flowers", {frames: [0, 1]}),
        frameRate: 1,
        repeat: -1
    });
    this.anims.create({
        key: "flower2",
        frames: this.anims.generateFrameNumbers("flowers", {frames: [2, 3]}),
        frameRate: 1,
        repeat: -1,
        repeatDelay: 500
    });

    for (let i = 0; i < 32; i++) {
        this.add.image(0 + random(0, BASE_SIZE), 60 + random(0, BASE_SIZE - 60), 'grass' + random(0, 3));
    }

    for (let i = 0; i < 6; i++) {
        let flower = this.add.sprite(0 + random(0, BASE_SIZE), 60 + random(0, BASE_SIZE - 60));
        flower.setDepth(flower.y - ITEM_SIZE / 2);
        flower.play("flower" + random(1, 2));
    }

    //this.input.on('pointerdown', onTap, this);
    ground.on('pointerdown', onTap);

    let initialState = readStateFromURL(window.location.href);
    events.push(new EventPlayerSpawn(WIDTH / 2, HEIGHT / 2, initialState.kind));
    _gameState.stomach = initialState.stomach;

    if (DEBUG) {
        GRAPHICS = this.add.graphics();
        GRAPHICS.fillStyle(0xffff00, 1.0); // yellow, full alpha

        for (let itemSpawnLocation of _gameState.itemSpawnLocations) {
            GRAPHICS.fillRect(itemSpawnLocation[0], itemSpawnLocation[1], 1, 1);
        }
    }
}

function update(t, dt) {
    gameMaster(t, dt);

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
let celestialUpdate = 60001;
function gameMaster(t, dt) {
    // Idling
    if (_gameState.mon !== null) {
        if (_gameState.mon.idleTime > _gameState.idleThreshold) {
            events.push(new EventIdle(_gameState.mon));
            _gameState.idleThreshold = random(3500, 7000);
        } else {
            _gameState.mon.idleTime += dt;
        }
    }

    // Item spawn
    if (_gameState.itemWaitTime > _gameState.itemWaitThreshold) {
        events.push(new EventItemSpawn());
        _gameState.itemWaitTime = 0;
    } else {
        _gameState.itemWaitTime += dt;
    }

    // Sun / moon
    if (celestialUpdate >= 60000) {
        updateCelestials();
        celestialUpdate = 0;
    } else {
        celestialUpdate += dt;
    }
}
/*
Sun:
1440 --> -BASE_SIZE / 2  (-120)
1080 ---> 0
720 ---> BASE_SIZE / 2   (120)
360.0 --> BASE_SIZE      (240)
0    -->                 (360)

Moon:
0    --> BASE_SIZE / 2   (120)
360  --> 0               0
720  -->                 -120 / 360
1080 --> BASE_SIZE       (240)
1440 -->                 (120)
*/
function updateCelestials() {
    let minutes = minutesOfDay();
    let dayProgressInBaseSizes = ((1440.0 - minutes) / 1440.0) * (2 * BASE_SIZE); // 12h ~= 1 BASE_SIZE
    let sunX = Math.round(dayProgressInBaseSizes - (BASE_SIZE / 2));
    _gameState.sun.x = sunX;
    _gameState.sun.y = celestialHeight(_gameState.sun.x);
    _gameState.moon.x = (sunX < 120) ? sunX + BASE_SIZE : sunX - BASE_SIZE;
    _gameState.moon.y = celestialHeight(_gameState.moon.x);
    tintGame(minutes);
    if (DEBUG) console.log("Minutes", minutes, "sunX", _gameState.sun.x, "sunY", _gameState.sun.y, "moonX", _gameState.moon.x, "moonY", _gameState.moon.y);
}
function minutesOfDay() {
    let d = new Date();
    let hours = d.getHours();
    let minutes = d.getMinutes();
    return hours * 60 + minutes;
}
function celestialHeight(x) {
    return Math.round(50 - 60 * Math.sin((x / BASE_SIZE) * Math.PI));
}
const DARKEST_COLOR = 0x33; // Formerly:  0x444499; // 68, 68, 153
const NIGHT_BLUE = 0x88;
const TO_LIGHTEST = 0xFF - DARKEST_COLOR;
function tintGame(minutes) {
    let tint = 0xFFFFFF;
    if (minutes < 360 || minutes >= 1080) {
        let darkMinutes = (minutes < 360) ? minutes : (1440 - minutes); // 6h (360min) before and after Midnight. The closer to Midnight, the darker
        let darkeningRate = darkMinutes / 300;
        let rg = Math.min(Math.ceil(DARKEST_COLOR + darkeningRate * TO_LIGHTEST), 255);
        let b = Math.min(Math.ceil(NIGHT_BLUE + darkeningRate * TO_LIGHTEST), 255);
        tint = rgbToInt(rg, rg, b);
    }
    updateGameTint(tint);
}
function updateGameTint(tint) {
    _gameState.tint = tint;
    if (DEBUG) console.log("Scene children", _gameState.scene.children.length);
    for (let gameObj of _gameState.scene.children.getChildren()) {
        if (gameObj != _gameState.moon
            && gameObj != _gameState.sun
            && !gameObj.getData("burns")) { // Fire types don't lack light!
            gameObj.setTint(tint);
        }
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
function setFavicon(url) {
    let link = document.querySelector("link[rel~='icon']");
    link.href = url;
}
function readStateFromURL(urlStr) {
    let url;
    let kind = 'Gooh';
    let stomach = [];
    try {
        url = new URL(urlStr);
        let parts = String(url.searchParams.get('s') || '').trim().split('-');
        for (let part of parts) {
            switch(part[0]) {
                case 'k':
                    kind = part.substring(1);
                    break;
                case 's':
                    stomach = Array.from(part.substring(1)).map(s => Number(s));
                    break;
            }
        }
    } catch (_) { }
    return {
        kind: sanitizeKind(kind),
        stomach: stomach
    }
}
function writeStateToURL() {
    let kind = _gameState.mon.kind;
    let stomach = "";
    if (_gameState.stomach.length > 0) {
        stomach = _gameState.stomach.reduce((a, b) => String(a) + String(b));
    }

    let stateStr = String(`k${kind}-s${stomach}`);
    var queryParams = new URLSearchParams(window.location.search);
    queryParams.set("s", stateStr);
    history.replaceState(null, null, "?"+queryParams.toString());
}
function youtubeAutoplayURL(videoID) {
    return `https://www.youtube-nocookie.com/embed/${videoID}?autoplay=1&rel=0&loop=1&controls=0`;
}
function rgbToInt(red, green, blue) {
    return Phaser.Display.Color.GetColor(red, green, blue);
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
