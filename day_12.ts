import { Logger, Part, run, Type } from "./day_utils"

type ShapePart = "#" | "."
type ShapeLine = [ShapePart, ShapePart, ShapePart];
interface Shape {
    id: number,
    parts: ShapeLine[],
    nbEmpty: number,
}

interface Region {
    lineId: number;
    width: number;
    height: number;
    constraints: number[];
}

interface World {
    shapes: Shape[],
    regions: Region[]
}
const START_SHAPE = /^\d+:\s*$/;
const PART_SHAPE = /^[#\.]{3}$/;
const REGION = /^(\d+)x(\d+):\s+(.+)*?\s*$/;
function parse(lines: string[]): World {
    const shapes: Shape[] = [];
    let currShape: Shape | undefined;
    const regions: Region[] = [];
    lines.forEach((l, pos) => {
        const regionMatch = REGION.exec(l);

        if (l.trim() === "") {
            currShape = undefined;
            return;
        }
        else if (PART_SHAPE.test(l)) {
            const shapeLine = l.split("") as ShapeLine;
            currShape!.parts.push(shapeLine);
            currShape!.nbEmpty += shapeLine.filter(p => p === ".").length;
        }
        else if (START_SHAPE.test(l)) {
            currShape = {
                id: shapes.length,
                parts: [],
                nbEmpty: 0
            };
            shapes.push(currShape);
            return;
        }
        else if (regionMatch) {
            regions.push({
                lineId: pos + 1,
                width: parseInt(regionMatch[1], 10),
                height: parseInt(regionMatch[2], 10),
                constraints: regionMatch[3].split(/\s+/).map(c => parseInt(c, 10))
            })
        }

    })
    return {
        shapes,
        regions
    };
}

function puzzle(lines: string[], part: Part, type: Type, logger: Logger): void {
    const data = parse(lines);
    if (part === Part.PART_1) {
        const shapeAvgDensity = Math.round(data.shapes.map(s => (9 - s.nbEmpty) / 9).reduce((a, b) => a + b) * 100 / data.shapes.length);
        let count = 0;
        for (const region of data.regions) {
            const countCells = region.height * region.width;
            const requestedCell = region.constraints.map((qty, pos) => (9 - data.shapes[pos].nbEmpty) * qty).reduce((a, b) => a + b);
            const density = Math.round((requestedCell * 1.0 / countCells) * 100)
            if (density < 88) {
                count++;
            }
        }
        const result = data.shapes.length;
        logger.result(count, [2, 422])
    }
    else {
        const result = data.shapes.length;
        logger.result(result, [undefined, undefined])
    }
}

/**
 * Update the date number after copy
 * Adapt types list to your needs and parts also 
 * @see run javadoc
 */
run(12, [Type.TEST, Type.RUN], puzzle, [Part.PART_1, Part.PART_2])