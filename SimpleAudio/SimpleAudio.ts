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

// TODO: 一時停止機能の追加
interface AudioInterface {

    /*
     * private _url:string;
     * private _sprite:{st:number; ed:number;}[];
     */

    type:string;
    event:{load:any; ended:any;};

    setAudioSprite(conf:{st:number; ed:number;}[]):void;
    setURL(url:string):void;

    load():void;
    play(options:{track?:number; volume?:number;}):void;
    currentTime:(track?:number) => number;

}

interface webAudioChannel {
    source:AudioBufferSourceNode;
    gainNode:GainNode;
    connect_time?:number;
    start_time?:number;
    end_time?:number;
}


/**
 * SimpleAudioモジュール
 * スマートフォンでも(Web Audio APIに対応している場合には)
 * ボリュームの変更ができるようにする
 * その他基本的な再生機能を提供する
 *
 * @preferred
 */
module SimpleAudio {


    /**
     * Web Audio APIを使用してオーディオの管理を行うクラス
     * 優先的に使用する
     */
    class WebAudio implements AudioInterface {

        public type = 'webaudio';
        public event = {
            load: [],
            ended: []
        };

        private _url:string;
        private _sprite:{st:number; ed:number;}[];
        private _defaultVolume = 1.0;

        private _channels:webAudioChannel[] = [];
        private _ctx:AudioContext;
        private _buffer:AudioBuffer;
        private _response:any;


        constructor(url?:string) {

            var AudioCtx = window.AudioContext || window.webkitAudioContext || window.msAudioContext;
            this._ctx = new AudioCtx();
            this._ctx.createGain = this._ctx.createGain || this._ctx.createGainNode;

            if (typeof url === 'string') {
                this.setURL(url);
            }
        }


        public setAudioSprite(conf:{st:number; ed:number;}[]) {
            this._sprite = conf;
        }

        public setURL(url:string) {
            this._url = url;
            this._sendRequest();
        }

        public load() {

            if(/iPhone|iPod|iPad/.test(navigator.userAgent)) {
                this._buffer = this._ctx.createBuffer(this._response, false);

                for (var i = 0; i < this.event.load.length; i++) {
                    this.event.load[i]({type: 'webaudio'});
                }

                this.play({track: -1, volume: 0});
            } else {
                this._ctx.decodeAudioData(this._response,(buffer:AudioBuffer) => {
                    this._buffer = buffer;

                    for (var i = 0; i < this.event.load.length; i++) {
                        this.event.load[i]({type: 'webaudio'});
                    }
                });
            }
        }

        public play(options:{track?:number; volume?:number;} = {}) {

            var start_time, end_time;

            if ('track' in options) {
                start_time = this._sprite[options.track].st;
                end_time = this._sprite[options.track].ed - start_time;
            } else {
                start_time = 0;
                end_time = void 0;
            }

            var audio_source = this._createAudioSource();

            if('track' in options && options.track > -1) {
                this._channels.push(audio_source);
            }

            if ('volume' in options) {
                audio_source.gainNode.gain.value = options.volume;
            } else {
                audio_source.gainNode.gain.value = this._defaultVolume;
            }

            if(end_time === void 0) {
                audio_source.source.start(this._ctx.currentTime, start_time);
            } else {
                audio_source.source.start(this._ctx.currentTime, start_time, end_time);
            }

            audio_source.connect_time = this._ctx.currentTime;
            audio_source.start_time = start_time;
            audio_source.end_time = end_time;

        }

        public stop(track = this._channels.length - 1) {

            if(track === -1) {
                return;
            }

            this._channels[track].source.stop(0);
        }

        public volume(options:{track?:number; volume?:number;} = {}):number {

            if(!('track' in options)) {
                options.track = this._channels.length - 1;
            }
            if('volume' in options) {
                this._channels[options.track].gainNode.gain.value = options.volume;
                this._defaultVolume = options.volume;
            }

            return this._channels[options.track].gainNode.gain.value;
        }

        public currentTime(channel_number = this._channels.length - 1):number {

            if(channel_number === -1) {
                return 0;
            }

            var channel = this._channels[channel_number];
            var elapsed = this._ctx.currentTime - channel.connect_time;

            return elapsed;
        }

        private _sendRequest() {
            var req = new XMLHttpRequest();
            req.open('GET', this._url, true);
            req.responseType = 'arraybuffer';

            req.onload = () => {
                this._response = req.response;
            };
            req.send();
        }

        private _createAudioSource():webAudioChannel {

            var source = this._ctx.createBufferSource();
            source.start = source.start || source.noteOn;
            source.stop = source.stop || source.noteOff;

            var gainNode = this._ctx.createGain();
            source.buffer = this._buffer;

            // WARNING: ended event of bug exists in chrome. Issue 403908
            source.onended = () => {
                for(var si = 0; si < this._channels.length; si++) {

                    if(this._channels[si].source === source) {
                        // fire user events.
                        for(var ei = 0; ei < this.event.ended.length; ei++) {
                            this.event.ended[ei]({channel: ei});
                        }

                        // remove current channel.
                        this._channels.splice(si, 1);

                        break;
                    }
                }
            };

            source.connect(gainNode);
            gainNode.connect(this._ctx.destination);

            return {source: source, gainNode: gainNode};
        }

    }


    /**
     * HTMLAudioElementを使用してオーディオの管理を行うクラス
     * Web Audio APIに対応していない場合に使用する
     */
    class HTMLAudio implements AudioInterface {

        public type = 'audio';
        public event = {
            load: [],
            ended: []
        };

        private _url:string;
        private _sprite:{st:number; ed:number;}[];
        private _defaultVolume = 1.0;

        private _audio:HTMLAudioElement;
        private _currentTrack:number = -1;
        private _timeCheck:() => void;


        constructor(url?:string) {

            if (typeof url === 'string') {
                this._url = url;
            }

            this._audio = new Audio();

            var audio = this._audio;
            audio.preload = 'none';
            audio.autoplay = false;

            audio.onended = () => {
                for(var ei = 0; ei < this.event.ended.length; ei++) {
                    this.event.ended[ei]();
                }
            };

            this._timeCheck = () => {
                if(audio.currentTime >= this._sprite[this._currentTrack].ed) {
                    audio.removeEventListener('timeupdate', this._timeCheck);
                    audio.pause();
                    audio.currentTime = 0;
                    for(var ei = 0; ei < this.event.ended.length; ei++) {
                        this.event.ended[ei]();
                    }
                }
            };

        }


        public setAudioSprite(conf:{st:number; ed:number;}[]) {
            this._sprite = conf;
        }

        public setURL(url:string) {
            this._url = url;
        }

        public load() {

            var load_events = this.event.load;
            var audio = this._audio;
            // AOSP Browser does not work onloadeddata.
            audio.addEventListener('loadeddata', () => {
                for(var i = 0; i < load_events.length; i++) {
                    load_events[i]({type: 'audio'});
                }
            });

            this._audio.src = this._url;
            this._audio.load();
        }

        public play(options:{track?:number; volume?:number;} = {}) {

            var audio = this._audio;

            if(this._currentTrack !== -1) {
                this.stop();
            }

            if('track' in options) {
                this._currentTrack = options.track;

                if(this._sprite[options.track].st) {
                    audio.currentTime = this._sprite[options.track].st;
                }
                audio.addEventListener('timeupdate', this._timeCheck);
            }

            if('volume' in options) {
                audio.volume = options.volume;
            } else {
                audio.volume = this._defaultVolume;
            }

            audio.play();
        }

        public stop() {

            var audio = this._audio;

            audio.removeEventListener('timeupdate', this._timeCheck);
            audio.pause();
            audio.currentTime = 0;

            this._currentTrack = -1;
        }

        public volume(options:{volume?:number;} = {}):number {

            if('volume' in options) {
                this._audio.volume = options.volume;
                this._defaultVolume = options.volume;
            }

            return this._audio.volume;
        }

        public currentTime():number {

            if(this._currentTrack === -1) {
                return this._audio.currentTime;
            }

            var start_time = this._sprite[this._currentTrack].st;
            var current_time = this._audio.currentTime;

            if(current_time < start_time) {
                return 0;
            } else {
                return current_time - start_time;
            }

        }

    }


    /**
     * AndroidのAOSPブラウザの中には
     * 動かないAudioContextを内包している場合がある為識別して弾く
     *
     * @returns {boolean} AOSPブラウザの場合falseになる
     */
    var checkUserAgent = () => {
        var ua = navigator.userAgent.toLowerCase();
        if(/android/.test(ua)) {
            if(/linux; u;|version.+chrome/.test(ua)) {
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
    export var createAudio = (url?:string):AudioInterface => {
        if('AudioContext' in window || ('webkitAudioContext' in window && checkUserAgent()) || 'msAudioContext' in window) {
            return new WebAudio(url);
        } else {
            return new HTMLAudio(url);
        }
    }

}