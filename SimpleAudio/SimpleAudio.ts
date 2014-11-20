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

interface AudioInterface {

    /*
     * private _url:string;
     * private _sprite:any;
     */

    type:string;
    event:{load: any};

    setAudiosprite(conf):void;
    setURL(url:string):void;

    load():void;
    play(options?:{num?:number; volume?:number;}):void;

}

module SimpleAudio {

    class WebAudio implements AudioInterface {

        public type = 'webaudio';
        public event:{load:any} = {
            load: []
        };

        private _url:string;
        private _sprite:any;
        private _sources: {source:AudioBufferSourceNode; gainNode:GainNode;}[] = [];

        private _ctx:AudioContext;
        private _buffer:AudioBuffer;


        constructor(url?:string) {
            if (typeof url === 'string') {
                this._url = url;
            }
            var AudioCtx = window.AudioContext || window.webkitAudioContext || window.msAudioContext;
            this._ctx = new AudioCtx();
            this._ctx.createGain = this._ctx.createGain || this._ctx.createGainNode;
        }

        public setAudiosprite(conf) {
            this._sprite = conf;
        }

        public setURL(url) {
            this._url = url;
        }

        public load() {
            var req = new XMLHttpRequest();
            req.open('GET', this._url, true);
            req.responseType = 'arraybuffer';

            req.onload = () => {
                this._ctx.decodeAudioData(req.response,(buffer:AudioBuffer) => {
                    this._buffer = buffer;

                    for (var i = 0; i < this.event.load.length; i++) {
                        this.event.load[i]({type: 'webaudio'});
                    }
                });
            };
            req.send();
        }

        public play(options:{num?:number; volume?:number;} = {}) {

            var start_time, end_time;

            if ('num' in options) {
                start_time = this._sprite[options.num].st;
                end_time = this._sprite[options.num].ed - start_time;
            } else {
                start_time = 0;
                end_time = void 0;
            }

            var audio_source = this._createAudioSource();

            this._sources.push(audio_source);

            audio_source.source.start(this._ctx.currentTime, start_time, end_time);

            if ('volume' in options) {
                audio_source.gainNode.gain.value = options.volume;
            } else {
                audio_source.gainNode.gain.value = 1.0;
            }
        }

        public stop(num:number = this._sources.length - 1) {
            this._sources[num].source.stop(0);
        }

        public volume(options:{volume?:number; num?:number;} = {}):number {

            if(!('num' in options)) {
                options.num = this._sources.length - 1;
            }
            if('volume' in options) {
                this._sources[options.num].gainNode.gain.value = options.volume;
            }

            return this._sources[options.num].gainNode.gain.value;
        }

        private _createAudioSource() {

            var source = this._ctx.createBufferSource();
            source.start = source.start || source.noteOn;
            source.stop = source.stop || source.noteOff;

            source.addEventListener = source.addEventListener || function(ev, callback) {
                source['on' + ev] = callback;
            };

            var gainNode = this._ctx.createGain();
            source.buffer = this._buffer;

            source.addEventListener('ended', () => {
                for(var si = 0; si > this._sources.length; si++) {
                    if(this._sources[si].source === source) {
                        this._sources.splice(si, 1);
                        break;
                    }
                }
            });

            source.connect(gainNode);
            gainNode.connect(this._ctx.destination);

            return {source: source, gainNode: gainNode};
        }

    }


    class HTMLAudio implements AudioInterface {

        public type = 'audio';
        public event:{load:any} = {
            load: []
        };

        private _url:string;
        private _sprite:any;

        private _audio:HTMLAudioElement;
        private _currentTrack:number = -1;
        private _timeCheck:() => void;



        constructor(url?) {

            if (typeof url === 'string') {
                this._url = url;
            }

            this._audio = new Audio();
            this._audio.preload = 'none';
            this._audio.autoplay = false;

            this._timeCheck = () => {
                if(this._audio.currentTime >= this._sprite[this._currentTrack].ed) {
                    this._audio.removeEventListener('timeupdate', this._timeCheck);
                    this._audio.pause();
                    this._audio.currentTime = 0;
                    this._audio.volume = 1.0;
                }
            }
        }

        public setAudiosprite(conf) {
            this._sprite = conf;
        }

        public setURL(url) {
            this._url = url;
        }

        public load() {
            var load_events = this.event.load;

            for(var i = 0; i < load_events.length; i++) {
                this._audio.addEventListener('loadeddata', load_events[i]);
            }

            this._audio.src = this._url;
            this._audio.load();
        }

        public play(options:{num?:number; volume?:number;} = {}) {

            var audio = this._audio;

            if(this._currentTrack !== -1) {
                this.stop();
            }

            if('num' in options) {
                this._currentTrack = options.num;

                audio.currentTime = this._sprite[options.num].st;
                audio.addEventListener('timeupdate', this._timeCheck);
            }

            if('volume' in options) {
                audio.volume = options.volume;
            }

            audio.play();
        }

        public stop() {
            var audio = this._audio;

            audio.removeEventListener('timeupdate', this._timeCheck);
            audio.pause();
            audio.currentTime = 0;
            audio.volume = 1.0;

            this._currentTrack = -1;
        }

        public volume(options:{volume?:number;} = {}):number {
            if('volume' in options) {
                this._audio.volume = options.volume;
            }
            return this._audio.volume;
        }


    }

    /**
     * AndroidのAOSPブラウザの中には
     * 動かないAudioContextを内包している場合がある為識別して弾く
     *
     * @returns {boolean}
     */
    var userAgentCheck = () => {
        var ua = navigator.userAgent.toLowerCase();
        if(/android/.test(ua)) {
            if(/linux; u;/.test(ua)) {
                return false;
            }
            if(/chrome/.test(ua) && /version/.test(ua)) {
                return false;
            }
        }

        return true;
    };


    export function createAudio(url?:string): AudioInterface {
        if('AudioContext' in window || ('webkitAudioContext' in window && userAgentCheck()) || 'msAudioContext' in window) {
            return new WebAudio(url);
        } else {
            return new HTMLAudio(url);
        }
    }

}