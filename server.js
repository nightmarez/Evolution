var rndSymbols = 'abcdefghijklmnopqrstuvwxyz1234567890';
var rndColors = ['#0008FF', '#F600FF', '#FF003F', '#FFD400', '#1DFF00', '#00FFF6'];
var maxUserId = 0;
var mapWidth = 5000;
var mapHeight = 5000;
var foodPerSecond = 10;
var maxFoodCount = 300;
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

var users = [];
var removedUsers = [];

function updateFood() {
    for (var k = 0; k < foodPerSecond / framesPerSecond; ++k) {
        var foodCount = 0;

        for (var i = 0; i < users.length; ++i) {
            if (users[i].name == '') {
                ++foodCount;
            }
        }

        if (foodCount < maxFoodCount) {
            var food = {
                id: '',
                name: '',
                x: Math.ceil(Math.random() * mapWidth),
                y: Math.ceil(Math.random() * mapHeight),
                weight: 5,
                color: rndColors[Math.ceil(Math.random() * rndColors.length)]
            };

            users.push(food);
        }
    }
}

function decreaseMass() {
    for (var i = 0; i < users.length; ++i) {
        if (users[i].weight > 20) {
            users[i].weight -= users[i].weight / 1000;
        }
    }
}

function calculateIntersections() {
    for (var i = 0; i < users.length; ++i) {
        for (var j = 0; j < users.length; ++j) {
            if (i != j && users[i] && users[j]) {
                if (users[i].weight - users[j].weight > 5) {
                    var dist = Math.sqrt(
                        Math.pow(users[i].x - users[j].x, 2) +
                        Math.pow(users[i].y - users[j].y, 2));

                    if (dist < users[i].weight) {
                        users[i].weight += users[j].weight / 3;

                        removedUsers.push(users[j]);
                        users.splice(j, 1);
                    }
                } else if (users[j].weight - users[i].weight > 5) {
                    var dist = Math.sqrt(
                        Math.pow(users[i].x - users[j].x, 2) +
                        Math.pow(users[i].y - users[j].y, 2));

                    if (dist < users[j].weight) {
                        users[j].weight += users[i].weight / 3;

                        removedUsers.push(users[i]);
                        users.splice(i, 1);
                    }
                }
            }
        }
    }
}

function calculateMoving() {
    var data = [];

    for (var i = 0; i < users.length; ++i) {
        if (users[i].targetX && users[i].targetY) {
            var speed = 10;

            speed -= users[i].weight / 1000;

            if (speed <= 0) {
                speed = 0.1;
            }

            var dist = Math.sqrt(
                Math.pow(users[i].targetX - users[i].x, 2) +
                Math.pow(users[i].targetY - users[i].y, 2));
            var d = speed / dist;

            if (d < 1) {
                users[i].x += (users[i].targetX - users[i].x) * d;
                users[i].y += (users[i].targetY - users[i].y) * d;

                if (users[i].x < 0) {
                    users[i].x = 0;
                }

                if (users[i].x > mapWidth) {
                    users[i].x = mapWidth;
                }

                if (users[i].y < 0) {
                    users[i].y = 0;
                }

                if (users[i].y > mapHeight) {
                    users[i].y = mapHeight;
                }
            }
        }
    }

    for (var i = 0; i < users.length; ++i) {
        var user = users[i];

        data.push({
            id: user.id,
            name: user.name,
            x: user.x,
            y: user.y,
            weight: user.weight,
            color: user.color
        });
    }

    for (var i = 0; i < users.length; ++i) {
        try {
            if (users[i].id) {
                users[i].ws.send(JSON.stringify({
                    action: 'move',
                    data: data
                }));
            }
        } catch (err) {
            users.splice(i, 1);
        }
    }

    for (var i = 0; i < removedUsers.length; ++i) {
        try {
            removedUsers[i].ws.send(JSON.stringify({
                action: 'move',
                data: data
            }));
        } catch (err) {
            removedUsers.splice(i, 1);
        }
    }
}

setInterval(function() {
    if (users.length) {
        updateFood();
        decreaseMass();
        calculateIntersections();
        calculateMoving();
    }
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
                color: rndColors[Math.ceil(Math.random() * rndColors.length)]
            };

            users.push(user);
            ws.send(JSON.stringify({
                action: 'login',
                id: user.id
            }));
        } else if (ev.action == 'move') {
            for (var i = 0; i < users.length; ++i) {
                if (users[i].id == ev.id) {
                    users[i].targetX = ev.x;
                    users[i].targetY = ev.y;
                }
            }
        }
    });

    ws.on('disconnect', function () {
        console.log('disconnect');
    });
});