///<reference path='./typings/bundle.d.ts' />

interface Window {
    AudioContext: typeof AudioContext;
    webkitAudioContext: typeof AudioContext;
    msAudioContext: typeof AudioContext;
}

interface AudioContext {
    createGainNode(): GainNode;
}

interface AudioBufferSourceNode {
    noteOn(when: number, offset?: number, duration?: number): void;
    noteOff(when: number): void;
}

