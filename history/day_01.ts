import { stat } from "fs";
import { Logger, Part, run, Type } from "../day_utils"

interface ClockStep {
    dir: string,
    steps: number,
    raw: string
}
function parse(lines: string[]): ClockStep[] {
    return lines.map(l => {
        return {
            raw: l,
            dir: l[0],
            steps: parseInt(l.substring(1))
        }
    });
}


function puzzle(lines: string[], part: Part, type: Type, logger: Logger): void {
    const data = parse(lines);

    let state = {
        nbCountPart1: 0,
        nbCountPart2: 0,
        pos: 50
    };

    const result = data.reduce((state, input) => {
        let steps = (input.dir === "L" ? -input.steps : input.steps);
        while (steps !== 0) {
            if (steps <= -100) {
                state.nbCountPart2++;
                steps += 100;
            } else if (steps >= 100) {
                state.nbCountPart2++;
                steps -= 100;
            } else {
                const isZeroBefore = state.pos===0;
                state.pos += steps;
                if (state.pos < 0) {
                    state.pos += 100;
                    if(!isZeroBefore){
                    state.nbCountPart2++;
                    }
                } else if (state.pos >= 100) {
                    state.pos -= 100;
                    state.nbCountPart2++;
                    if (state.pos === 0) {
                        state.nbCountPart1++;
                    }
                } else if (state.pos === 0) {
                    state.nbCountPart1++;
                    state.nbCountPart2++;
                }
                steps=0;
            }
        }
        logger.debug("Step :" + input.raw + " :" + state.pos + " counter " + state.nbCountPart2);
        return state;
    }, state);
    logger.result([result.nbCountPart1, result.nbCountPart2], [3, 1071, 6, 6700])

}

/**
 * Update the date number after copy
 * Adapt types list to your needs and parts also 
 * @see run javadoc
 */
run(1, [Type.TEST, Type.RUN], puzzle, [Part.ALL], { debug: false })