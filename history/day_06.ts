import { Logger, Part, run, Type } from "../day_utils"

interface Input {
    operation: '*' | '+';
    size: number,
    dataPart1: number[],
    dataPart2: number[]
}
const OPERATOR_PATTERN = /(?:\*|\+)\s+/g;
const baseNumber = "0".charCodeAt(0);

function parse(lines: string[]): Input[] {
    const operatorsLine = lines.pop()!+" ";
    const operators = [...operatorsLine.matchAll(OPERATOR_PATTERN)];

    const inputs: Input[] = operators
        .map(i => i[0])
        .map(op => {
            return {
                operation: op.trim() as "*" | "+",
                size: op.length,
                dataPart1: [],
                dataPart2: []
            }
        });
    lines.forEach(line => line.split(/\s+/).filter(s => s !== "").map(n => parseInt(n, 10)).forEach((number, i) => inputs[i].dataPart1.push(number)));
    let currentStrPos = 0;
    for (const input of inputs) {
        const endStrPos = currentStrPos + input.size-1;
        for (; currentStrPos < endStrPos; ++currentStrPos) {
            let currentNumber = 0;
            for (let linePos = 0; linePos < lines.length; ++linePos) {
                const digit = lines[linePos][currentStrPos];
                if (digit != " ") {
                    currentNumber = currentNumber * 10 + (digit.charCodeAt(0) - baseNumber);
                }
            }
            input.dataPart2.push(currentNumber)
        }
        ++currentStrPos;
    }
    return inputs;
}

function calc(input: Input): [number, number] {
    if (input.operation === "*") {
        return [
            input.dataPart1.reduce((a, b) => a * b),
            input.dataPart2.reduce((a, b) => a * b)
        ]
    } else {
        return [
            input.dataPart1.reduce((a, b) => a + b),
            input.dataPart2.reduce((a, b) => a + b),
        ]
    }
}

function puzzle(lines: string[], part: Part, type: Type, logger: Logger): void {
    const data = parse(lines);
    const result = data.map(input => calc(input)).reduce((a, b) => [a[0] + b[0], a[1] + b[1]]);
    logger.result(result, [4277556, 4693159084994, 3263827, 11643736116335]);
}

/**
 * Update the date number after copy
 * Adapt types list to your needs and parts also 
 * @see run javadoc
 */
run(6, [Type.TEST, Type.RUN], puzzle, [Part.ALL])