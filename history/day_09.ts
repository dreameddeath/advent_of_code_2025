import { Logger, Part, run, Type } from "../day_utils"
import { World2D } from "../map2d.utils";
import { generator } from "../utils";
type Content = "." | "#" | "X" | "F" | "O"/*out*/;

type Cell = {
    origPos: World2D.Pos,
    content: Content;
    lineIds: Set<number>;
}
function buildPossibles(possible_set: Set<number>) {
    const possible = [...possible_set].sortIntuitive();
    possible.unshift(possible[0] - 1);
    possible.push(possible[possible.length - 1] + 1);
    return possible;
}

function fillLine(a: World2D.Pos, b: World2D.Pos, world: World2D.Map2d<Cell>, isXLoop: boolean, lineId: number) {
    const extract = isXLoop ? (p: World2D.Pos) => p.x : (p: World2D.Pos) => p.y;
    const start = Math.min(extract(a), extract(b));
    const end = Math.max(extract(a), extract(b));

    for (let pos = start; pos <= end; ++pos) {
        world.apply_cell({
            x: isXLoop ? pos : a.x,
            y: isXLoop ? a.y : pos
        }, cell => {
            if (cell.content === ".") {
                cell.content = "X";
            }
            cell.lineIds.add(lineId);
            return cell;
        })
    }

}

function parse(lines: string[]): { world: World2D.Map2d<Cell>, raw_positions: World2D.Pos[], positions: World2D.Pos[], edges: [World2D.Pos, World2D.Pos][] } {
    const raw_positions = lines.map(l => {
        const parts = l.split(",").map(n => parseInt(n, 10));
        return {
            x: parts[0],
            y: parts[1]
        }
    });
    const { world, positions, edges } = buildMap(raw_positions);
    return {
        raw_positions,
        positions,
        world,
        edges
    };
}




function buildMap(raw_positions: { x: number; y: number; }[]): { world: World2D.Map2d<Cell>, positions: World2D.Pos[], edges: [World2D.Pos, World2D.Pos][] } {
    const possible_x_set = new Set<number>();
    const possible_y_set = new Set<number>();

    raw_positions.forEach(pos => {
        possible_x_set.add(pos.x);
        possible_y_set.add(pos.y);
    });
    const possible_x = buildPossibles(possible_x_set);
    const possible_y = buildPossibles(possible_y_set);
    const width = possible_x.length;
    const height = possible_y.length;
    const x_map = new Map<number, number>();
    const y_map = new Map<number, number>();
    possible_x.forEach((x, pos) => x_map.set(x, pos));
    possible_y.forEach((y, pos) => y_map.set(y, pos));
    const row = [...generator(width)];
    const world = new World2D.Map2d<Cell>([...generator(height)].map(y => row.map(x => {
        return {
            content: ".",
            origPos: {
                x: possible_x[x],
                y: possible_y[y]
            },
            lineIds: new Set<number>()
        } satisfies Cell;
    })));
    const positions = raw_positions.map(raw_pos => {
        const newPos = { x: x_map.get(raw_pos.x)!, y: y_map.get(raw_pos.y)! };
        world.cell(newPos).content = "#";
        return newPos;
    });
    const edges = positions.map((pos, i, all) => {
        return [pos, all[(i + 1) % all.length]] as [World2D.Pos, World2D.Pos]
    });
    edges.forEach((line, pos) => {
        fillLine(line[0], line[1], world, line[0].x !== line[1].x, pos);
    });
    return { world, positions, edges };
}

interface Rect {
    a: World2D.Pos,
    b: World2D.Pos,
    area: number
}


function buildRect(a: World2D.Pos, b: World2D.Pos, world: World2D.Map2d<Cell>): Rect {
    const aCell = world.cell(a);
    const bCell = world.cell(b);
    return {
        a,
        b,
        area: (Math.abs(bCell.origPos.x - aCell.origPos.x) + 1) * (Math.abs(bCell.origPos.y - aCell.origPos.y) + 1)
    }
}

function printWorld(world: World2D.Map2d<Cell>, logger: Logger) {
    if (logger.isdebug()) {
        logger.debug(["", ...world.cells().map(l => l.map(c => c.content).join(""))]);
    }
}

function fillOuter(toFill: World2D.Pos[], world: World2D.Map2d<Cell>) {
    while (toFill.length > 0) {
        const pos = toFill.pop()!;
        const cell = world.cell_opt(pos);
        if (cell === undefined) {
            continue;
        }
        if (cell.content ===".") {
            cell.content = "O";
            World2D.ALL_DIRECTIONS.forEach(next => toFill.push(World2D.move_pos(pos, next)));
        }
    }
}

function puzzle(lines: string[], part: Part, type: Type, logger: Logger): void {
    const data = parse(lines);
    fillOuter([{ x: 0, y: 0 }], data.world);
    printWorld(data.world, logger);

    const rects: Rect[] = data.positions.flatMap((a, i, all) => all.slice(i + 1).map(b => buildRect(a, b, data.world))).reverseSortIntuitive(r => r.area);
    const part1 = rects[0].area;
    let part2: number = 0;
    main: for (const rect of rects) {

        const start: World2D.Pos = {
            x: Math.min(rect.a.x, rect.b.x),
            y: Math.min(rect.a.y, rect.b.y),
        };
        const end: World2D.Pos = {
            x: Math.max(rect.a.x, rect.b.x),
            y: Math.max(rect.a.y, rect.b.y),
        };
        for (let y = start.y; y <= end.y; ++y) {
            for (let x = start.x; x <= end.x; ++x) {
                const cell = data.world.cell({ x, y });
                if (cell.content === "O") {
                    continue main;
                }
            }
        }
        part2 = rect.area;
        break;
    }

    logger.result([part1, part2], [50, 4776100539, 24, 1476550548])
}

/**
 * Update the date number after copy
 * Adapt types list to your needs and parts also 
 * @see run javadoc
 */
run(9, [Type.TEST, Type.RUN], puzzle, [Part.ALL], { debug: false })

