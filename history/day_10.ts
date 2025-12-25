import { hoursToMinutes } from "date-fns";
import { Logger, Part, run, Type } from "../day_utils"
import { ExtendedMap } from "../mapUtils";
import { PriorityQueue } from "../priority_queue";
import { PerfTimer } from "../utils";

function removeExtremities(orig: string): string {
    return orig.substring(1, orig.length - 1);
}

function strToNumberList(orig: string): number[] {
    return removeExtremities(orig).split(",").map(n => parseInt(n, 10));
}

interface ButtonsInfo {
    positions: number[];
    value: number,
    valueStr: string
}

interface Schematic {
    id: number,
    maxIndicator: number;
    indicators: number;
    joltage: number[],
    buttons: ButtonsInfo[]
}

function parse(lines: string[]): Schematic[] {
    return lines.map((l, id) => {
        const parts = l.split(/\s+/);
        const indicatorStr = removeExtremities(parts.shift()!).split("");
        const inidicatorLights = indicatorStr.reduce((total, v) => (total << 1) + (v === "#" ? 1 : 0), 0);
        const joltage = strToNumberList(parts.pop()!);
        const buttonsList = parts.map(bStr => {
            const buttonPositions = strToNumberList(bStr);
            const value = buttonPositions
                .map(n => 2 ** (indicatorStr.length - n - 1))
                .reduce((a, b) => a + b);
            return {
                positions: buttonPositions,
                value,
                valueStr: value.toString(2)
            }
        });
        return {
            id,
            maxIndicator: 2 ** (indicatorStr.length) - 1,
            joltage,
            indicators: inidicatorLights,
            buttons: buttonsList
        }
    });
}

interface StatePart1 {
    indicator: number;
    nbStep: number;
}
function solvePart1(schematic: Schematic): number {
    const target = schematic.indicators;
    const queue = new PriorityQueue<StatePart1>(s => s.nbStep, true);
    queue.put({
        indicator: target,
        nbStep: 0,
    });

    while (queue.isNotEmpty()) {
        const state = queue.pop()!;
        if (state.item.indicator === 0) {
            return state.item.nbStep;
        }
        const currentIndicator = state.item.indicator;
        for (const button of schematic.buttons) {
            const newIndicator = (button.value ^ currentIndicator) & schematic.maxIndicator;
            queue.put({
                indicator: newIndicator,
                nbStep: state.item.nbStep + 1,
            }, "" + newIndicator);
        }
    }
    throw new Error("Not found");
}

type PossibleContrib = number[][];

function buildNewConstraints(btnPositions: number[], parentConstraints: number[], constrainedButtonsPos: number[], constrains: PossibleContrib) {
    return constrains.filter(c =>
        constrainedButtonsPos.every(pos => !btnPositions.includes(pos) || c[pos] === parentConstraints[pos]))
        .map(c => [...c])
        .map(c => {
            btnPositions.forEach(pos => c[pos] = parentConstraints[pos]);
            return c;
        });
}

function displayEquation(prefix: string, joltsInfo: JoltInfo[], logger: Logger, force?: boolean) {
    if (force !== true && !logger.isdebug()) {
        return;
    }
    const equations: string[] = [];
    for (let pos = 0; pos < joltsInfo.length; ++pos) {
        const joltInfo = joltsInfo[pos];
        const left = [...joltInfo.btns].map(appBtn => "b" + appBtn).join(" + ");
        const after = [...joltInfo.targetBtns.entries()].map(([btn, qty]) => (qty === 1 ? "" : `${qty} * `) + `b${btn}`);
        const right = [joltInfo.target, ...after].join(" + ");
        equations.push(`${left} = ${right}`);
    }
    logger.debug(prefix + "\n" + equations.join("\n"));
}

interface JoltInfo {
    pos: number,
    btns: Set<number>,
    target: number;
    targetBtns: ExtendedMap<number, number>,
}


function buildJoltsInfo(schematic: Schematic): JoltInfo[] {
    return schematic.joltage.map((target, posJ) => {
        const btns = new Set<number>();
        schematic.buttons.forEach((btn, posBtn) => {
            if (btn.positions.includes(posJ)) {
                btns.add(posBtn)
            }
        });
        return {
            pos: posJ,
            target,
            btns,
            targetBtns: new ExtendedMap<number, number>(),
        }
    })
}


type CalculatorMinMax = (inputs: (number | undefined)[]) => [number, number];

type CalculatorSimple = (inputs: (number | undefined)[]) => number;

type CalculatorCheck = (inputs: (number | undefined)[]) => boolean;

type Contraint = {
    btns: Set<number>
    check: CalculatorCheck
};
interface ToSolveStepWithImmediate {
    btnSolvableImmediately: [number, CalculatorSimple][],
    next: ToSolveStep,
    constraints: Contraint[]
}


interface ToSolveStepWithRange {
    btnPos: number,
    btnMax: CalculatorMinMax,
    next: ToSolveStep,
    constraints: Contraint[]
}

interface ToSolveCheckStart {
    validate: CalculatorCheck
}

type ToSolveStep = ToSolveStepWithRange | ToSolveStepWithImmediate | ToSolveCheckStart;

function buildChecks(jolts: JoltInfo[]): CalculatorCheck {
    const exprBody = jolts.map((j, pos) => {
        const leftExpr = [...j.btns.keys()].map(btn => `input[${btn}]`).join("+");
        const targetBtnsExpr = [...j.targetBtns.entries()].map(e => `(${e[1]})*input[${e[0]}]`);
        let right = ["" + j.target, ...targetBtnsExpr].join(" + ");
        return `if((${leftExpr}) !== (${right})) { return false; }`;
    }).join("\n");
    const fullExpr = `function check(input){
    ${exprBody}
    return true;
    }\n
    check`;

    return eval(fullExpr);
}

function buildMinOfExpr(jolts: JoltInfo[]): CalculatorSimple {
    if (jolts.length === 0) {
        return () => 0
    }
    const exprBody = jolts.map((j, pos) => {
        const targetBtnsExpr = [...j.targetBtns.entries()].map(e => `(${e[1]})*input[${e[0]}]`);
        let calculateExpr = ["" + j.target, ...targetBtnsExpr].join(" + ");

        if (pos === 0) {
            return `let minContrib=${calculateExpr};`;
        } else {
            return `minContrib=Math.min(minContrib,${calculateExpr});`;
        }
    }).join("\n") + "return minContrib\n";
    const fullExpr = `function minFound(input){
    ${exprBody}}\n
    minFound`;
    const fct = eval(fullExpr)
    return fct;
}


function buildMinMax(jolts: JoltInfo[]): CalculatorMinMax {
    const exprBody = jolts.map((j, pos) => {
        if (j.btns.size === 1) {
            throw new Error("Shouldn't occurs");
        }
        const targetBtnsExpr = [...j.targetBtns.entries()].map(e => `(${e[1]})*input[${e[0]}]`);
        let calculateExpr = ["" + j.target, ...targetBtnsExpr].join(" + ");

        if (pos === 0) {
            return `let range=[0,${calculateExpr}];`;
        } else {
            return `range=[Math.max(range[0],0),Math.min(range[1],${calculateExpr})];`;
        }
    }).join("\n") + "return range\n";
    const fullExpr = `function range(input){
    ${exprBody}}\n
    range`;
    const fct = eval(fullExpr)
    return fct;
}

function builtToSolveSteps(inputJolts: JoltInfo[], knownBtns: Set<number>, check: CalculatorCheck, logger: Logger): { next: ToSolveStep, constraints: Contraint[] } {
    if (inputJolts.length === 0) {
        return { next: { validate: check }, constraints: [] };
    }

    const jolts = simplifyPart2(inputJolts, logger);
    displayEquation("After Simplification", jolts, logger);

    if (jolts.filter(j => j.btns.size === 1).length > 0) {
        return buildToSolveCalculateSteps(jolts, knownBtns, logger, check);
    }
    return buildToSolveLoopOnBtn(jolts, knownBtns, logger, check);
}
type SimplifiableEqn = { posEquation: number, btn: number }
type Pairs = {
    posA: number,
    posB: number,
    common: Set<number>,
    onlyOneDiffPos: SimplifiableEqn | undefined,
}
function buildToSolveLoopOnBtn(jolts: JoltInfo[], knownBtns: Set<number>, logger: Logger, check: CalculatorCheck) {
    const countPerNumber: ExtendedMap<number, number[]> = new ExtendedMap();
    jolts.forEach(j => {
        if (j.btns.size === 1) {
            j.btns.values();

        }
        j.btns
            .forEach(pos => countPerNumber.apply(pos,
                (eqs) => {
                    eqs.push(j.pos);
                    return eqs;
                },
                () => [])
            );
    });
    const simplification = findBestSimplifiable(jolts);
    let orderedSimplification = simplification?.onlyOneDiffPos?.btn;
    let orderedComplex = [...countPerNumber.entries()].reverseSortIntuitive(a => a[1].length);
    const nextBtnToProcess = orderedSimplification !== undefined ?
        orderedSimplification : (orderedComplex[0][0]);
    const newKnownBtns = new Set(knownBtns).add(nextBtnToProcess);
    const toProcess = countPerNumber.get(nextBtnToProcess)!;
    const btnMax = buildMinMax(jolts.filter(j => toProcess.includes(j.pos)));
    const allJotsRewritten = jolts.map(j => {
        if (!toProcess.includes(j.pos)) {
            return j;
        }
        const newBtns = new Set(j.btns);
        newBtns.delete(nextBtnToProcess);
        const newBtnsTarget = new ExtendedMap([...j.targetBtns.entries()]);
        newBtnsTarget.apply(nextBtnToProcess, (curr) => curr - 1, () => 0);
        return {
            pos: j.pos,
            btns: newBtns,
            target: j.target,
            targetBtns: newBtnsTarget
        } satisfies JoltInfo;
    }).filter(j => j.btns.size >= 0);
    logger.debug("Looping on b" + nextBtnToProcess);
    const { next, constraints } = builtToSolveSteps(allJotsRewritten, newKnownBtns, check, logger);
    const applicableConstraints = constraints.filter(c => c.btns.has(nextBtnToProcess));
    const nonApplicableContraints = constraints.filter(c => !c.btns.has(nextBtnToProcess));
    return {
        next: {
            btnMax,
            next,
            btnPos: nextBtnToProcess,
            constraints: applicableConstraints
        },
        constraints: nonApplicableContraints
    };
}


function buildContraints(exprs: JoltInfo[]): Contraint[] {
    const toCheck = exprs.flatMap(expr => {
        return {
            target: expr.target,
            partialBtns: [...expr.targetBtns.entries()].filter(([btn, qty]) => !isInteger(qty))
        }
    }).filter(item => item.partialBtns.length > 0);
    if (toCheck.length === 0) {
        return [];
    }
    return toCheck.map(item => {
        const btns = new Set<number>(item.partialBtns.map(partialBtn => partialBtn[0]));
        const shouldBeInteger = `const shouldBeInteger = ${item.target} + ` + item.partialBtns.map(partialBtn => `input[${partialBtn[0]}]*(${partialBtn[1]})`).join(" + ");
        const fct = `function checkInteger(input){
            ${shouldBeInteger};
            return Number.isInteger(Math.trunc(shouldBeInteger * 10000) / 10000)
        }
        checkInteger`
        return {
            btns,
            check: eval(fct)
        }
    })
}

function buildToSolveCalculateSteps(jolts: JoltInfo[], knownBtns: Set<number>, logger: Logger, check: CalculatorCheck): { next: ToSolveStep, constraints: Contraint[] } {
    const solvableImmediatelty = new ExtendedMap<number, number[]>();
    jolts.filter(j => j.btns.size === 1)
        .forEach(j =>
            j.btns.values()
                .forEach(btn => solvableImmediatelty.apply(btn, (eqs) => { eqs.push(j.pos); return eqs }, () => []))
        );

    const solvableExprPerBtn = new Map<number, JoltInfo[]>();
    solvableImmediatelty.entries().forEach(([btn, eqsPos]) => solvableExprPerBtn.set(btn, jolts.filter(j => eqsPos.includes(j.pos))));
    const newContraints = buildContraints([...solvableExprPerBtn.values().flatMap(v => v)]);
    const solvableBtns = new Set(solvableImmediatelty.keys());
    const joltsToProcess: JoltInfo[] = jolts.filter(j => j.btns.size > 1)
        .map(j => {
            const commonBtns = j.btns.intersection(solvableBtns);
            if (commonBtns.size === 0) {
                return j;
            }
            const newTargetBtns = new ExtendedMap([...j.targetBtns.entries()]);
            commonBtns.forEach(commonBtn => newTargetBtns.apply(commonBtn, (curr) => curr - 1, () => 0));
            return {
                btns: j.btns.difference(commonBtns),
                pos: j.pos,
                target: j.target,
                targetBtns: newTargetBtns,
            } satisfies JoltInfo;
        });
    const orderedSolve = [...solvableExprPerBtn.entries()].sort((btnAInfo, btnBInfo) => {
        //If B depends on A, then B must be After A 
        if (btnBInfo[1].some(eq => eq.targetBtns.has(btnAInfo[0]))) {
            return -1;
        }

        //If A depends on B then  A must be after B
        else if (btnAInfo[1].some(eq => eq.targetBtns.has(btnBInfo[0]))) {
            return 1;
        }
        return 0;
    });
    logger.debug("Calc in order " + orderedSolve.map(item => "b" + item[0]));
    const exprUsed = new Set<number>();
    const newKownBtns = new Set(knownBtns).union(solvableBtns);
    const { next, constraints } = builtToSolveSteps(joltsToProcess, newKownBtns, check, logger);
    const applicableContraint = constraints.filter(c => c.btns.intersection(solvableBtns).size > 0);
    const nonApplicableContraint = constraints.filter(c => c.btns.intersection(solvableBtns).size === 0);
    return {
        next: {
            btnSolvableImmediately: orderedSolve.map(item => [
                item[0], buildMinOfExpr(item[1]
                    .filter(eq => !exprUsed.has(eq.pos))
                    .map(eq => { exprUsed.add(eq.pos); return eq; }))
            ] as const),
            next,
            constraints: applicableContraint
        }, constraints: [...newContraints, ...nonApplicableContraint]
    };
}

function findBestSimplifiable(joltsInfo: JoltInfo[]): Pairs | undefined {
    const countOptimal = new ExtendedMap<number, number>();
    const pairs = joltsInfo.flatMap((jA, posA, all) => all.slice(posA + 1).map((jB, relPosB) => {
        const common = jA.btns.intersection(jB.btns);
        let onlyOneDiffPos: SimplifiableEqn | undefined = undefined;
        const posB = relPosB + posA + 1;
        const aApplicable: SimplifiableEqn | undefined = (common.size === jA.btns.size - 1) ? { posEquation: posA, btn: [...jA.btns.difference(common)][0]! } : undefined;
        const bApplicable: SimplifiableEqn | undefined = (common.size === jB.btns.size - 1) ? { posEquation: posB, btn: [...jB.btns.difference(common)][0]! } : undefined;
        if (aApplicable && bApplicable) {
            if (jA.target >= jB.target) {
                onlyOneDiffPos = aApplicable;
            } else {
                onlyOneDiffPos = bApplicable;
            }
        } else if (aApplicable) {
            onlyOneDiffPos = aApplicable;
        } else if (bApplicable) {
            onlyOneDiffPos = bApplicable;
        }
        if (onlyOneDiffPos) {
            countOptimal.apply(onlyOneDiffPos.btn, (count) => count + 1, () => 0);
        }
        return {
            posA,
            posB,
            common,
            onlyOneDiffPos
        } satisfies Pairs
    }))
        .filter(p => p.onlyOneDiffPos != undefined)
        .reverseSortIntuitive(a => countOptimal.get(a.onlyOneDiffPos?.btn!)!);

    const optimals = pairs;
    if (optimals.length > 0) {
        return optimals[0];
    }
}


function simplifyPart2(joltsInfo: JoltInfo[], logger: Logger): JoltInfo[] {

    let nbSimplification = 0;
    do {
        mergeLinesWithSameBtns(joltsInfo, logger);
        nbSimplification = 0;
        for (let posA = 0; posA < joltsInfo.length; ++posA) {
            const joltA = joltsInfo[posA];
            for (let posB = posA + 1; posB < joltsInfo.length; ++posB) {
                const joltB = joltsInfo[posB];
                if (joltA.btns.isSubsetOf(joltB.btns) && !joltA.btns.isSupersetOf(joltB.btns)) {
                    joltB.btns = joltB.btns.difference(joltA.btns);
                    joltA.targetBtns.forEach((qty, btn) => joltB.targetBtns.apply(btn, curr => curr - qty, () => 0));
                    joltB.target -= joltA.target;
                    nbSimplification++;
                } else if (joltB.btns.isSubsetOf(joltA.btns) && !joltB.btns.isSupersetOf(joltA.btns)) {
                    joltA.btns = joltA.btns.difference(joltB.btns);
                    joltB.targetBtns.forEach((qty, btn) => joltA.targetBtns.apply(btn, curr => curr - qty, () => 0));
                    joltA.target -= joltB.target;
                    nbSimplification++
                }
            }
        }
    } while (nbSimplification > 0)

    //Remove duplicates
    const keys = new Set<string>();
    joltsInfo.forEach(j => {
        const toDelete: number[] = [];
        j.targetBtns.forEach((qty, btn) => {
            if (qty === 0) {
                toDelete.push(btn);
            }
        })
        toDelete.forEach(btn => j.targetBtns.delete(btn));
    })

    return joltsInfo.filter(j => {
        const key = `${j.target}|${[...j.btns].sortIntuitive().join(",")}|${[...j.targetBtns.entries()].map(([btn, qty]) => `b${btn}*${qty}`).sortIntuitive().join(",")}`;
        if (keys.has(key)) {
            return false;
        }
        keys.add(key);
        return true;
    })
}

function mergeLinesWithSameBtns(joltsInfo: JoltInfo[], logger: Logger) {
    const joltsToMerge = new ExtendedMap<string, Set<number>>();
    joltsInfo.forEach((joltA, posA, all) => all.slice(posA + 1).forEach((joltB, offsetPosB) => {
        if (joltA.btns.isSubsetOf(joltB.btns) && joltA.btns.isSupersetOf(joltB.btns)) {
            const posB = posA + offsetPosB + 1;
            joltsToMerge.apply([...joltA.btns].join("|"), curr => curr.add(posA).add(posB), () => new Set());
        }
    }));
    if (joltsToMerge.size > 0) {
        displayEquation("Before Merge", joltsInfo, logger);
    }
    const posToDelete: number[] = [];
    for (const [key, jolts] of joltsToMerge.entries()) {
        const joltPositions = [...jolts.keys()].sortIntuitive();
        const target = joltsInfo[joltPositions[0]];
        for (const joltToMerge of joltPositions.slice(1).map(pos => joltsInfo[pos])) {
            target.target += joltToMerge.target;
            joltToMerge.targetBtns.forEach((qty, btn) => target.targetBtns.apply(btn, curr => curr + qty, () => 0));
        }
        target.target /= joltPositions.length;
        target.targetBtns.keys().forEach(key => target.targetBtns.apply(key, curr => curr / joltPositions.length, () => 0));
        joltPositions.slice(1).forEach(pos => posToDelete.push(pos));
    }

    posToDelete.reverseSortIntuitive().forEach(pos => joltsInfo.splice(pos, 1));
}

function solveUsingSteps(toSolve: ToSolveStep, numbers: (number | undefined)[], currTotal: number, foundBest: number): number | undefined {
    if ("validate" in toSolve) {
        if (toSolve.validate(numbers)) {
            return currTotal;
        }
        return undefined;
    }
    if ("btnSolvableImmediately" in toSolve) {
        let isInvalid = false;
        let newTotal = currTotal;
        toSolve.btnSolvableImmediately.forEach(([btn, fct]) => {
            const res = fct(numbers);
            if (Number.isNaN(res)) {
                throw new Error("Bad calculation");
            }
            if (res < 0 || !isInteger(res)) {
                isInvalid = true;
            }
            newTotal += Math.round(res);
            numbers[btn] = Math.round(res);
        });
        if (isInvalid || newTotal > foundBest) {
            return undefined;
        }
        if (toSolve.constraints.some(c => !c.check(numbers))) {
            return undefined;
        }
        const res = solveUsingSteps(toSolve.next, numbers, newTotal, foundBest);
        toSolve.btnSolvableImmediately.forEach(([btn]) => numbers[btn] = undefined);
        return res;
    }
    const range = toSolve.btnMax(numbers);
    if (range[1] < 0) {
        return undefined;
    }
    for (let v = range[0]; v <= Math.floor(range[1]); ++v) {
        if (currTotal + v >= foundBest) {
            break;
        }
        numbers[toSolve.btnPos] = v;
        if (toSolve.constraints.some(c => !c.check(numbers))) {
            continue;
        }

        const foundResult = solveUsingSteps(toSolve.next, numbers, currTotal + v, foundBest);
        if (foundResult !== undefined) {
            foundBest = Math.min(foundResult, foundBest);
        }
    }
    numbers[toSolve.btnPos] = undefined;
    return foundBest;
}

function isInteger(res: number): boolean {
    return Number.isInteger(Math.trunc(res * 10000) / 10000);
}

function solvePart2(schematic: Schematic, logger: Logger): number {
    logger.debug("Starting schematic " + schematic.id);
    const joltsInfo = buildJoltsInfo(schematic);
    displayEquation("Before", joltsInfo, logger);
    const timer = PerfTimer.init();
    const toSolve = builtToSolveSteps(joltsInfo, new Set<number>(), buildChecks(joltsInfo), logger);
    const durationPrep = timer.time();
    const result = solveUsingSteps(toSolve.next, [], 0, Number.MAX_SAFE_INTEGER);
    const durationSolve = timer.time()
    logger.debug(() => `Result of ${schematic.id} : ${result} in ${durationSolve}ms (${durationPrep} ms)`);
    return result ?? 0;
}

function puzzle(lines: string[], part: Part, type: Type, logger: Logger): void {
    const data = parse(lines);
    if (part === Part.PART_1) {
        const result = data.map(solvePart1).reduce((a, b) => a + b);
        logger.result(result, [7, 390])
    }
    else {
        const result = data.map(s => solvePart2(s, logger)).reduce((a, b) => a + b);

        logger.result(result, [33, 14677])
    }
}

/**
 * Update the date number after copy
 * Adapt types list to your needs and parts also 
 * @see run javadoc
 */
run(10, [Type.TEST, Type.RUN], puzzle, [Part.PART_1, Part.PART_2], { debug: false })