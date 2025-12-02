import { Logger, Part, run, Type } from "../day_utils"

interface Range {
    start: number;
    startStr: string;
    end: number;
    endStr: string;
}

function parse(lines: string[]): Range[] {
    return lines[0]
        .split(",")
        .map(part => {
            const range = part.split("-");
            const parsed = range.map(n => parseInt(n, 10));
            return {
                start: parsed[0],
                startStr: range[0],
                end: parsed[1],
                endStr: range[1]
            } satisfies Range;
        });
}

function isValid(strNumber: string, strLength: number, parts: number): boolean {
    if ((strNumber.length % parts) !== 0) {
        return true;
    }

    const steps = Math.floor(strNumber.length / parts);
    const left = strNumber.substring(0, steps);
    for (let startPosRight = steps; startPosRight < strLength; startPosRight += steps) {
        if (left !== strNumber.substring(startPosRight, startPosRight + steps)) {
            return true;
        }
    }
    return false;
}

function sumValidRange(range: Range, logger: Logger): [number, number] {
    let sumPart1 = 0;
    let sumPart2 = 0;
    for (let curr = range.start; curr <= range.end; curr++) {
        const strNumber = curr.toString();
        const strLength = strNumber.length;
        for (let parts = 2; parts <= strLength; ++parts) {
            if (!isValid(strNumber, strLength, parts)) {
                sumPart2 += curr;
                if (parts === 2) {
                    logger.debug(() => "Found invalid " + curr);
                    sumPart1 += curr;
                }
                break;
            }
        }
    }
    return [sumPart1, sumPart2];
}

function puzzle(lines: string[], part: Part, type: Type, logger: Logger): void {
    const data = parse(lines);

    const result = data.map(r => sumValidRange(r, logger)).reduce((a, b) => [a[0] + b[0], a[1] + b[1]]);
    logger.result(result, [1227775554, 16793817782, 4174379265, 27469417404]);
}

/**
 * Update the date number after copy
 * Adapt types list to your needs and parts also 
 * @see run javadoc
 */
run(2, [Type.TEST, Type.RUN], puzzle, [Part.ALL], { debug: false })