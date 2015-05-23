var rndSymbols = 'abcdefghijklmnopqrstuvwxyz1234567890';
var rndColors = ['#0008FF', '#F600FF', '#FF003F', '#FFD400', '#1DFF00', '#00FFF6'];
var maxUserId = 0;
var mapWidth = 5000;
var mapHeight = 5000;
var foodPerSecond = 10;
var maxFoodCount = 300;
var maxPricklesCount = 25;
var framesPerSecond = 10;
var frameTime = 1000 / framesPerSecond;

function generateUniqId() {
    var name = '';

    for (var i = 0; i < 10; ++i) {
        name += rndSymbols[Math.ceil(Math.random() * rndSymbols.length)];
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
                    color: rndColors[Math.ceil(Math.random() * rndColors.length)],
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
            var food = {
                id: false,
                name: false,
                x: Math.ceil(Math.random() * mapWidth),
                y: Math.ceil(Math.random() * mapHeight),
                weight: 40,
                color: '#00ff00',
                type: 'prickle'
            };

            room.push(food);
        }
    }
}

function decreaseMass() {
    for (var k = 0; k < rooms.length; ++k) {
        var room = rooms[k];

        for (var i = 0; i < room.length; ++i) {
            if (room[i].weight > 20) {
                room[i].weight -= room[i].weight / 5000;
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
                    if (room[i].type == 'user' && room[j].type == 'prickle') {
                        var dist = Math.sqrt(
                            Math.pow(room[i].x - room[j].x, 2) +
                            Math.pow(room[i].y - room[j].y, 2));

                        if (dist < room[j].weight && room[i].weight > 10) {
                            for (var m = 0; m < 5; ++m) {
                                var particle = {
                                    id: room[i].id,
                                    name: room[i].name,
                                    x: room[i].x + Math.ceil(Math.random() * 50 - 25),
                                    y: room[i].y + Math.ceil(Math.random() * 50 - 25),
                                    weight: room[i].weight / 5,
                                    color: room[i].color,
                                    type: room[i].type
                                };

                                room.push(particle);
                            }

                            //room.splice(i, 1);
                        }
                    } else if (room[i].weight - room[j].weight > 5) {
                        var dist = Math.sqrt(
                            Math.pow(room[i].x - room[j].x, 2) +
                            Math.pow(room[i].y - room[j].y, 2));

                        if (dist < room[i].weight) {
                            if (room[i].type == 'user' && room[j].type == 'user' && room[i].id != room[j].id ||
                                room[i].type == 'user' && room[j].type == 'food') {
                                
                                room[i].weight += room[j].weight / 3;
                                removedUsers[k].push(room[j]);
                                room.splice(j, 1);
                            }
                        }
                    } else if (room[j].weight - room[i].weight > 5) {
                        var dist = Math.sqrt(
                            Math.pow(room[i].x - room[j].x, 2) +
                            Math.pow(room[i].y - room[j].y, 2));

                        if (dist < room[j].weight) {
                            if (room[i].type == 'user' && room[j].type == 'user' && room[i].id != room[j].id ||
                                room[i].type == 'food' && room[j].type == 'user') {

                                room[j].weight += room[i].weight / 3;
                                removedUsers[k].push(room[i]);
                                room.splice(i, 1);
                            }
                        }
                    }
                }
            }
        }
    }
}

function calculateMoving() {
    for (var k = 0; k < rooms.length; ++k) {
        var room = rooms[k];

        for (var i = 0; i < room.length; ++i) {
            if (room[i].targetX && room[i].targetY) {
                var speed = 10;

                speed -= room[i].weight / 1000;

                if (speed <= 0) {
                    speed = 0.1;
                }

                var dist = Math.sqrt(
                    Math.pow(room[i].targetX - room[i].x, 2) +
                    Math.pow(room[i].targetY - room[i].y, 2));
                var d = speed / dist;

                if (d < 1) {
                    room[i].x += (room[i].targetX - room[i].x) * d;
                    room[i].y += (room[i].targetY - room[i].y) * d;

                    if (room[i].x < 0) {
                        room[i].x = 0;
                    }

                    if (room[i].x > mapWidth) {
                        room[i].x = mapWidth;
                    }

                    if (room[i].y < 0) {
                        room[i].y = 0;
                    }

                    if (room[i].y > mapHeight) {
                        room[i].y = mapHeight;
                    }
                }
            }
        }
    }

    for (var k = 0; k < rooms.length; ++k) {
        var room = rooms[k];
        var data = [];

        for (var i = 0; i < room.length; ++i) {
            var user = room[i];

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
                if (room[i].id) {
                    room[i].ws.send(JSON.stringify({
                        action: 'move',
                        data: data
                    }));
                }
            } catch (err) {
                room.splice(i, 1);
            }
        }

        for (var i = 0; i < removedUsers[k].length; ++i) {
            try {
                removedUsers[k][i].ws.send(JSON.stringify({
                    action: 'move',
                    data: data
                }));
            } catch (err) {
                removedUsers[k].splice(i, 1);
            }
        }
    }
}

function roomsInRoom(room) {
    var count = 0;

    for (var i = 0; i < room.length; ++i) {
        if (room[i].id) {
            ++count;
        }
    }

    return count;
}

setInterval(function () {
    updateFood();
    updatePrickles();
    decreaseMass();
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
                color: rndColors[Math.ceil(Math.random() * rndColors.length)],
                type: 'user'
            };

            var userInRoom = false;

            for (var k = 0; k < rooms.length; ++k) {
                if (roomsInRoom(rooms[k]) < 2) {
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
        }
    });

    ws.on('disconnect', function () {
        console.log('disconnect');
    });
});