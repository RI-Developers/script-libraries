/**
 * DeviceMotionEvent Wrapper Module.
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 RyukyuInteractive, Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 *
 * @license MIT
 * @author Tsuguya Touma <touma@ryukyu-i.co.jp>
 */
/**
 * DeviceMotionEventをラッピングするモジュール
 * accelerationに対応していない場合の代替案を用意
 * キャッシュ問題の解決もする
 */
var CommonAcceleration;
(function (CommonAcceleration) {
    /****************** Public ******************/
    /**
     * DeviceMotionEventが使用可能か
     * @type {boolean}
     */
    CommonAcceleration.canDeviceMotion = 'ondevicemotion' in window;
    /**
     * listenさせたいEventを配列で管理する
     * @type {Array}
     */
    CommonAcceleration.events = [];
    /**
     * Event登録
     */
    CommonAcceleration.listen = function () {
        window.addEventListener('devicemotion', function check(event) {
            window.removeEventListener('devicemotion', check);
            return selectMotion(event);
        });
    };
    /**
     * Event解除
     */
    CommonAcceleration.remove = function () {
        window.removeEventListener('devicemotion', listenerFunc);
    };
    /****************** Private ******************/
    // listen時に登録、remove時に使用する
    var listenerFunc;
    // 前回取得した値をキャッシュとして保存しておく
    var cache;
    /**
     * 登録したイベントを発火する
     *
     * @param event
     */
    var fireEvent = function (event) {
        for (var i = 0; i < CommonAcceleration.events.length; i++) {
            CommonAcceleration.events[i](event);
        }
    };
    /**
     * 値がキャッシュかどうかを識別する
     * AOSP, iOSのSafariで現象を確認
     *
     * @param acc
     * @returns {boolean}
     */
    var cacheCheck = function (acc) {
        var result = acc.x === cache.x && acc.y === cache.y && acc.z === cache.z;
        if (result) {
            cache.x = acc.x;
            cache.y = acc.y;
            cache.z = acc.z;
        }
        return result;
    };
    /**
     * accelerationプロパティの値を取得できる場合に
     * この関数を経由してlistenする
     */
    var acceleration = function () {
        // 値の加工をせずにfireEventへ引き渡す
        listenerFunc = function (event) {
            if (cacheCheck(event.acceleration))
                return;
            fireEvent(event);
        };
        window.addEventListener('devicemotion', listenerFunc);
    };
    /**
     * accelerationプロパティの値を取得できない場合は
     * この関数を経由してlistenする
     */
    var accelerationIncludingGravity = function () {
        // 前回の値
        var g = { x: 0, y: 0, z: 0 };
        // ローパスフィルタ
        // 参考: http://developer.android.com/guide/topics/sensors/sensors_motion.html#sensors-motion-accel
        var filter = function (event) {
            var aig = event.accelerationIncludingGravity;
            var alpha = 0.9;
            var acc = {};
            g.x = alpha * g.x + (1 - alpha) * aig.x;
            g.y = alpha * g.y + (1 - alpha) * aig.y;
            g.z = alpha * g.z + (1 - alpha) * aig.z;
            acc.x = aig.x - g.x;
            acc.y = aig.y - g.y;
            acc.z = aig.z - g.z;
            return {
                acceleration: acc,
                accelerationIncludingGravity: aig,
                rotationRate: event.rotationRate || { alpha: 0, beta: 0, gamma: 0 },
                interval: event.interval || -1
            };
        };
        listenerFunc = function (event) {
            if (cacheCheck(event.accelerationIncludingGravity))
                return;
            fireEvent(filter(event));
        };
        window.addEventListener('devicemotion', listenerFunc);
    };
    /**
     * accelerationプロパティが使用可能かどうかを調べて
     * どの関数でlistenするか振り分けを行う
     *
     * @param event
     */
    var selectMotion = function (event) {
        if ('acceleration' in event && event.acceleration) {
            cache = event.acceleration;
            acceleration();
        }
        else {
            cache = event.accelerationIncludingGravity;
            accelerationIncludingGravity();
        }
    };
})(CommonAcceleration || (CommonAcceleration = {}));
