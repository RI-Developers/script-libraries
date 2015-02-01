/**
 * Simple audio module.
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
/**
 * SimpleAudioモジュール
 * スマートフォンでも(Web Audio APIに対応している場合には)
 * ボリュームの変更ができるようにする
 * その他基本的な再生機能を提供する
 *
 * @preferred
 */
var SimpleAudio;
(function (SimpleAudio) {
    var AudioContext = window.AudioContext || window.webkitAudioContext || window.msAudioContext || void 0;
    /**
     * Web Audio APIを使用してオーディオの管理を行うクラス
     * 優先的に使用する
     * TODO: ボリュームにバグがあった気がするから直す
     */
    var WebAudio = (function () {
        /**
         * url入れとくとXHRで内容とってきて再生準備しとくよ！
         * @param url 再生するサウンド
         */
        function WebAudio(url) {
            this.type = 'webaudio';
            this.event = {
                load: [],
                ended: []
            };
            this._defaultVolume = 1.0;
            this._channels = [];
            this._ctx = new AudioContext();
            this._ctx.createGain = this._ctx.createGain || this._ctx.createGainNode;
            if (typeof url === 'string') {
                this.setURL(url);
            }
        }
        /**
         * スプライト使用する場合のみ指定する
         * TODO: https://github.com/tonistiigi/audiosprite ここの形式で入れられるようにする
         * @param conf {st:再生開始時間, ed: 再生終了時間}の配列
         */
        WebAudio.prototype.setAudioSprite = function (conf) {
            this._sprite = conf;
        };
        /**
         * XHRでとってくるよ！
         * @param url 再生するサウンド
         */
        WebAudio.prototype.setURL = function (url) {
            this._url = url;
            this._sendRequest();
        };
        /**
         * XHRでの取得が完了していない場合は終わった後にロードを開始する
         * 完了したらendedイベントが発火
         */
        WebAudio.prototype.load = function () {
            var _this = this;
            if (this._response !== void 0) {
                if (/iPhone|iPod|iPad/.test(navigator.userAgent)) {
                    this._buffer = this._ctx.createBuffer(this._response, false);
                    for (var i = 0; i < this.event.load.length; i++) {
                        this.event.load[i]({ type: 'webaudio' });
                    }
                    this.play({ track: -1, volume: 0 });
                }
                else {
                    this._ctx.decodeAudioData(this._response, function (buffer) {
                        _this._buffer = buffer;
                        for (var i = 0; i < _this.event.load.length; i++) {
                            _this.event.load[i]({ type: 'webaudio' });
                        }
                    });
                }
            }
            else {
                this._request.onload = function () {
                    _this._response = _this._request.response;
                    _this.load();
                    _this._request = null;
                };
            }
        };
        /**
         * 再生開始
         * @param options {track: スプライト使用時は順番をいれる。デフォルトは最初。, volume: ボリューム}
         */
        WebAudio.prototype.play = function (options) {
            if (options === void 0) { options = {}; }
            var start_time, end_time;
            if (options.track !== void 0) {
                start_time = this._sprite[options.track].st;
                end_time = this._sprite[options.track].ed - start_time;
            }
            else {
                start_time = 0;
                end_time = void 0;
            }
            var audio_source = this._createAudioSource();
            if (options.track !== void 0 && options.track > -1) {
                this._channels.push(audio_source);
            }
            if (options.loop !== void 0) {
                audio_source.source.loop = options.loop;
            }
            if (options.volume !== void 0) {
                audio_source.gainNode.gain.value = options.volume;
            }
            else {
                audio_source.gainNode.gain.value = this._defaultVolume;
            }
            if (end_time === void 0) {
                audio_source.source.start(this._ctx.currentTime, start_time);
            }
            else {
                audio_source.source.start(this._ctx.currentTime, start_time, end_time);
            }
            audio_source.connect_time = this._ctx.currentTime;
            audio_source.start_time = start_time;
            audio_source.end_time = end_time;
        };
        /**
         * 再生終了
         * trackとか誰に需要があるのだろうか・・・。
         * まあtrackの管理が上手くできる仕組みが思いついたら役に立つはず！
         * @param track
         */
        WebAudio.prototype.stop = function (track) {
            if (track === void 0) { track = this._channels.length - 1; }
            if (track === -1) {
                return;
            }
            this._channels[track].source.stop(0);
        };
        /**
         * ボリュームコントロール
         * TODO: オプションのトラック指定していないときは全てに適応させる
         * @param options
         * @returns {number}
         */
        WebAudio.prototype.volume = function (options) {
            if (options === void 0) { options = {}; }
            if (!('track' in options)) {
                options.track = this._channels.length - 1;
            }
            if ('volume' in options) {
                this._channels[options.track].gainNode.gain.value = options.volume;
                this._defaultVolume = options.volume;
            }
            return this._channels[options.track].gainNode.gain.value;
        };
        /**
         * 現在時間
         * @param channel_number
         * @returns {number}
         */
        WebAudio.prototype.currentTime = function (channel_number) {
            if (channel_number === void 0) { channel_number = this._channels.length - 1; }
            if (channel_number === -1) {
                return 0;
            }
            var channel = this._channels[channel_number];
            var elapsed = this._ctx.currentTime - channel.connect_time;
            return elapsed;
        };
        /**
         * 仮実装の為、現時点ではWeb Audio API使用時のみ
         * @returns {number}
         */
        WebAudio.prototype.countChannels = function () {
            return this._channels.length;
        };
        /**
         * XHRでとってくる
         * エラーは考えてない！
         * @private
         */
        WebAudio.prototype._sendRequest = function () {
            var _this = this;
            this._request = new XMLHttpRequest();
            this._request.open('GET', this._url, true);
            this._request.responseType = 'arraybuffer';
            this._request.onload = function () {
                _this._response = _this._request.response;
                _this._request = null;
            };
            this._request.send();
        };
        /**
         * track製造部分
         * @returns {{source: AudioBufferSourceNode, gainNode: GainNode}}
         * @private
         */
        WebAudio.prototype._createAudioSource = function () {
            var _this = this;
            var source = this._ctx.createBufferSource();
            source.start = source.start || source.noteOn;
            source.stop = source.stop || source.noteOff;
            var gainNode = this._ctx.createGain();
            source.buffer = this._buffer;
            // WARNING: ended event of bug exists in chrome. Issue 403908
            source.onended = function () {
                for (var si = 0; si < _this._channels.length; si++) {
                    if (_this._channels[si].source === source) {
                        for (var ei = 0; ei < _this.event.ended.length; ei++) {
                            _this.event.ended[ei]({ channel: ei });
                        }
                        // remove current channel.
                        _this._channels.splice(si, 1);
                        break;
                    }
                }
            };
            source.connect(gainNode);
            gainNode.connect(this._ctx.destination);
            return { source: source, gainNode: gainNode };
        };
        return WebAudio;
    })();
    /**
     * HTMLAudioElementを使用してオーディオの管理を行うクラス
     * Web Audio APIに対応していない場合に使用する
     * TODO: Videoも使用したほうがいいんだろうな・・・・
     */
    var HTMLAudio = (function () {
        function HTMLAudio(url) {
            var _this = this;
            this.type = 'audio';
            this.event = {
                load: [],
                ended: []
            };
            this._defaultVolume = 1.0;
            this._currentTrack = -1;
            if (typeof url === 'string') {
                this._url = url;
            }
            this._audio = new Audio();
            var audio = this._audio;
            audio.preload = 'none';
            audio.autoplay = false;
            audio.onended = function () {
                for (var ei = 0; ei < _this.event.ended.length; ei++) {
                    _this.event.ended[ei]();
                }
            };
            this._timeCheck = function () {
                if (audio.currentTime >= _this._sprite[_this._currentTrack].ed) {
                    audio.removeEventListener('timeupdate', _this._timeCheck);
                    audio.pause();
                    audio.currentTime = 0;
                    for (var ei = 0; ei < _this.event.ended.length; ei++) {
                        _this.event.ended[ei]();
                    }
                }
            };
        }
        HTMLAudio.prototype.setAudioSprite = function (conf) {
            this._sprite = conf;
        };
        HTMLAudio.prototype.setURL = function (url) {
            this._url = url;
        };
        HTMLAudio.prototype.load = function () {
            var load_events = this.event.load;
            var audio = this._audio;
            // AOSP Browser does not work onloadeddata.
            audio.addEventListener('loadeddata', function () {
                for (var i = 0; i < load_events.length; i++) {
                    load_events[i]({ type: 'audio' });
                }
            });
            this._audio.src = this._url;
            this._audio.load();
        };
        HTMLAudio.prototype.play = function (options) {
            if (options === void 0) { options = {}; }
            var audio = this._audio;
            if (this._currentTrack !== -1) {
                this.stop();
            }
            if ('track' in options) {
                this._currentTrack = options.track;
                if (this._sprite[options.track].st) {
                    audio.currentTime = this._sprite[options.track].st;
                }
                audio.addEventListener('timeupdate', this._timeCheck);
            }
            if (options.loop) {
                audio.loop = options.loop;
            }
            if ('volume' in options) {
                audio.volume = options.volume;
            }
            else {
                audio.volume = this._defaultVolume;
            }
            audio.play();
        };
        HTMLAudio.prototype.stop = function () {
            var audio = this._audio;
            audio.removeEventListener('timeupdate', this._timeCheck);
            audio.pause();
            audio.currentTime = 0;
            this._currentTrack = -1;
        };
        HTMLAudio.prototype.volume = function (options) {
            if (options === void 0) { options = {}; }
            if ('volume' in options) {
                this._audio.volume = options.volume;
                this._defaultVolume = options.volume;
            }
            return this._audio.volume;
        };
        HTMLAudio.prototype.currentTime = function () {
            if (this._currentTrack === -1) {
                return this._audio.currentTime;
            }
            var start_time = this._sprite[this._currentTrack].st;
            var current_time = this._audio.currentTime;
            if (current_time < start_time) {
                return 0;
            }
            else {
                return current_time - start_time;
            }
        };
        return HTMLAudio;
    })();
    /**
     * AndroidのAOSPブラウザの中には
     * 動かないAudioContextを内包している場合がある為識別して弾く
     *
     * @returns {boolean} AOSPブラウザの場合falseになる
     */
    var checkUserAgent = function () {
        var ua = navigator.userAgent.toLowerCase();
        if (/android/.test(ua)) {
            if (/linux; u;|version.+chrome/.test(ua)) {
                return false;
            }
        }
        return true;
    };
    /**
     * 対応状況に合わせて適切なオーディオクラスを選択、初期化して返却する。
     *
     * @param url オーディオファイルのURL
     * @returns {*}
     */
    SimpleAudio.createAudio = function (url) {
        if (AudioContext && checkUserAgent()) {
            return new WebAudio(url);
        }
        else {
            return new HTMLAudio(url);
        }
    };
})(SimpleAudio || (SimpleAudio = {}));
