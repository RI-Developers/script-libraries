///<reference path='./typings/tsd.d.ts' />

interface Window {
    AudioContext: typeof AudioContext;
    webkitAudioContext: typeof AudioContext;
    msAudioContext: typeof AudioContext;
}

interface AudioNode extends EventTarget {

}

interface AudioContext {
    createGainNode(): GainNode;
}

interface AudioBufferSourceNode {
    noteOn(when: number, offset?: number, duration?: number): void;
    noteOff(when: number): void;
}

