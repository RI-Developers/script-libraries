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
 * @author Tsuguya Touma <touma@ryukyu-i.co.jp>
 */
///<reference path='webaudio.d.ts' />
var SimpleAudio;
(function (SimpleAudio) {
    var WebAudio = (function () {
        function WebAudio(url) {
            this.type = 'webaudio';
            this.event = {
                load: []
            };
            this._sources = [];
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
            if (options === void 0) { options = {}; }
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
            this._sources.push(audio_source);
            audio_source.source.start(this._ctx.currentTime, start_time, end_time);
            if ('volume' in options) {
                audio_source.gainNode.gain.value = options.volume;
            }
            else {
                audio_source.gainNode.gain.value = 1.0;
            }
        };
        WebAudio.prototype.stop = function (num) {
            if (num === void 0) { num = this._sources.length - 1; }
            this._sources[num].source.stop(0);
        };
        WebAudio.prototype.volume = function (options) {
            if (options === void 0) { options = {}; }
            if (!('num' in options)) {
                options.num = this._sources.length - 1;
            }
            if ('volume' in options) {
                this._sources[options.num].gainNode.gain.value = options.volume;
            }
            return this._sources[options.num].gainNode.gain.value;
        };
        WebAudio.prototype._createAudioSource = function () {
            var _this = this;
            var source = this._ctx.createBufferSource();
            source.start = source.start || source.noteOn;
            source.stop = source.stop || source.noteOff;
            source.addEventListener = source.addEventListener || function (ev, callback) {
                source['on' + ev] = callback;
            };
            var gainNode = this._ctx.createGain();
            source.buffer = this._buffer;
            source.addEventListener('ended', function () {
                for (var si = 0; si > _this._sources.length; si++) {
                    if (_this._sources[si].source === source) {
                        _this._sources.splice(si, 1);
                        break;
                    }
                }
            });
            source.connect(gainNode);
            gainNode.connect(this._ctx.destination);
            return { source: source, gainNode: gainNode };
        };
        return WebAudio;
    })();
    var HTMLAudio = (function () {
        function HTMLAudio(url) {
            var _this = this;
            this.type = 'audio';
            this.event = {
                load: []
            };
            this._currentTrack = -1;
            if (typeof url === 'string') {
                this._url = url;
            }
            this._audio = new Audio();
            this._audio.preload = 'none';
            this._audio.autoplay = false;
            this._timeCheck = function () {
                if (_this._audio.currentTime >= _this._sprite[_this._currentTrack].ed) {
                    _this._audio.removeEventListener('timeupdate', _this._timeCheck);
                    _this._audio.pause();
                    _this._audio.currentTime = 0;
                    _this._audio.volume = 1.0;
                }
            };
        }
        HTMLAudio.prototype.setAudiosprite = function (conf) {
            this._sprite = conf;
        };
        HTMLAudio.prototype.setURL = function (url) {
            this._url = url;
        };
        HTMLAudio.prototype.load = function () {
            var load_events = this.event.load;
            for (var i = 0; i < load_events.length; i++) {
                this._audio.addEventListener('loadeddata', load_events[i]);
            }
            this._audio.src = this._url;
            this._audio.load();
        };
        HTMLAudio.prototype.play = function (options) {
            if (options === void 0) { options = {}; }
            var audio = this._audio;
            if (this._currentTrack !== -1) {
                this.stop();
            }
            if ('num' in options) {
                this._currentTrack = options.num;
                audio.currentTime = this._sprite[options.num].st;
                audio.addEventListener('timeupdate', this._timeCheck);
            }
            if ('volume' in options) {
                audio.volume = options.volume;
            }
            audio.play();
        };
        HTMLAudio.prototype.stop = function () {
            var audio = this._audio;
            audio.removeEventListener('timeupdate', this._timeCheck);
            audio.pause();
            audio.currentTime = 0;
            audio.volume = 1.0;
            this._currentTrack = -1;
        };
        HTMLAudio.prototype.volume = function (options) {
            if (options === void 0) { options = {}; }
            if ('volume' in options) {
                this._audio.volume = options.volume;
            }
            return this._audio.volume;
        };
        return HTMLAudio;
    })();
    /**
     * AndroidのAOSPブラウザの中には
     * 動かないAudioContextを内包している場合がある為識別して弾く
     *
     * @returns {boolean}
     */
    var userAgentCheck = function () {
        var ua = navigator.userAgent.toLowerCase();
        if (/android/.test(ua)) {
            if (/linux; u;/.test(ua)) {
                return false;
            }
            if (/chrome/.test(ua) && /version/.test(ua)) {
                return false;
            }
        }
        return true;
    };
    function createAudio(url) {
        if ('AudioContext' in window || ('webkitAudioContext' in window && userAgentCheck()) || 'msAudioContext' in window) {
            return new WebAudio(url);
        }
        else {
            return new HTMLAudio(url);
        }
    }
    SimpleAudio.createAudio = createAudio;
})(SimpleAudio || (SimpleAudio = {}));
//# sourceMappingURL=SimpleAudio.js.map