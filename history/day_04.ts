import { Logger, Part, run, Type } from "../day_utils"
import { World2D } from "../map2d.utils";

enum TypeCell {
    ROLL = "@",
    EMPTY = ".",
    REMOVED = "x"
}

function parse(lines: string[]): World2D.Map2d<TypeCell> {
    return new World2D.Map2d(lines.map(l => l.split("").map(c => { return c as TypeCell })));
}

function runPass(data: World2D.Map2d<TypeCell>): number {
    let validPos: World2D.Pos[] = [];
    data.apply_to_all(World2D.Dir.RIGHT, World2D.Dir.DOWN, pos => {
        if (data.cell(pos) !== TypeCell.ROLL) {
            return;
        }
        const adjacentRolls = [...data.move_all_direction_with_cell(pos, { withDiags: true, cyclic: false })].filter(cell => cell.cell === TypeCell.ROLL);
        if (adjacentRolls.length < 4) {
            validPos.push(pos);
        }
    });
    validPos.forEach(pos => data.apply_cell(pos, c => TypeCell.REMOVED));
    return validPos.length;
}

function puzzle(lines: string[], part: Part, type: Type, logger: Logger): void {
    const data = parse(lines);
    const pass1 = runPass(data);
    let total = pass1;
    let lastPass = pass1;
    do {
        lastPass = runPass(data);
        total += lastPass;
    } while (lastPass > 0);

    const pass2 = total;
    logger.result([pass1, pass2], [13, 1428, 43, 8936])

}

/**
 * Update the date number after copy
 * Adapt types list to your needs and parts also 
 * @see run javadoc
 */
run(4, [Type.TEST, Type.RUN], puzzle, [Part.ALL])