import { Logger, Part, run, Type } from "../day_utils"
import { ExtendedMap } from "../mapUtils";

interface Line {
    allVals: number[]
}

function parse(lines: string[]): Line[] {
    return lines.map(l => {
        const parsed = l.split("").map(i => parseInt(i, 10));
        return {
            allVals:parsed,
        } satisfies Line
    });
}

function process(val: Line, maxsize: number): number {
    let resFirstDigit = val.allVals[0]*10;
    let res = resFirstDigit+val.allVals[1];
    const ending = val.allVals.length-1
    for(let pos=1;pos<ending;++pos){
        const newResFirtDigit = val.allVals[pos]*10;
        if(newResFirtDigit>resFirstDigit){
            resFirstDigit = newResFirtDigit;
            res = resFirstDigit+val.allVals[pos+1];
        }
        const newVal = resFirstDigit+val.allVals[pos+1];
        if(newVal>res){
            res = newVal;
        }
    }
    return res;
}

function processV2(val: Line, maxsize: number): number {
    let currentNumber = val.allVals.slice(0,maxsize);
    const ending = val.allVals.length-(maxsize-1);
    for(let pos=1;pos<ending;++pos){
        for(let posNumber=0;posNumber<maxsize;posNumber++){
            if(currentNumber[posNumber]<val.allVals[pos+posNumber]){
                currentNumber = currentNumber.slice(0,posNumber).concat(val.allVals.slice(pos+posNumber,pos+maxsize));
            }
        }
    }
    return currentNumber.reduce((a,b)=>a*10+b);
}


function puzzle(lines: string[], part: Part, type: Type, logger: Logger): void {
    const data = parse(lines);
    if (part === Part.PART_1) {
        const result = data.map(list => processV2(list, 2)).reduce((a, b) => a + b);
        logger.result(result, [357, 17321])
    }
    else {
        const result = data.map(list => processV2(list, 12)).reduce((a, b) => a + b);
        logger.result(result, [3121910778619, 171989894144198])
    }
}

/**
 * Update the date number after copy
 * Adapt types list to your needs and parts also 
 * @see run javadoc
 */
run(3, [Type.TEST, Type.RUN], puzzle, [Part.PART_1, Part.PART_2])