var userId = false;
var ws = false;
var centerX = 0, centerY = 0;

function initGame(userName) {
    //ws = new WebSocket('ws://46.161.3.218:1337');
    ws = new WebSocket('ws://localhost:1337');

    ws.onmessage = function (message) {
        var ev = JSON.parse(message.data);
        
        if (ev.action == 'move') {
            var canvas = document.getElementById('canvas');
            var ctx = canvas.getContext('2d');
            ctx.save();

            // calculate view
            {
                var currentUsers = [];

                for (var i = 0; i < ev.data.length; ++i) {
                    var user = ev.data[i];

                    if (user.id == userId) {
                        currentUsers.push(user);
                    }
                }

                if (currentUsers.length) {
                    var minX = Number.MAX_VALUE,
                        minY = Number.MAX_VALUE,
                        maxX = 0,
                        maxY = 0;

                    centerX = 0;
                    centerY = 0;

                    for (var i = 0; i < currentUsers.length; ++i) {
                        var currentUser = currentUsers[i];

                        if (currentUser.x > maxX) {
                            maxX = currentUser.x;
                        }

                        if (currentUser.x < minX) {
                            minX = currentUser.x;
                        }

                        if (currentUser.y > maxY) {
                            maxY = currentUser.y;
                        }

                        if (currentUser.y < minY) {
                            minY = currentUser.y;
                        }

                        centerX += currentUser.x;
                        centerY += currentUser.y;
                    }

                    centerX /= currentUsers.length;
                    centerY /= currentUsers.length;
                    centerX -= $(canvas).width() / 2;
                    centerY -= $(canvas).height() / 2;

                    if (centerX < $(canvas).width() / 2) {
                        centerX = $(canvas).width() / 2;
                    }

                    if (centerX > 5000 - $(canvas).width() / 2) {
                        centerX = 5000 - $(canvas).width() / 2;
                    }

                    if (centerY < $(canvas).height() / 2) {
                        centerY = $(canvas).height() / 2;
                    }

                    if (centerY > 5000 - $(canvas).height() / 2) {
                        centerY = 5000 - $(canvas).height() / 2;
                    }

                    ctx.translate(-centerX, -centerY);

                    var currWidth = maxX - minX;
                    var currHeight = maxY - minY;

                    var targetWidth = currWidth * 2;
                    var targetHeight = currHeight * 2;

                    var scaleX = 1;
                    var scaleY = 1;

                    if (targetWidth > $(canvas).width()) {
                        scaleX = $(canvas).width() / targetWidth;
                    }

                    if (targetHeight > $(canvas).height()) {
                        scaleY = $(canvas).height() / targetHeight;
                    }

                    var maxScale = scaleX < scaleY ? scaleX : scaleY;
                    ctx.scale(maxScale, maxScale);
                }
            }
            
            ctx.fillStyle = "lightblue";
            ctx.fillRect(0, 0, 5000, 5000);

            // draw grid
            {
                ctx.strokeWidth = 1;
                ctx.beginPath();

                for (var i = 0; i < 25; ++i) {
                    ctx.strokeStyle = '#87BFE5';

                    ctx.moveTo(0, i * 200);
                    ctx.lineTo(5000, i * 200);
                    ctx.stroke();

                    ctx.moveTo(i * 200, 0);
                    ctx.lineTo(i * 200, 5000);
                    ctx.stroke();
                }

                ctx.closePath();
            }

            for (var i = 0; i < ev.data.length; ++i) {
                var user = ev.data[i];

                if (user.type == 'prickle') {
                    ctx.fillStyle = user.color;
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = '#003300';
                    ctx.beginPath();

                    ctx.moveTo(
                        user.x + Math.sin(0) * user.weight,
                        user.y + Math.cos(0) * user.weigh);

                    for (var j = 0, k = 0; j < 360; j += 9, ++k) {
                        var g = j * Math.PI / 180;

                        ctx.lineTo(
                            user.x + Math.sin(g) * user.weight * (k % 2 ? 1.2 : 1),
                            user.y + Math.cos(g) * user.weight * (k % 2 ? 1.2 : 1));
                    }

                    ctx.closePath();
                    ctx.stroke();
                    ctx.fill();
                } else {
                    ctx.beginPath();
                    ctx.arc(user.x, user.y, user.weight, 0, 2 * Math.PI, false);
                    ctx.fillStyle = user.color;
                    ctx.fill();
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = '#003300';
                    ctx.stroke();

                    ctx.fillStyle = "#FFFFFF";
                    ctx.font = "normal 16pt Arial";
                    ctx.textAlign = "center";
                    ctx.fillText(user.name || '', user.x, user.y + 8);
                }
            }

            ctx.restore();

            // users top
            {
                var usersTop = [];

                for (var i = 0; i < 10; ++i) {
                    usersTop.push({
                        name: false,
                        weight: 0
                    });
                }

                for (var i = 0; i < ev.data.length; ++i) {
                    var user = ev.data[i];

                    for (var j = 0; j < 10; ++j) {
                        if (user.weight > usersTop[j].weight) {
                            for (var k = 9; k > j; --k) {
                                usersTop[k] = usersTop[k - 1];
                            }

                            usersTop[j] = {
                                name: user.name,
                                weight: user.weight
                            };

                            break;
                        }
                    }
                }

                for (var i = 0; i < 10; ++i) {
                    if (usersTop[i].name) {
                        ctx.fillStyle = "#FFFFFF";
                        ctx.font = "normal 16pt Arial";
                        ctx.textAlign = "left";
                        ctx.fillText((i + 1) + '. ' + usersTop[i].name + ' (' + Math.ceil(usersTop[i].weight) + ')', 10, 20 + 20 * i);
                    } else {
                        break;
                    }
                }
            }
        } else if (ev.action == 'login') {
            userId = ev.id;
        }
    }

    ws.onopen = function() {
        ws.send(JSON.stringify({
            action: 'login',
            name: userName
        }));
    }
}

function sendCoords(id, x, y) {
    if (userId) {
        ws.send(JSON.stringify({
            action: 'move',
            id: userId,
            x: x + centerX,
            y: y + centerY
        }));
    }
}