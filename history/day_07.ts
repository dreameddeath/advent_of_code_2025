import { Logger, Part, run, Type } from "../day_utils"
import { World2D } from "../map2d.utils";

type VALUES = "." | "^" | "|" | "S";
interface Cell {
    value: VALUES,
    nbParentPath: number
}

function parse(lines: string[]): World2D.Map2d<Cell> {
    const map = new World2D.Map2d(lines.map(l => l
        .split("")
        .map(c => {
            return {
                value: c as VALUES,
                nbParentPath: 0
            }
        }
        )
    )
    );
    return map;
}

function process(input: World2D.Map2d<Cell>): number {
    let splits = 0;
    input.apply_to_all(World2D.Dir.LEFT, World2D.Dir.DOWN, (pos) => {
        const cell = input.cell(pos);
        const above = input.move_pos_with_cell(pos, World2D.Dir.UP);
        if (above === undefined) {
            return;
        }
        if (above.cell.value === "S" || (cell.value !== "^" && above.cell.value === "|")) {
            cell.value = "|";
            if (above.cell.value === "S") {
                cell.nbParentPath++;
            } else {
                cell.nbParentPath += above.cell.nbParentPath;
            }
        }

        if (cell.value !== "^" || above?.cell?.value !== "|") {
            return;
        }
        splits++;
        manageSplit(input.move_pos_with_cell(pos, World2D.Dir.LEFT), above.cell);
        manageSplit(input.move_pos_with_cell(pos, World2D.Dir.RIGHT), above.cell);
    });
    return splits
}

function manageSplit(splittedCell: World2D.PosAndCell<Cell> | undefined, cell: Cell) {
    if (splittedCell === undefined) {
        return
    }
    if (splittedCell.cell.value === ".") {
        splittedCell.cell.value = "|";
    }
    splittedCell.cell.nbParentPath += cell.nbParentPath;
}

function puzzle(lines: string[], part: Part, type: Type, logger: Logger): void {
    const data = parse(lines);
    const splits = process(data);

    const nbPaths = data.cells()[data.height() - 1].reduce((total, c) => total + c.nbParentPath, 0)
    logger.result([splits, nbPaths], [21, 1658, 40, 53916299384254])
}

/**
 * Update the date number after copy
 * Adapt types list to your needs and parts also 
 * @see run javadoc
 */
run(7, [Type.TEST, Type.RUN], puzzle, [Part.ALL])