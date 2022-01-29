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
            evo: {}
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
    }
}
function sanitizeKind(kind) {
    if (DB.mons.map(m => m.name).some(n => n === kind)) {
        return kind;
    }
    return 'Glitchee';
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
    /*
    this.load.image('btn_back', 'a/back.png');
    this.load.image('btn1', 'a/su1.png');
    this.load.image('btn2', 'a/su2.png');
    this.load.image('btn3', 'a/su3.png');
    this.load.image('btn4', 'a/su4.png');
    */

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
    friends: []
};

// Events
class NMEvent {
    constructor() { }
    update(t, dt) { return null; } // Return this if you want to keep event, return null if done processing and drop it
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
    constructor(x, y, kind) {
        super();
        this.mon = newMon(_gameState.scene, x, y, kind);
        // Out of bounds? Move to center, used for friends
        if (x < 0 || x >= BASE_SIZE || y < 0 || y >= BASE_SIZE)
            this.mon.moveTo(BASE_SIZE / 2 + random(-40, 40), BASE_SIZE / 2 + random(-40, 40));
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
        let locationCoords = [..._gameState.itemSpawnLocations[locationIdx]];
        locationCoords[0] += random(-2, 2);
        locationCoords[1] += random(-2, 2);
        let itemName = DB.items[random(0, DB.items.length - 1)].name;
        if (_gameState.items[locationIdx] !== null) {
            _gameState.items[locationIdx].destroy();
            _gameState.items[locationIdx] = null;
        }
        _gameState.items[locationIdx] = _gameState.scene.add.sprite(locationCoords[0], locationCoords[1], itemName.toLowerCase()).setInteractive();
        _gameState.items[locationIdx].setDepth(locationCoords[1] - ITEM_SIZE / 2);
        _gameState.items[locationIdx].itemName = itemName;
        _gameState.items[locationIdx].on('pointerdown', (pointer) => {
            events.push(new EventTap(Math.floor(pointer.x), Math.floor(pointer.y), locationIdx));
        });
    }
}
class EventItemConsume extends NMEvent {
    constructor(mon, itemIdx) {
        super();
        if (_gameState.items[itemIdx] !== null) {
            let itemId = DB.items.map(i => i.name).indexOf(_gameState.items[itemIdx].itemName);
            if (itemId < 4) _gameState.stomach.push(itemId); // 4 is Phone, below is food
            if (itemId === 4) events.push(new EventCallFriend());
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
    constructor(toMon) {
        super();
        let friendURL = prompt("Whom to call?") || "";
        if (friendURL === "") return;
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
        _gameState.friends.push(event.mon);
        events.push(new EventFriendLeave());
    }
}
class EventFriendLeave extends NMEvent {
    constructor() {
        super();
        this.timer = 0;
    }
    update(t, dt) {
        this.timer += dt;
        if (this.timer >= 20000) {
            let friend = _gameState.friends.shift();
            if (friend !== undefined) friend.leave();
            return null;
        }
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
    kind = sanitizeKind(kind);
    let sprite = scene.add.follower(null, x, y, kind.toLowerCase());
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
        let pos = this.getPos();
        let flip = this.sprite.flipX;
        this.sprite.destroy();
        this.sprite = this.scene.add.follower(null, pos.x, pos.y, toKind.toLowerCase())
        this.sprite.setFlipX(flip);
        this.sprite.setDepth(pos.y);
        this.kind = toKind;
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
        sprite: sprite,
        scene: scene,
        getPos: getPos,
        moveTo: moveTo,
        moveToItem: moveToItem,
        evolve: evolve,
        leave: leave
    }
}

function onTap(pointer) {
    let x = Math.floor(pointer.x);
    let y = Math.floor(pointer.y);
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

    if (DEBUG) {
        events.push(new EventMonSpawn(18, HEIGHT / 2, "Trolmon"));
        events.push(new EventMonSpawn(53, HEIGHT / 2, "Drakano"));
        events.push(new EventMonSpawn(88, HEIGHT / 2, "Nessya"));
        events.push(new EventMonSpawn(60, HEIGHT / 2 - 40, "haXx"));
    }

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
