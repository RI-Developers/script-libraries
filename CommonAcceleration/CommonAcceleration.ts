module CommonAcceleration {

    export var canDeviceMotion = 'ondevicemotion' in window;
    export var events = [];

    var listenerFunc:any;

    var fireEvent = (event) => {
        for(var i = 0; i < events.length; i++) {
            events[i](event);
        }
    };

    var acceleration = () => {
        listenerFunc = (event) => fireEvent(event);

        window.addEventListener('devicemotion', listenerFunc);
    };

    var accelerationIncludingGravity = () => {
        var g = {x:0, y:0, z:0};

        var filter = (event) => {
            var e = event.accelerationIncludingGravity;
            var a = 0.8;
            var v:any = {};
            g.x = a * g.x + (1 - a) * e.x;
            g.y = a * g.y + (1 - a) * e.y;
            g.z = a * g.z + (1 - a) * e.z;

            v.x = e.x - g.x;
            v.y = e.y - g.y;
            v.z = e.z - g.z;

            event.acceleration = v;

            return event;
        };

        listenerFunc = (event) => fireEvent(filter(event));

        window.addEventListener('devicemotion', listenerFunc);
    };

    var selectMotion = (e) => {
        if('acceleration' in e && e.acceleration) {
            acceleration();
        } else {
            accelerationIncludingGravity();
        }
    };

    export var listen = () => {
        window.addEventListener('devicemotion', function check(e) {
            window.removeEventListener('devicemotion', check);
            return
        });
    };

    export var remove = () => {
        window.removeEventListener('devicemotion', listenerFunc);
    };

}