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
module CommonAcceleration {



    /****************** Public ******************/



    /**
     * DeviceMotionEventが使用可能か
     * @type {boolean}
     */
    export var canDeviceMotion = 'ondevicemotion' in window;

    /**
     * listenさせたいEventを配列で管理する
     * @type {Array}
     */
    export var events = [];

    /**
     * Event登録
     */
    export var listen = () => {
        window.addEventListener('devicemotion', function check(event) {
            window.removeEventListener('devicemotion', check);
            return selectMotion(event);
        });
    };

    /**
     * Event解除
     */
    export var remove = () => {
        window.removeEventListener('devicemotion', listenerFunc);
    };



    /****************** Private ******************/



    // listen時に登録、remove時に使用する
    var listenerFunc:(ev:DeviceMotionEvent) => void;

    // 前回取得した値をキャッシュとして保存しておく
    var cache:DeviceAcceleration;


    /**
     * 登録したイベントを発火する
     *
     * @param event
     */
    var fireEvent = (event:DeviceMotionEvent) => {
        for(var i = 0; i < events.length; i++) {
            events[i](event);
        }
    };


    /**
     * 値がキャッシュかどうかを識別する
     * AOSP, iOSのSafariで現象を確認
     *
     * @param acc
     * @returns {boolean}
     */
    var cacheCheck = (acc:DeviceAcceleration) => {
        var result = acc.x === cache.x && acc.y === cache.y && acc.z === cache.z;

        if(result) {
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
    var acceleration = ():void => {

        // 値の加工をせずにfireEventへ引き渡す
        listenerFunc = (event) => {
            if(cacheCheck(event.acceleration)) return;
            fireEvent(event);
        };

        window.addEventListener('devicemotion', listenerFunc);
    };


    /**
     * accelerationプロパティの値を取得できない場合は
     * この関数を経由してlistenする
     */
    var accelerationIncludingGravity = ():void => {

        // 前回の値
        var g = {x:0, y:0, z:0};

        // ローパスフィルタ
        // 参考: http://developer.android.com/guide/topics/sensors/sensors_motion.html#sensors-motion-accel
        var filter = (event:DeviceMotionEvent) => {
            var aig = event.accelerationIncludingGravity;
            var alpha = 0.9;
            var acc:{x?:number;y?:number;z?:number;} = {};
            g.x = alpha * g.x + (1 - alpha) * aig.x;
            g.y = alpha * g.y + (1 - alpha) * aig.y;
            g.z = alpha * g.z + (1 - alpha) * aig.z;

            acc.x = aig.x - g.x;
            acc.y = aig.y - g.y;
            acc.z = aig.z - g.z;

            return <DeviceMotionEvent>{
                acceleration: acc,
                accelerationIncludingGravity: aig,
                interval: event.interval || -1
            };
        };

        listenerFunc = (event) => {
            if(cacheCheck(event.accelerationIncludingGravity)) return;
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
    var selectMotion = (event:DeviceMotionEvent) => {
        if('acceleration' in event && event.acceleration) {
            cache = event.acceleration;
            acceleration();
        } else {
            cache = event.accelerationIncludingGravity;
            accelerationIncludingGravity();
        }
    };

}