import { Logger, Part, run, Type } from "./day_utils"

type Range = [bigint, bigint];
interface Input {
    rawRanges: Range[];
    rangeTree: RangeTree;
    ids: bigint[];
}


interface RangeTreeItem {
    range: Range;
    left: RangeTree;
    right: RangeTree;
}

type RangeTree = RangeTreeItem | undefined;


function splitRangeTree(orig: Range, other: Range): { left?: Range, common: Range, right?: Range } {
    return {
        left: (other[0] < orig[0]) ? [other[0], orig[0] - 1n] : undefined,
        common: [orig[0], orig[1]],
        right: other[1] > orig[1] ? [orig[1] + 1n, other[1]] : undefined
    }
}

function insertTree(range: Range, tree: RangeTree): RangeTree {
    if (tree === undefined) {
        return {
            range,
            left: undefined,
            right: undefined
        }
    }
    if (tree.range[0] > range[1]) {
        tree.left = insertTree(range, tree.left);
        return tree;
    } else if (tree.range[1] < range[0]) {
        tree.right = insertTree(range, tree.right);
        return tree;
    }
    const mapped = splitRangeTree(tree.range, range);
    return {
        range: mapped.common,
        left: mapped.left === undefined ? tree.left : insertTree(mapped.left, tree.left),
        right: mapped.right === undefined ? tree.right : insertTree(mapped.right, tree.right),
    }
}

function parse(lines: string[]): Input {
    const ranges: Range[] = [];
    let rangeTree: RangeTree = undefined;
    const ids: bigint[] = []
    lines.forEach(l => {
        if (l === "") {
            return;
        }
        if (l.includes("-")) {
            const range = l.split("-").map(id => BigInt(id)) as Range;
            rangeTree = insertTree(range, rangeTree);
            ranges.push(range);
        } else {
            ids.push(BigInt(l));
        }
    });
    return {
        rawRanges: ranges.sortIntuitive(i=>i[0]),
        rangeTree,
        ids
    };
}

function nbItems(range: Range): bigint {
    return (range[1] - range[0]) + 1n;
}

function findRangeTree(id: bigint, rangeTree: RangeTree): boolean {
    if (rangeTree === undefined) {
        return false;
    }
    if (id < rangeTree.range[0]) {
        return findRangeTree(id, rangeTree.left);
    } else if (id > rangeTree.range[1]) {
        return findRangeTree(id, rangeTree.right);
    }
    return true;
}


function countRangeTree(tree: RangeTree): bigint {
    if (tree === undefined) {
        return 0n;
    }
    return nbItems(tree.range) + countRangeTree(tree.left) + countRangeTree(tree.right);
}

function puzzle(lines: string[], part: Part, type: Type, logger: Logger): void {
    const data = parse(lines);
    const foundValidIds = data.ids.filter(id => findRangeTree(id, data.rangeTree));
    const sumAll = countRangeTree(data.rangeTree);
    logger.result([BigInt(foundValidIds.length), sumAll], [3n, 744n, 14n, 347468726696961n])

}

/**
 * Update the date number after copy
 * Adapt types list to your needs and parts also 
 * @see run javadoc
 */
run(5, [Type.TEST, Type.RUN], puzzle, [Part.ALL])