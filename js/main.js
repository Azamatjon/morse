String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};

function getKeyByValue(object, value) {
    return Object.keys(object).find(key => object[key] === value);
}

const getOscillator = (frequency) => {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();

    let gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    gainNode.gain.value = 0;



    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    //oscillator.detune.value = 300;
    oscillator.start();

    const mute = () => {
        gainNode.gain.value = 0;
    };

    const signal = () => {
        //console.log('fullVolume');
        gainNode.gain.value = 0.95;
    };


    const stop = () => {
        //console.log('osc stop');
        oscillator.stop();
    };

    return { stop, mute, signal };
};

function start(morseCode = '') {
    let frequency = 550;

    let shortTiming = 35;
    let longTiming = 80;
    let tapTiming = 20;

    let spaceTiming = 110;

    let oscillator = getOscillator(frequency);

    let signalling = false;
    let signallingChar = null;
    let signallingDuration = 0;

    let isWaiting = false;

    function stopSignalling(isTap = false){
        if (!isTap) oscillator.mute();
        signalling = false;
        isWaiting = true;
        signallingDuration = 0;
    }

    let event = new CustomEvent(
        "signallingStarted"
    );
    document.dispatchEvent(event);

    let loop = setInterval(function () {
        if (signalling){
            if (signallingChar == '.'){
                if (signallingDuration == shortTiming){
                    stopSignalling();
                }
            } else if (signallingChar == '-'){
                if (signallingDuration == longTiming){
                    stopSignalling();
                }
            } else if (signallingChar == ' '){
                if (signallingDuration == tapTiming){
                    stopSignalling(true);
                }
            } else if (signallingChar == '  '){
                if (signallingDuration == spaceTiming){
                    stopSignalling(true);
                }
            } else {
                console.log('else');
            }
        } else if (isWaiting) {
            if (signallingDuration == tapTiming){
                isWaiting = false;
            }
        } else {
            if (morseCode.length > 0){

                if (morseCode.length >= 2 && morseCode[0] == ' ' && morseCode[1] == ' '){
                    signallingChar = '  ';
                    morseCode = morseCode.substr(2);
                } else {
                    signallingChar = morseCode[0];
                    morseCode = morseCode.substr(1);
                }

                signalling = true;
                if (signallingChar != ' ' && signallingChar != '  ') oscillator.signal();
                signallingDuration = 0;
            } else {
                //console.log('stopped');
                clearInterval(loop);

                let event = new CustomEvent(
                    "signallingStopped"
                );
                document.dispatchEvent(event);
            }
        }
        //console.log('duration', signallingDuration);
        signallingDuration++;
    }, 1);

}

let characters = {
    'A': '01', 'B': '1000', 'C': '1010', 'D': '100', 'E': '0', 'F': '0010',
    'G': '110', 'H': '0000', 'I': '00', 'J': '0111', 'K': '101', 'L': '0100',
    'M': '11', 'N': '10', 'O': '111', 'P': '0110', 'Q': '1101', 'R': '010',
    'S': '000', 'T': '1', 'U': '001', 'V': '0001', 'W': '011', 'X': '1001',
    'Y': '1011', 'Z': '1100', ' ': ' ',

    '0': '11111', '1': '01111', '2': '00111', '3': '00011', '4': '00001',
    '5': '00000', '6': '10000', '7': '11000', '8': '11100', '9': '11110',

    '.': '010101', ',': '110011', '?': '001100', '!': '101011', '(': '10110',
    ')': '101101', ':': '111000', ';': '101010', '=': '10001',
    '+': '01010', '-': '100001', '"': '010010',
};

function getCharacter(val){
    let modifiedCode = val.replaceAll('-', '1').replaceAll('.', '0');
    let gotKey = getKeyByValue(characters, modifiedCode);
    if (gotKey === undefined){
        return '#';
    }
    return gotKey;
}

function getCode(val){
    let gotCode = characters[val];
    if (gotCode === undefined){
        return ' ';
    }
    return gotCode.replaceAll('1', '-').replaceAll('0', '.');
}


function getError(val, error, shouldBe){
    if (val < (shouldBe + error) && val > (shouldBe - error)){
        return true;
    }
    return false;
}

function getSpace(val, shouldBe){
    return Math.floor(val / shouldBe);
}

let isStarted = false;
let isWorking = false;



function listen(){
    isWorking = true;

    if (!isStarted){
        isStarted = true;

        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        let context = new AudioContext();
        let analyser = context.createAnalyser();
        analyser.fftSize = 8192;

        window.navigator.getUserMedia({ audio:true }, (stream) => {

            let source = context.createMediaStreamSource(stream);
            source.connect(analyser);
            //analyser.connect(context.destination);

            let started = false;
            let type = null;
            let timing = 0;
            let pauseTime = 0;
            let arr = [];
            let isTyped = false;
            setInterval(function () {
                if (isWorking){
                    let array = new Uint8Array(analyser.frequencyBinCount);
                    analyser.getByteFrequencyData(array);

                    if (array[94] > 250){
                        if (!started){
                            started = true;
                            if (isTyped){
                                let spacesNum = getSpace(pauseTime, 55);
                                spacesNum = (spacesNum > 4) ? 2 : spacesNum;
                                let spaces = '';
                                for (let i = 0; i < spacesNum; i++) {
                                    spaces += ' ';
                                }
                                let event = new CustomEvent(
                                    "gotSignal",
                                    {
                                        detail: {
                                            message: spaces,
                                            time: new Date(),
                                        },
                                        bubbles: true,
                                        cancelable: true
                                    }
                                );
                                document.dispatchEvent(event);
                            }
                            pauseTime = 0;
                        }
                        timing += 1;
                        arr.push(array[94]);
                        //console.log(maxHz);
                    } else {
                        if (started){
                            started = false;
                            //console.log('timing:', timing);
                            if (getError(timing, 25, 30)){
                                type = 'short';
                            } else if (getError(timing, 25, 80)){
                                type = 'long';
                            }
                            let event = new CustomEvent(
                                "gotSignal",
                                {
                                    detail: {
                                        message: (type == 'long' ? '-' : (type == 'short' ? '.' : '')),
                                        time: new Date(),
                                    },
                                    bubbles: true,
                                    cancelable: true
                                }
                            );
                            document.dispatchEvent(event);
                            if (!isTyped) isTyped = true;
                            //console.log('type:', type);
                            timing = 0;
                            type = null ;
                        }
                        pauseTime += 1;
                    }
                }
            }, 1);

        }, console.log);
    }
}

function stopToListen() {
    isWorking = false;
}

