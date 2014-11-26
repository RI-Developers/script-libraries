var CommonAcceleration;
(function (CommonAcceleration) {
    CommonAcceleration.canDeviceMotion = 'ondevicemotion' in window;
    CommonAcceleration.events = [];
    var listenerFunc;
    var fireEvent = function (event) {
        for (var i = 0; i < CommonAcceleration.events.length; i++) {
            CommonAcceleration.events[i](event);
        }
    };
    var acceleration = function () {
        listenerFunc = function (event) { return fireEvent(event); };
        window.addEventListener('devicemotion', listenerFunc);
    };
    var accelerationIncludingGravity = function () {
        var g = { x: 0, y: 0, z: 0 };
        var filter = function (event) {
            var aig = event.accelerationIncludingGravity;
            var a = 0.8;
            var acceleration = {};
            g.x = a * g.x + (1 - a) * aig.x;
            g.y = a * g.y + (1 - a) * aig.y;
            g.z = a * g.z + (1 - a) * aig.z;
            acceleration.x = aig.x - g.x;
            acceleration.y = aig.y - g.y;
            acceleration.z = aig.z - g.z;
            // accelerationプロパティがread onlyなっていて
            // 上書きができないのに対応する為新しくオブジェクトを作る
            return {
                acceleration: acceleration,
                accelerationIncludingGravity: aig
            };
        };
        listenerFunc = function (event) { return fireEvent(filter(event)); };
        window.addEventListener('devicemotion', listenerFunc);
    };
    var selectMotion = function (e) {
        if ('acceleration' in e && e.acceleration) {
            acceleration();
        }
        else {
            accelerationIncludingGravity();
        }
    };
    CommonAcceleration.listen = function () {
        window.addEventListener('devicemotion', function check(e) {
            window.removeEventListener('devicemotion', check);
            return selectMotion(e);
        });
    };
    CommonAcceleration.remove = function () {
        window.removeEventListener('devicemotion', listenerFunc);
    };
})(CommonAcceleration || (CommonAcceleration = {}));
