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

interface AudioInterface {

    /*
     * private _url:string;
     * private _sprite:any;
     */

    setAudiosprite(conf):void;
    setURL(url:string):void;

    load():void;
    play(options?:{num?:number; volume?:number;}):void;

    event:{load: any};
}

module SimpleAudio {

    class WebAudio implements AudioInterface {

        private _url:string;
        private _sprite:any;

        private _ctx:AudioContext;
        private _buffer:AudioBuffer;

        public event:{load:any} = {
            load: []
        };

        constructor(url?) {
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

        public play(options?:{num?:number; volume?:number;}) {
            if (options === void 0) {
                options = {};
            }
            var start_time, end_time;

            if ('num' in options) {
                start_time = this._sprite[options.num].st;
                end_time = this._sprite[options.num].ed - start_time;
            } else {
                start_time = 0;
                end_time = void 0;
            }

            var audio_source = this._createAudioSource();

            audio_source.source.start(this._ctx.currentTime, start_time, end_time);

//            if (end_time) audio_source.source.stop(end_time);

            if ('volume' in options) {
                audio_source.gainNode.gain.value = options.volume;
            } else {
                audio_source.gainNode.gain.value = 1.0;
            }
        }

        private _createAudioSource() {
            var source = this._ctx.createBufferSource();
            source.start = source.start || source.noteOn;
            source.stop = source.stop || source.noteOff;

            var gainNode = this._ctx.createGain();
            source.buffer = this._buffer;

            source.connect(gainNode);
            gainNode.connect(this._ctx.destination);

            return {source: source, gainNode: gainNode};
        }

    }


    class HTMLAudio implements AudioInterface {

        private _url:string;
        private _sprite:any;

        private _audio:HTMLAudioElement;

        public event:{load:any} = {
            load: []
        };

        constructor(url?) {
            if (typeof url === 'string') {
                this._url = url;
            }

            this._audio = new Audio();
            this._audio.preload = 'none';
            this._audio.autoplay = false;
        }

        public setAudiosprite(conf) {
            this._sprite = conf;
        }

        public setURL(url) {
            this._url = url;
        }

        public load() {
            var load_events = this.event.load;
            for(var i = 0; i < load_events; i++) {
                this._audio.addEventListener('loadeddata', load_events[i]);
            }
            this._audio.src = this._url;
        }

        public play(options?:{num?:number; volume?:number;}) {
            if(options === void 0) {
                options = {};
            }
            if('num' in options) {
                var audio = this._audio;
                var sprite = this._sprite[options.num];
                audio.currentTime = sprite.st;

                audio.addEventListener('timeupdate', function timeupdate() {
                    if(audio.currentTime >= sprite.ed) {
                        audio.removeEventListener('timeupdate', timeupdate);
                        audio.pause();
                        audio.currentTime = 0;
                        audio.volume = 1.0;
                    }
                });
            }
            this._audio.play();

            if('volume' in options) {
                this._audio.volume = options.volume;
            }
        }

    }


    export function createAudio(url?:string): AudioInterface {
        if('AudioContext' in window || 'webkitAudioContext' in window || 'msAudioContext' in window) {
            return new WebAudio(url);
        } else {
            return new HTMLAudio(url);
        }
    }

}