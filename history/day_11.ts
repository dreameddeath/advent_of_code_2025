import { Logger, Part, run, Type } from "../day_utils"
import { ExtendedMap } from "../mapUtils";

interface Node {
    id: string,
    linksStr: string[];
    links: Node[];
    reverseLinks: Node[];
    isInPath: ExtendedMap<string, boolean>;
    paths: ExtendedMap<string, number>
}

function parse(lines: string[]): ExtendedMap<string, Node> {
    const maps = new ExtendedMap<string, Node>();
    lines.forEach(l => {
        const [name, links] = l.split(": ");
        maps.set(name, {
            id: name,
            isInPath: new ExtendedMap(),
            linksStr: links.split(/\s+/),
            links: [],
            reverseLinks: [],
            paths: new ExtendedMap()
        } satisfies Node)
    });
    maps.set("out", {
        id: "out",
        links: [],
        isInPath: new ExtendedMap(),
        linksStr: [],
        reverseLinks: [],
        paths: new ExtendedMap()
    });
    maps.forEach((node) => {
        node.links = node.linksStr.map(n => {
            const nextNode = maps.get(n)!;
            nextNode.reverseLinks.push(node);
            return nextNode
        })
    });
    return maps;
}

function findPath(curr: Node, processed: Set<string>, extremities: [string, string], key: string, excluded: Set<string>): boolean {
    if (processed.has(curr.id)) {
        return curr.isInPath.get(key) === true;
    }
    processed.add(curr.id);
    if (excluded.has(curr.id)) {
        curr.isInPath.set(key, false);
        return curr.isInPath.get(key)!;
    }

    if (extremities.includes(curr.id)) {
        curr.isInPath.set(key, true);
    }
    curr.isInPath.set(key,
        curr.reverseLinks.reduce((inPath, previousNode) =>
            findPath(previousNode, processed, extremities, key, excluded) || inPath,
            curr.isInPath.get(key) === true
        ));
    return curr.isInPath.get(key)!;
}


function findNbPath(curr: Node, pathKey: string, startStr: string, endStr: string, nodesToProcess: Set<string>): void {
    if (curr.links.some(next => nodesToProcess.has(next.id))) {
        return;
    }
    if (!curr.isInPath.get(pathKey)) {
        throw new Error("Should not occurs");
    }
    if (curr.id === startStr) {
        return;
    }
    nodesToProcess.delete(curr.id);
    const nbPaths = curr.id === endStr ? 1 : countCurrentPaths(curr, pathKey);
    const toProcess: Node[] = [];
    const nextKey = pathKey + "#" + curr.id;
    curr.reverseLinks
        .filter(n => n.isInPath.get(pathKey) === true)
        .forEach(previousNode => {
            if (previousNode.paths.get(nextKey) !== nbPaths) {
                previousNode.paths.set(nextKey, nbPaths);
                nodesToProcess.add(previousNode.id);
                toProcess.push(previousNode)
            }
        });
    toProcess.forEach(n => findNbPath(n, pathKey, startStr, endStr, nodesToProcess));
}

function findNbPathForPath(data: ExtendedMap<string, Node>, startStr: string, endStr: string, excludedNode: Set<string>) {
    const startNode = data.get(startStr)!;
    const endNode = data.get(endStr)!;
    const pathKey = `${startStr}|${endStr}`;
    findPath(endNode, new Set(), [startStr, endStr], pathKey, excludedNode);
    findNbPath(endNode, pathKey, startStr, endStr, new Set());
    return countCurrentPaths(startNode, pathKey);
}


function countCurrentPaths(currNode: Node, pathKey: string) {
    return currNode.paths.entries().filter(([k, v]) => k.startsWith(pathKey)).reduce((t, [k, v]) => t + v, 0);
}

function puzzle(lines: string[], part: Part, type: Type, logger: Logger): void {
    const data = parse(lines);

    if (part === Part.PART_1) {
        const nbPath = findNbPathForPath(data, "you", "out", new Set());
        logger.result(nbPath, [5, 668])
    }
    else {
        const one = findNbPathForPath(data, "svr", "dac", new Set(["fft", "out"]))
            * findNbPathForPath(data, "dac", "fft", new Set(["svr", "out"]))
            * findNbPathForPath(data, "fft", "out", new Set(["svr", "dac"]));
        const two = findNbPathForPath(data, "svr", "fft", new Set(["dac", "out"]))
            * findNbPathForPath(data, "fft", "dac", new Set(["svr", "out"]))
            * findNbPathForPath(data, "dac", "out", new Set(["svr", "fft"]));

        const result = one + two;
        logger.result(result, [2, 294310962265680])
    }
}

/**
 * Update the date number after copy
 * Adapt types list to your needs and parts also 
 * @see run javadoc
 */
run(11, [Type.TEST, Type.RUN], puzzle, [Part.PART_1, Part.PART_2])
