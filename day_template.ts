import { Logger, Part, run, Type } from "./day_utils"

function parse(lines: string[]): string[] {
    return lines;
}


function puzzle(lines: string[], part: Part, type: Type, logger: Logger): void {
    const data = parse(lines);
    if (part === Part.PART_1) {
        const result = data.length;
        logger.result(result, [undefined, undefined])
    }
    else {
        const result = data.length;
        logger.result(result, [undefined, undefined])
    }
}

/**
 * Update the date number after copy
 * Adapt types list to your needs and parts also 
 * @see run javadoc
 */
run(99, [Type.TEST, Type.RUN], puzzle, [Part.PART_1, Part.PART_2])