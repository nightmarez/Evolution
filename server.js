var rndSymbols = 'abcdefghijklmnopqrstuvwxyz1234567890';
var rndColors = ['#0008FF', '#F600FF', '#FF003F', '#FFD400', '#1DFF00', '#00FFF6'];
var maxUserId = 0;
var mapWidth = 5000;
var mapHeight = 5000;
var foodPerSecond = 10;
var maxFoodCount = 300;
var maxPricklesCount = 25;
var framesPerSecond = 20;
var frameTime = 1000 / framesPerSecond;

function generateUniqId() {
    var name = '';

    for (var i = 0; i < 10; ++i) {
        name += rndSymbols[Math.floor(Math.random() * rndSymbols.length)];
    }

    return name + (++maxUserId);
}


var WebSocketServer = require('ws').Server,
    wss = new WebSocketServer({ port: 1337 });

var rooms = [];
var removedUsers = [];

function updateFood() {
    for (var j = 0; j < rooms.length; ++j) {
        var room = rooms[j];

        for (var k = 0; k < foodPerSecond / framesPerSecond; ++k) {
            var foodCount = 0;

            for (var i = 0; i < room.length; ++i) {
                if (!room[i].id) {
                    ++foodCount;
                }
            }

            if (foodCount < maxFoodCount) {
                var food = {
                    id: false,
                    name: false,
                    x: Math.ceil(Math.random() * mapWidth),
                    y: Math.ceil(Math.random() * mapHeight),
                    weight: 5,
                    color: rndColors[Math.floor(Math.random() * rndColors.length)],
                    type: 'food'
                };

                room.push(food);
            }
        }
    }
}

function updatePrickles() {
    for (var k = 0; k < rooms.length; ++k) {
        var room = rooms[k];
        var count = 0;

        for (var i = 0; i < room.length; ++i) {
            var item = room[i];

            if (item.type == 'prickle') {
                ++count;
            }
        }

        while (count++ < maxPricklesCount) {
            var prickle = {
                id: false,
                name: false,
                x: Math.ceil(Math.random() * mapWidth),
                y: Math.ceil(Math.random() * mapHeight),
                weight: 50,
                color: '#00ff00',
                type: 'prickle'
            };

            room.push(prickle);
        }
    }
}

function decreaseMass() {
    for (var k = 0; k < rooms.length; ++k) {
        var room = rooms[k];

        for (var i = 0; i < room.length; ++i) {
            if (room[i].weight > 20) {
                room[i].weight -= room[i].weight / 10000;
            }
        }
    }
}

function calculateIntersections() {
    for (var k = 0; k < rooms.length; ++k) {
        var room = rooms[k];

        for (var i = 0; i < room.length; ++i) {
            for (var j = 0; j < room.length; ++j) {
                if (i != j && room[i] && room[j]) {
                    var user1 = room[i];
                    var user2 = room[j];

                    if (user1.type == 'user') {
                        if (user2.type == 'user' || user2.type == 'bot') {
                            if (user1.id != user2.id) {
                                var dist = Math.sqrt(
                                    Math.pow(user1.x - user2.x, 2) +
                                    Math.pow(user1.y - user2.y, 2));

                                if (dist < user1.weight) {
                                    user1.weight += user2.weight;
                                    removedUsers[k].push(user2);
                                    room.splice(j--, 1);
                                }
                            }
                        } else if (user2.type == 'prickle') {
                            var dist = Math.sqrt(
                                Math.pow(user1.x - user2.x, 2) +
                                Math.pow(user1.y - user2.y, 2));

                            if (dist < user2.weight && user1.weight > 50) {
                                for (var m = 0; m < 5; ++m) {
                                    var particle = {
                                        id: user1.id,
                                        name: user1.name,
                                        x: user1.x + Math.ceil(Math.random() * 500 - 250),
                                        y: user1.y + Math.ceil(Math.random() * 500 - 250),
                                        weight: user1.weight / 3,
                                        color: user1.color,
                                        type: user1.type
                                    };

                                    room.push(particle);
                                }

                                room.splice(i--, 1);
                                removedUsers[k].push(user1);
                                room.splice(j--, 1);
                            }
                        } else if (user2.type == 'food') {
                            var dist = Math.sqrt(
                                Math.pow(user1.x - user2.x, 2) +
                                Math.pow(user1.y - user2.y, 2));

                            if (dist < user1.weight) {
                                user1.weight += user2.weight / 3;
                                removedUsers[k].push(user2);
                                room.splice(j--, 1);
                            }
                        }
                    }
                }
            }
        }
    }
}

function calculateMoving() {
    var user;

    for (var k = 0; k < rooms.length; ++k) {
        var room = rooms[k];

        for (var i = 0; i < room.length; ++i) {
            user = room[i];

            if (room[i].targetX && room[i].targetY) {
                var speed = 5;

                speed -= room[i].weight / 1000;

                if (speed <= 0) {
                    speed = 0.1;
                }

                var dist = Math.sqrt(
                    Math.pow(user.targetX - user.x, 2) +
                    Math.pow(user.targetY - user.y, 2));
                var d = speed / dist;

                if (d < 1) {
                    user.x += (user.targetX - user.x) * d;
                    user.y += (user.targetY - user.y) * d;

                    if (user.x < 0) {
                        user.x = 0;
                    }

                    if (user.x > mapWidth) {
                        user.x = mapWidth;
                    }

                    if (user.y < 0) {
                        user.y = 0;
                    }

                    if (user.y > mapHeight) {
                        user.y = mapHeight;
                    }
                }
            }
        }
    }

    for (var k = 0; k < rooms.length; ++k) {
        var room = rooms[k];
        var data = [];

        for (var i = 0; i < room.length; ++i) {
            user = room[i];

            data.push({
                id: user.id,
                name: user.name,
                x: user.x,
                y: user.y,
                weight: user.weight,
                color: user.color,
                type: user.type
            });
        }

        for (var i = 0; i < room.length; ++i) {
            try {
                if (room[i].id && room[i].ws) {
                    room[i].ws.send(JSON.stringify({
                        action: 'move',
                        data: data
                    }));
                }
            } catch (err) {
                room.splice(i--, 1);
            }
        }

        for (var i = 0; i < removedUsers[k].length; ++i) {
            try {
                removedUsers[k][i].ws.send(JSON.stringify({
                    action: 'move',
                    data: data
                }));
            } catch (err) {
                for (var m = 0; m < room.length; ++m) {
                    if (room[m].id == removedUsers[k].id) {
                        room.splice(m--, 1);
                    }
                }

                removedUsers[k].splice(i--, 1);
            }
        }
    }
}

function usersInRoom(room) {
    var count = 0;

    for (var i = 0; i < room.length; ++i) {
        if (room[i].id) {
            ++count;
        }
    }

    return count;
}

function isNameExistsInRoom(room, name) {
    for (var i = 0; i < room.length; ++i) {
        if (room[i].name == name) {
            return true;
        }
    }

    return false;
}

var botNames = ['Whisky', 'Pendos', 'Hohol', 'Zhopa', 'USSR', 'MotherFucker', 'Bear', 'Beaver', 'Mamka', 'LoL', 'KissMyAssHole', 'Zaraza'];

function createBots() {
    'strict';

    for (let k = 0; k < rooms.length; ++k) {
        let room = rooms[k];

        while (usersInRoom(room < 5)) {
            let name = botNames[Math.floor(Math.random() * botNames.length)];

            do {
                name = botNames[Math.floor(Math.random() * botNames.length)];
            } while (isNameExistsInRoom(room, name));

            let bot = {
                id: false,
                name: false,
                x: Math.ceil(Math.random() * mapWidth),
                y: Math.ceil(Math.random() * mapHeight),
                weight: 50,
                color: rndColors[Math.floor(Math.random() * rndColors.length)],
                type: 'bot'
            };

            room.push(bot);
        }
    }
}

setInterval(function () {
    updateFood();
    updatePrickles();
    decreaseMass();
    createBots();
    calculateIntersections();
    calculateMoving();
}, frameTime);

wss.on('connection', function (ws) {
    ws.on('message', function (message) {
        var ev = JSON.parse(message);

        if (ev.action == 'login') {
            var id = generateUniqId();
            var userName = ev.name;

            if (userName.length > 15) {
                userName = userName.substr(0, 15);
            }

            var user = {
                id: id,
                name: userName,
                x: Math.random() * 4000 + 500,
                y: Math.random() * 4000 + 500,
                ws: ws,
                weight: 20,
                color: rndColors[Math.floor(Math.random() * rndColors.length)],
                type: 'user'
            };

            var userInRoom = false;

            for (var k = 0; k < rooms.length; ++k) {
                if (usersInRoom(rooms[k]) < 25) {
                    rooms[k].push(user);
                    userInRoom = true;
                    break;
                }
            }

            if (!userInRoom) {
                var room = [];
                room.push(user);
                rooms.push(room);
                removedUsers.push([]);
            }
            
            ws.send(JSON.stringify({
                action: 'login',
                id: user.id
            }));
        } else if (ev.action == 'move') {
            for (var k = 0; k < rooms.length; ++k) {
                var room = rooms[k];

                for (var i = 0; i < room.length; ++i) {
                    if (room[i].id == ev.id) {
                        room[i].targetX = ev.x;
                        room[i].targetY = ev.y;
                    }
                }
            }
        } else if (ev.action == 'division') {
            var id = ev.id;

            for (var k = 0; k < rooms.length; ++k) {
                var room = rooms[k];

                for (var i = 0; i < room.length; ++i) {
                    var item = room[i];

                    if (item.weight > 50) {
                        var particle = {
                            id: item.id,
                            name: item.name,
                            x: item.x + 200,
                            y: item.y,
                            weight: item.weight / 2,
                            color: item.color,
                            type: item.type
                        };

                        room.push(particle);
                        room[i].weight /= 2;
                    }
                }
            }
        }
    });
});