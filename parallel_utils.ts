import { serialize } from 'v8';
import { Task, WorkerWrapper, Config, SetupConfig } from "microjob/dist/interfaces";
import { cpus } from "os";
import { isMainThread, parentPort, threadId, Worker } from "worker_threads";

const WORKER_STATE_READY = 'ready'
const WORKER_STATE_SPAWNING = 'spawning'
const WORKER_STATE_BUSY = 'busy'
const WORKER_STATE_OFF = 'off'

const AVAILABLE_CPUS = cpus().length;


class WorkerPool {
    private static readonly SCRIPT_MAIN = process.argv[1];

    private maxWorkers = Math.min(AVAILABLE_CPUS, 10);
    private taskQueue: Task[] = []
    private workers: WorkerWrapper[] = []

    resurrect(deadWorker: WorkerWrapper): void {
        // self healing procedure
        const worker = new Worker(WorkerPool.SCRIPT_MAIN, { eval: true })

        deadWorker.status = WORKER_STATE_SPAWNING
        deadWorker.worker = worker

        worker.once('online', () =>
            // next tick, so the worker js gets interpreted
            process.nextTick(() => {
                deadWorker.status = WORKER_STATE_READY

                // remove previous listeners, like the startup error handler
                worker.removeAllListeners()

                this.tick()
            })
        )

        // startup error handler: should not be thrown or at least handled
        worker.once('error', (error: Error) => {
            console.error(error)
            deadWorker.status = WORKER_STATE_OFF
            worker.removeAllListeners()

            this.tick()
        })
    }

    getAvailableWorker(): WorkerWrapper | undefined {
        for (let i = 0; i < this.workers.length; i++) {
            if (this.workers[i].status === WORKER_STATE_READY) {
                return this.workers[i]
            }
        }
    }
    tick(): void {
        // check for dead threads and resurrect them
        this.workers
            .filter(({ status }) => status === WORKER_STATE_OFF)
            .forEach((deadWorker: WorkerWrapper) => this.resurrect(deadWorker))

        if (this.taskQueue.length === 0) return

        const availableWorker = this.getAvailableWorker();
        if (availableWorker === undefined) {
            return;
        }
        const work = this.taskQueue.shift()!

        availableWorker.status = WORKER_STATE_BUSY
        const { worker } = availableWorker
        const { handler, config, resolve, reject } = work;
        const ctx = (config.ctx ?? {}) as any;
        try {
            let variables = ''
            for (const key in ctx) {
                if (!ctx.hasOwnProperty(key)) continue

                let variable
                switch (typeof ctx[key]) {
                    case 'string':
                    case 'object':
                        variable = JSON.stringify(ctx[key])
                        break
                    default:
                        variable = ctx[key]
                }
                variables += `let ${key} = ${variable}\n`
            }
            const dataSerialized = serialize(config.data)
            const dataStr = JSON.stringify(dataSerialized)
            const workerStr = `
        async ()=>{
        const {threadId} = require("worker_threads");
        const v8 = require('v8');
        ${variables}
        const dataParsed = JSON.parse('${dataStr}')
        const dataBuffer = Buffer.from(dataParsed.data)
        const dataDeserialized = v8.deserialize(dataBuffer)
        const result = await (${handler.toString()})(dataDeserialized);
        return result;
      };
      `

            worker.once('message', (message: any) => {
                this.free(worker)

                if (typeof message.error === 'undefined' || message.error === null)
                    return resolve(message.data)

                const error = new Error(message.error.message)
                error.stack = message.error.stack
                reject(error)
            })

            worker.once('error', (error: Error) => {
                availableWorker.status = WORKER_STATE_OFF
                reject(error)
                this.tick()
            })
            worker.postMessage(workerStr)
        } catch (err) {
            this.free(worker)
            reject(err)
        }
    }

    enqueue({ handler, config, resolve, reject }: Task): void {
        this.taskQueue.push({ handler, config, resolve, reject })
        this.tick()
    }

    free(worker: any): void {
        for (let i = 0; i < this.workers.length; i++) {
            if (worker.threadId === this.workers[i].worker.threadId) {
                this.workers[i].status = WORKER_STATE_READY
                // remove previous listeners
                this.workers[i].worker.removeAllListeners()
                this.tick()
                break
            }
        }
    }

    setup(config: SetupConfig = {}): Promise<void> {
        const providedMaxWorker = config?.maxWorkers ?? 0
        this.maxWorkers = providedMaxWorker > 0 ? providedMaxWorker : Math.min(AVAILABLE_CPUS,10)

        if (this.maxWorkers > 10) console.warn(`Worker pool has more than 10 workers.\nYou should also increase the Max Listeners of Node.js (https://nodejs.org/docs/latest/api/events.html#events_emitter_setmaxlisteners_n)\nOtherwise, limit them with start({maxWorkers: 10})`)

        return new Promise((resolve, reject) => {
            let counterSuccess = 0
            let counterFailure = 0
            for (let i = 0; i < this.maxWorkers; i++) {
                const worker = new Worker(WorkerPool.SCRIPT_MAIN, { argv: process.argv.slice(2) })

                this.workers.push({
                    status: WORKER_STATE_SPAWNING,
                    worker
                })

                worker.once(
                    'online',
                    (index => () => {
                        // next tick, so the worker js gets interpreted
                        process.nextTick(() => {
                            this.workers[index].status = WORKER_STATE_READY

                            // remove previous listeners, like the startup error handler
                            this.workers[index].worker.removeAllListeners()

                            counterSuccess++

                            // if there's at least one working thread, go ahead
                            if (
                                counterSuccess > 0 &&
                                counterSuccess + counterFailure === this.maxWorkers
                            )
                                resolve()
                        })
                    })(i)
                )

                // startup error handler: should not be thrown or at least handled
                worker.once(
                    'error',
                    (index => (error: Error) => {
                        this.workers[index].status = WORKER_STATE_OFF
                        this.workers[index].worker.removeAllListeners()
                        counterFailure++

                        // stop the worker pool if no worker is spawned
                        if (counterFailure === this.maxWorkers) {
                            reject(error)
                        }
                    })(i)
                )
            }
        })
    }

    async teardown(): Promise<void> {
        const terminationPromises = []

        for (const { worker } of this.workers) {
            terminationPromises.push(worker.terminate())
        }

        await Promise.all(terminationPromises)
        this.workers = []

    }
}


export class ParallelContext {
    private static taskCounter = 0;
    private static readonly WORKER_POOL = new WorkerPool();
    private static isStarted = false;
    public static async doStop() {
        if (ParallelContext.isStarted) {
            if (isMainThread) {
                await this.WORKER_POOL.teardown();
            }
            this.isStarted = false;
        }
    }
    public static isWorker(): boolean {
        return !isMainThread;
    }

    constructor() {

    }

    public static async doStart(): Promise<void> {
        if (this.isStarted) {
            return;
        }
        this.isStarted = true;
        if (isMainThread) {
            await this.WORKER_POOL.setup();
        } else {
            await this.workerRun();
        }
    }
    private async job<T, U extends {}, V extends {}>(
        handler: (data: V) => T,
        config: Config<U, V> = { ctx: {} as U, data: {} as V }
    ): Promise<T> {
        return new Promise((resolve, reject) => {
            if (typeof handler !== 'function')
                return reject(new Error("Bad Handler"))

            config.ctx = config.ctx || {} as (U & { "$$taskId": number });
            config.data = config.data || {} as V
            (config.ctx as any)["$$taskId"] = ++ParallelContext.taskCounter;
            if (typeof config.ctx !== 'object')
                return reject(new Error("Bad context"))

            ParallelContext.WORKER_POOL.enqueue({ handler, config, resolve, reject })
        })
    }

    public async run<T>(fct: () => T): Promise<T> {
        return await this.job(fct);
    }


    public async applyParallel<T, U = T, C = {}>(input: T[], fct: (subPart: T[]) => U, variables?: C): Promise<U[]> {
        const subArrays = input.pack(Math.ceil(input.length / AVAILABLE_CPUS));
        const jobResults = subArrays.map(subArray => this.job(fct, { data: subArray, ctx: variables ?? {} }));
        const result: U[] = []
        for await (const r of jobResults) {
            result.push(r);
        }
        return result;
    }


    private static async workerRun(): Promise<void> {
        const effectivePort = parentPort;
        if (!effectivePort) {
            return;
        }
        effectivePort.on('message', async worker => {
            const response: { data: any, error: any } = {
                error: null,
                data: null
            }

            try {
                const __executor__ = eval(worker)
                response.data = await __executor__()
                effectivePort.postMessage(response)
            } catch (err) {
                response.data = null;
                if (err instanceof Error) {
                    response.error = {
                        message: err.message,
                        stack: err.stack
                    }
                } else {
                    response.error = {
                        message: "" + err,
                        stack: undefined
                    }
                }

                try {
                    effectivePort.postMessage(response)
                } catch (err) {
                    console.error(err)
                }
            }
        })
    }
}