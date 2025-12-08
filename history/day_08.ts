import { randomUUID } from "crypto";
import { Logger, Part, run, Type } from "../day_utils"

interface Point3D {
    x: number,
    y: number,
    z: number,
    parentCircuit?: Circuit
}
function parse(lines: string[]): Point3D[] {
    return lines.map(l => {
        const coords = l.split(",");
        return {
            x: parseInt(coords[0], 10),
            y: parseInt(coords[1], 10),
            z: parseInt(coords[2], 10)
        }
    });
}

interface Pair {
    a: Point3D,
    b: Point3D,
    distance: number
}

function calcPairs(points: Point3D[]): Pair[] {
    return points.flatMap(((a, i, array) => array.slice(i + 1).map(b => {
        return {
            a,
            b,
            distance: (b.x - a.x) ** 2 + (b.y - a.y) ** 2 + (b.z - a.z) ** 2,
            circuitId: -1
        }
    })));
}

interface Circuit {
   parent?: Circuit
    size: number
    depth: number
    //child: Circuit[];
}

function puzzle(lines: string[], part: Part, type: Type, logger: Logger): void {
    const data = parse(lines);
    const pairs = calcPairs(data).sortIntuitive(p => p.distance)
    const circuits: Circuit[] = [];
    const maxSizePart1 = type === Type.TEST ? 10 : 1000;
    let resultPart1: number = 0;
    let resultPart2: number = 0;
    for (let pos = 0; pos < pairs.length; ++pos) {
        const pair = pairs[pos];
        managePair(pair, circuits);
        if (circuits[0].size === lines.length) {
            resultPart2 = pair.a.x * pair.b.x;
            break;
        }
        if (pos === maxSizePart1 - 1) {
            resultPart1 = circuits.map(c => c.size).reverseSortIntuitive().slice(0, 3).reduce((p, item) => p * item, 1)
        }
    }

    logger.result([resultPart1, resultPart2], [40, 175500, 25272, 6934702555])
}

/**
 * Update the date number after copy
 * Adapt types list to your needs and parts also 
 * @see run javadoc
 */
run(8, [Type.TEST, Type.RUN], puzzle, [Part.ALL])


function findRoot(circuit: Circuit): Circuit {
    let curr = circuit;
    while (curr.parent !== undefined) {
        curr = curr.parent;
    }
    return curr
}
function managePair(pair: Pair, circuits: Circuit[]) {
    if (pair.a.parentCircuit === undefined && pair.b.parentCircuit === undefined) {
        const targetCircuit: Circuit = {
            depth: 0,
            size: 2,
        };
        pair.a.parentCircuit = targetCircuit;
        pair.b.parentCircuit = targetCircuit;
        circuits.push(targetCircuit)
    } else if (pair.a.parentCircuit === undefined) {
        pair.a.parentCircuit = findRoot(pair.b.parentCircuit!);
        pair.a.parentCircuit.size++;
    } else if (pair.b.parentCircuit === undefined) {
        pair.b.parentCircuit = findRoot(pair.a.parentCircuit!);
        pair.b.parentCircuit.size++;
    } else {
        const aRoot = findRoot(pair.a.parentCircuit!)
        const bRoot = findRoot(pair.b.parentCircuit);
        if (aRoot === bRoot) {
            return;
        }
        const bRootPos = circuits.indexOf(bRoot);
        circuits.splice(bRootPos, 1);
        aRoot.depth += bRoot.depth + 1;
        aRoot.size += bRoot.size;
        bRoot.parent = aRoot;
    }
}
