import { ParallelContext } from "./parallel_utils";
import "./utils";
import * as fs from 'fs';


export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export enum Type {
    TEST = "TEST",
    RUN = "RUN"
}

export enum Part {
    ALL = "BOTH",
    PART_1 = "PART 1",
    PART_2 = "PART 2"
}

export const failures = {
    test: { count: 0, parts: [] as string[] },
    run: { count: 0, parts: [] as string[] },
}

export function buildAcceptableFileNames(day: number, type: Type, part: Part): string[] {
    const testDataSuffix = type === Type.TEST ? "_test" : "";

    const results: string[] = [];
    const per_day_prefix = `./data/day_${day}`;
    const per_part_root = `${per_day_prefix}_${part === Part.PART_2 ? 2 : 1}${testDataSuffix}`;
    const for_any_part_root = `${per_day_prefix}${testDataSuffix}`;

    results.push(`${per_part_root}.dat`, `${per_part_root}.txt`);
    results.push(`${for_any_part_root}.dat`, `${for_any_part_root}.txt`);
    return results;
}

export function getRawData(day: number, type: Type, part: Part, logger: Logger): string {
    const filenames = buildAcceptableFileNames(day, type, part);
    for (const filename of filenames) {
        if (fs.existsSync(filename)) {
            return fs.readFileSync(filename, 'utf-8');
        }
    }
    logger.error("No data file found");
    throw new Error(`No data found for day ${day}`)
}

export function getData(day: number, type: Type, part: Part, logger: Logger): string[] {
    return getRawData(day, type, part, logger).split(/\r?\n/);
}

type LogMessage = string | string[] | (() => string | string[]);
export interface Logger {
    isdebug(): boolean,
    debug(message: LogMessage): void,
    log(message: LogMessage): void,
    assert<T>(v: T, test: T, message: LogMessage): void
    error(message: LogMessage): void,
    result<T, U>(value: T | [T, U], testResult: T | [T, T] | [T, T, U, U] | undefined): void,
}

const emptyLogger: Logger = {
    isdebug: () => false,
    debug: () => { },
    log: () => { },
    assert: (v, t, m) => {
        if (typeof m === "function") {
            m = m();
        }
        if (v !== t) { throw new Error(Array.isArray(m) ? m.join("\n") : m) };
    },
    error: () => { },
    result: () => { }
}

function calcSuccessMessage<T, U>(part: Part, type: Type, value: T | [T, U], expectedResult: T | [T, T] | [T, T, U, U] | undefined): "OK" | "KO" | "" {
    const isValueArray = Array.isArray(value);
    if ((isValueArray && part !== Part.ALL) || (!isValueArray && part === Part.ALL)) {
        throw new Error("Inconsistent value result with part type");
    }
    if (expectedResult === undefined) {
        return "";
    }
    if (Array.isArray(expectedResult)) {
        if (part === Part.ALL) {
            const effectiveValue = (value as [T, U]);
            if (expectedResult.length === 2) {
                throw new Error("Inconsistent value result with part type");
            } else {
                const effectiveValue = (value as [T, T, U, U]);
                const effectiveExpected = type === Type.TEST ? [expectedResult[0], expectedResult[2]] : [expectedResult[1], expectedResult[3]];
                return effectiveValue[0] === effectiveExpected[0] && effectiveValue[1] === effectiveExpected[1] ? "OK" : "KO";
            }
        } else {
            const expectedResultValue = type === Type.TEST ? expectedResult[0] : expectedResult[1];
            return value === expectedResultValue ? "OK" : "KO";
        }

    } else if (type === Type.TEST) {
        return value === expectedResult ? "OK" : "KO";
    } else {
        return "";
    }
}

/**
 * Callback method to be run for a given puzzle
 * Params :
 * - lines = the parsed lines
 * - part : the current part being run
 * - logger : the logger to be used
 * - benchTag : when running in bench mode, provide a tag to change implementation behavior
 */
export type Solver<BTAG> = (lines: string[], part: Part, type: Type, logger: Logger, benchTag?: BTAG) => void | Promise<void>;

export async function doRun<BTAG>(fct: Solver<BTAG>, data: string[], part: Part, type: Type, logger: Logger, benchTag?: BTAG): Promise<number> {
    const start = new Date();
    let res = fct(data, part, type, logger, benchTag);
    if (!(res instanceof Promise)) {
        res = Promise.resolve()
    }
    await res;
    return (new Date()).getTime() - start.getTime();
}


let _disableTests = false;
const _globalStart = new Date();
let _allrun = false;
let _beforeRun: Promise<void>[] = [];


export function runInAllMode(disableTests: boolean) {
    _allrun = true;
    _disableTests = disableTests;
}

export async function endAll() {
    await Promise.allSettled(_beforeRun);
    if (!ParallelContext.isWorker()) {
        finalizeAll();
        ParallelContext.doStop();
        process.exit();
    }
}

function finalizeAll() {
    const duration = new Date().getTime() - _globalStart.getTime();

    console.log(`\n[Global] All run in ${duration} ms`);
    let totalFailures = 0;
    for (let domain in failures) {
        const domainFailures = failures[domain as keyof typeof failures];
        if (domainFailures.count > 0) {
            totalFailures += domainFailures.count;
            console.error(`[Global] ${domain} Failure(s) : ${domainFailures.count} / ${domainFailures.parts}`);
        }
    }
    if (totalFailures === 0) {
        console.log(`\n[Global] No errors`);
    }
}

export async function internal_run<BTAG>(before: Promise<void>[], day: number, types: Type[], fct: Solver<BTAG>, parts: Part[] = [Part.ALL], opt?: { bench?: number, debug?: boolean, benchTags?: BTAG[] }): Promise<void> {
    await Promise.all(before);
    console.log(`[STARTING] Day ${day}`);
    const start = new Date();
    for (const part of parts) {
        for (const type of types) {
            if (_disableTests && type === Type.TEST) {
                continue;
            }
            const logger: Logger = buildLogger(day, opt?.debug, part, type)

            logger.log("Running")
            const data = getData(day, type, part, logger);
            if (opt?.bench) {
                for (const benchTag of opt?.benchTags ?? [undefined]) {
                    const benchedResult = [];
                    for (let count = 0; count < opt.bench; count++) {
                        benchedResult.push(await doRun(fct, data, part, type, emptyLogger, benchTag));
                    }
                    const total_duration = benchedResult.sortIntuitiveCopy().slice(1, -1).reduce((a, b) => a + b);
                    const duration = total_duration / (benchedResult.length - 2);
                    const benchTypeLabel = benchTag ?? "";
                    logger.log(`Bench ${benchTypeLabel} done in ${total_duration} (agv ${duration} ms)`)
                }
            } else {
                const duration = await doRun(fct, data, part, type, logger);
                logger.log(`Done in ${duration} ms`)
            }
        }
    };

    console.log(`[DONE] Day ${day} done in ${(new Date()).getTime() - start.getTime()} ms`);
}


/**
 * Run function for unitary run
 * @param day the day to run (from 1 to 25)
 * @param types the array of types to run
 * @param fct the function to run
 * @param parts the parts to run (use [Part.ALL] to run both parts in the same call)
 * @param opt options
 *          multithread(boolean): si vrai active le multithreading (worker threads @see ParallelContext)
 *          debug(boolean): si vrai active le level debug du logger 
 *          bench(boolean): si vrai mode bench (execution 10 fois puis moyenne en enlevant le résultat le plus rapide et le résultat le plus lent)
 *          benchTags(array): tags à passer à la fonction pour "tunner" le comportement
 */
export async function run<BTAG>(day: number, types: Type[], fct: Solver<BTAG>, parts: Part[] = [Part.ALL], opt?: { multithread?: true, bench?: number, debug?: boolean, benchTags?: BTAG[] }): Promise<void> {
    if (opt?.multithread || ParallelContext.isWorker()) {
        _beforeRun.push(ParallelContext.doStart());
    }
    const beforeRunLocal = [..._beforeRun];

    if (ParallelContext.isWorker()) {
        return;
    }
    _beforeRun.push(internal_run(beforeRunLocal, day, types, fct, parts, opt));
    if (!_allrun) {
        try {
            await Promise.all(_beforeRun);
            ParallelContext.doStop();
            process.exit(0);
        }
        catch (e) {
            console.error(e);
            process.exit(1)
        }
    }
}

function do_log(iserror: boolean, part: Part, type: Type, input: LogMessage) {
    const name = Type[type];

    let message = typeof input === "function" ? input() : input;
    let log_fct = iserror ? console.error : console.log;
    if (Array.isArray(message)) {
        log_fct(`[${name}][${part}] ${message[0]}`);
        message.slice(1).forEach(l => log_fct(l));
    } else {
        log_fct(`[${name}][${part}] ${message}`);
    }
}

function areEquals<T>(v1: any, v2: any): boolean {
    if (Array.isArray(v1)) {
        return (v1.length === v2.length) && v1.filter((n, p) => !areEquals(v2[p], n)).length === 0
    }
    return v1 === v2;
}

function buildLogger(day: number, debugMode: boolean | undefined, part: Part, type: Type): Logger {
    const name = Type[type];
    return {
        isdebug: debugMode ? (() => true) : (() => false),
        debug: debugMode ? (message: LogMessage) => do_log(false, part, type, message) : (() => { }),
        log: (message: LogMessage) => do_log(false, part, type, message),
        error: (message: LogMessage) => do_log(true, part, type, message),
        assert: <T>(v: T, t: T, message: LogMessage) => {
            if (!areEquals(v, t)) {
                do_log(true, part, type, message)
            }
        },
        result: <T, U>(result: T | [T, U], expectedResult: T | [T, T] | [T, T, U, U] | undefined) => {
            const result_value = calcSuccessMessage(part, type, result, expectedResult);
            const finalMessage = `[${name}][${part}] RESULT ${result_value} ====>${Array.isArray(result) ? result.join(", ") : result}<====`;
            if (result_value === "KO") {
                const target = type === Type.RUN ? failures.run : failures.test;
                target.count++;
                target.parts.push(`[DAY ${day} ${part}]`)
                console.error(finalMessage);
            } else {
                console.log(finalMessage);
            }

        }
    };
}
