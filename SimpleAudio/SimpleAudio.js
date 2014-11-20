/**
 * Simple audio library.
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
 * @author Tsuguya touma <touma@ryukyu-i.co.jp>
 */
///<reference path='webaudio.d.ts' />
var SimpleAudio;
(function (SimpleAudio) {
    var WebAudio = (function () {
        function WebAudio(url) {
            this.event = {
                load: []
            };
            if (typeof url === 'string') {
                this._url = url;
            }
            var AudioCtx = window.AudioContext || window.webkitAudioContext || window.msAudioContext;
            this._ctx = new AudioCtx();
            this._ctx.createGain = this._ctx.createGain || this._ctx.createGainNode;
        }
        WebAudio.prototype.setAudiosprite = function (conf) {
            this._sprite = conf;
        };
        WebAudio.prototype.setURL = function (url) {
            this._url = url;
        };
        WebAudio.prototype.load = function () {
            var _this = this;
            var req = new XMLHttpRequest();
            req.open('GET', this._url, true);
            req.responseType = 'arraybuffer';
            req.onload = function () {
                _this._ctx.decodeAudioData(req.response, function (buffer) {
                    _this._buffer = buffer;
                    for (var i = 0; i < _this.event.load.length; i++) {
                        _this.event.load[i]({ type: 'webaudio' });
                    }
                });
            };
            req.send();
        };
        WebAudio.prototype.play = function (options) {
            if (options === void 0) {
                options = {};
            }
            var start_time, end_time;
            if ('num' in options) {
                start_time = this._sprite[options.num].st;
                end_time = this._sprite[options.num].ed - start_time;
            }
            else {
                start_time = 0;
                end_time = void 0;
            }
            var audio_source = this._createAudioSource();
            audio_source.source.start(this._ctx.currentTime, start_time, end_time);
            //            if (end_time) audio_source.source.stop(end_time);
            if ('volume' in options) {
                audio_source.gainNode.gain.value = options.volume;
            }
            else {
                audio_source.gainNode.gain.value = 1.0;
            }
        };
        WebAudio.prototype._createAudioSource = function () {
            var source = this._ctx.createBufferSource();
            source.start = source.start || source.noteOn;
            source.stop = source.stop || source.noteOff;
            var gainNode = this._ctx.createGain();
            source.buffer = this._buffer;
            source.connect(gainNode);
            gainNode.connect(this._ctx.destination);
            return { source: source, gainNode: gainNode };
        };
        return WebAudio;
    })();
    var HTMLAudio = (function () {
        function HTMLAudio(url) {
            this.event = {
                load: []
            };
            if (typeof url === 'string') {
                this._url = url;
            }
            this._audio = new Audio();
            this._audio.preload = 'none';
            this._audio.autoplay = false;
        }
        HTMLAudio.prototype.setAudiosprite = function (conf) {
            this._sprite = conf;
        };
        HTMLAudio.prototype.setURL = function (url) {
            this._url = url;
        };
        HTMLAudio.prototype.load = function () {
            var load_events = this.event.load;
            for (var i = 0; i < load_events; i++) {
                this._audio.addEventListener('loadeddata', load_events[i]);
            }
            this._audio.src = this._url;
        };
        HTMLAudio.prototype.play = function (options) {
            if (options === void 0) {
                options = {};
            }
            if ('num' in options) {
                var audio = this._audio;
                var sprite = this._sprite[options.num];
                audio.currentTime = sprite.st;
                audio.addEventListener('timeupdate', function timeupdate() {
                    if (audio.currentTime >= sprite.ed) {
                        audio.removeEventListener('timeupdate', timeupdate);
                        audio.pause();
                        audio.currentTime = 0;
                        audio.volume = 1.0;
                    }
                });
            }
            this._audio.play();
            if ('volume' in options) {
                this._audio.volume = options.volume;
            }
        };
        return HTMLAudio;
    })();
    function createAudio(url) {
        if ('AudioContext' in window || 'webkitAudioContext' in window || 'msAudioContext' in window) {
            return new WebAudio(url);
        }
        else {
            return new HTMLAudio(url);
        }
    }
    SimpleAudio.createAudio = createAudio;
})(SimpleAudio || (SimpleAudio = {}));
//# sourceMappingURL=SimpleAudio.js.map