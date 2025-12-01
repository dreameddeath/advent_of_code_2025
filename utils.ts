export type BuildAry<T, Res extends unknown[] = []> = T extends Res["length"]
    ? Res
    : BuildAry<T, [...Res, unknown]>;
export type AddOne<T extends number> = BuildAry<T> extends [...infer Rest]
    ? [...Rest, 1]["length"]
    : never;

export type StrictArray<T, S extends number, POS extends number = 0, RES extends T[] = []> = POS extends S ? [...RES] : StrictArray<T, S, AddOne<POS>, [...RES, T]>;


/**
 * @param o the input strict sized array
 * @returns the array as a standard array
 */
export function strictToArray<T, S extends number>(o: StrictArray<T, S>): T[][] {
    return o as T[][];
}

export enum PackMatchAction {
    SKIP_AND_CHANGE,
    APPEND_THEN_CHANGE,
    CHANGE_THEN_APPEND
}

declare global {
    /**
     * Etend les array avec de nouvelles methods "helper"
     */
    interface Array<T> {
        /**
         * Applique la fonction map et filtre les résultats null ou undefined
         * @param fct la fonction map à appliquer (qui peut retourner null ou undefined)
         */
        mapNonNull<U>(fct: (i: T, index: number, all: T[]) => U): Array<NonNullable<U>>;

        /**
         * Créer des packets d'items (tableau de tableau) à partir d'une fonction qui décide quand créer un nouveau sous tableau 
         * @param cond la fonction de condition qui dit q'un nouveau tableau doit être créé
         * @param whenMatch quand la fonction retourne true, décide quoi faire
         */
        packIf(cond: (i: T, index: number, all: T[]) => boolean, whenMatch: PackMatchAction): Array<Array<T>>


        /**
         * Créer des packets d'items de N itemps max
         * @param max le nombre max d'items
         */
        pack(max: number): Array<Array<T>>


        /**
         * extrait exactement des packets de N items
         * @param nb nombre exact d'item dans chaque sous tableau tableau
         */
        packStrict<S extends number>(nb: S): StrictArray<T, S>[]
        /**
         * Trie inverse
         */
        reverseSort(compareFn?: (a: T, b: T) => number): Array<T>;


        /**
         * Sort par ordre numérique croissant (modifie le tableau en entrée)
         */
        sortIntuitive<U extends bigint | number | string | any[]>(map?: (i: T) => U): this;


        /**
         * Sort par ordre numérique croissant (modifie le tableau en entrée)
         */
        reverseSortIntuitive<U extends bigint | number | string | any[]>(map?: (i: T) => U): this;


        /**
         * Inverse le tableau sur une copie
         */
        reverseCopy(): Array<T>;



        /**
         * Trie le tableau sur une copie
         */
        sortCopy(compareFn?: (a: T, b: T) => number): Array<T>;


        /**
         * Trie le tableau sur une copie
         */
        reverseSortCopy(compareFn?: (a: T, b: T) => number): Array<T>;


        /**
         * Trie numériquement le tableau sur une copie
         */
        sortIntuitiveCopy<U extends bigint | number | string | any[]>(map?: (i: T) => U): Array<T>;

        /**
         * Trie numériquement le tableau sur une copie
         */
        reverseSortIntuitiveCopy<U extends bigint | number | string | any[]>(map?: (i: T) => U): Array<T>;


        /**
         * Utilise l'objet fourni tant qu'outil de mapping des valeurs du tableau
         */
        mapUsingObject<U>(mapObject: U): (U[keyof U])[];

        /**
         * Utilise l'objet fourni tant qu'outil de mapping des valeurs du tableau
         */
        filterTyped<U extends T>(fct: ((i: T) => boolean)): U[];
    }

}

Array.prototype.filterTyped = function <T, U extends T>(fct: ((i: T) => i is U)): U[] {
    return this.filter(fct);
}

Array.prototype.reverseCopy = function <T>(): Array<T> {
    return Array.from(this).reverse();
}

Array.prototype.reverseSort = function <T>(compareFn?: (a: T, b: T) => number): Array<T> {
    return this.sort(reverseSort(compareFn ?? ((a, b) => a.toString().localeCompare(b.toString()))));
}

Array.prototype.reverseSortIntuitive = function <T, U extends bigint | number | string | any[]>(map?: (i: T) => U): Array<T> {
    return this.sort(reverseSort(genericSort(map ?? (i => i))));
}

Array.prototype.sortCopy = function <T>(compareFn?: (a: T, b: T) => number): Array<T> {
    return Array.from(this).sort(compareFn);
}

Array.prototype.reverseSortCopy = function <T>(compareFn?: (a: T, b: T) => number): Array<T> {
    return Array.from(this).sort(reverseSort(compareFn ?? ((a, b) => a.toString().localeCompare(b.toString()))));
}


Array.prototype.reverseSortIntuitiveCopy = function <T, U extends bigint | number | string | any[]>(map?: (i: T) => U): Array<T> {
    return Array.from(this).reverseSortIntuitive(map);
}


Array.prototype.sortIntuitiveCopy = function <T, U extends bigint | number | string | any[]>(map?: (i: T) => U): Array<T> {
    return Array.from(this).sortIntuitive(map);
}

Array.prototype.mapUsingObject = function <U>(mapObject: U): (U[keyof U])[] {
    return this.map(applyMap(mapObject));
}



Array.prototype.mapNonNull = function <T, U>(fct: (i: T, index: number, all: T[]) => U) {
    // code to remove "o"
    return (this as T[]).map(fct)
        .filter((v): v is NonNullable<typeof v> => !(v === null || v === undefined));
}

Array.prototype.packStrict = function <T, S extends number>(size: number) {
    if (this.length % size !== 0) {
        throw new Error("Cannot pack array because size " + this.length + " not coherent with pack size " + size);
    }

    return (this as T[]).reduce((groups, v, pos) => {
        if (groups.length === 0 || pos % size === 0) {
            groups.push([v] as StrictArray<T, S>);
        } else {
            (groups[groups.length - 1] as T[]).push(v);
        }
        return groups;
    }, [] as StrictArray<T, S>[]);
}


Array.prototype.packIf = function <T>(fct: (i: T, index: number, all: T[]) => boolean, skipMatch: PackMatchAction) {
    const appendToCurrent = (groups: T[][], item: T) => {
        if (groups.length === 0) {
            groups.push([]);
        }
        groups[groups.length - 1].push(item);
        return groups;
    };
    const changeGroup = (groups: T[][]) => {
        if (groups.length === 0) {
            return groups;
        }
        groups.push([]);
        return groups;
    }
    // code to remove "o"
    return this.reduce((groups, item, index, all) => {
        const res = fct(item, index, all);
        if (res) {
            switch (skipMatch) {
                case PackMatchAction.APPEND_THEN_CHANGE: return changeGroup(appendToCurrent(groups, item));
                case PackMatchAction.CHANGE_THEN_APPEND: return appendToCurrent(changeGroup(groups), item);
                case PackMatchAction.SKIP_AND_CHANGE: return changeGroup(groups);
            }
        } else {
            return appendToCurrent(groups, item)
        }
    }, []);
}

Array.prototype.pack = function <T>(max: number): Array<Array<T>> {
    return this.packIf((_item, index) => index % max === 0, PackMatchAction.CHANGE_THEN_APPEND);
}

Array.prototype.sortIntuitive = function <T, U extends bigint | number | string | any[]>(map?: (i: T) => U): Array<T> {
    return this.sort(genericSort(map ?? (i => i)))
}

/**
 * Generateur de nombre de min (defaut =  0) à max (exclus)
 * @param max le nombre max à générer
 * @param min (optionnel) : le numéro min
 */
export function* generator(max: number, min: number = 0): Generator<number> {
    let i = min;
    while (i < max) {
        yield (i++)
    }
}


/**
 * Fonction de tri "intuitif"
 * @param map an optionnal mapping function to normalize
 * @returns a compare function
 */
export function genericSort<T extends bigint | number | string | any[], U = T>(map?: (i: U) => T): (a: U, b: U) => number {
    const realMap = map !== undefined ? map : ((i: U) => i as any as T);
    return (aBefore: U, bBefore: U) => {
        const a = realMap(aBefore);
        const b = realMap(bBefore);
        if (typeof a === "bigint") return (a < (b as bigint)) ? -1 : ((a > (b as bigint)) ? 1 : 0)
        else if (typeof a === "number") return a - (b as number);
        else if (typeof a === "string") return a.localeCompare((b as string))
        else if (Array.isArray(a)) return a.length - (b as any).length;
        throw new Error(`Cannot compare ${a} and ${b}`);
    }
}


export function reverseSort<T>(fct: (a: T, b: T) => number): (a: T, b: T) => number {
    return (a, b) => fct(a, b) * (-1);
}


function applyMap<I, T>(map: T): (item: I, index: number, orig: I[]) => T[keyof T] {
    return (item, index) => {
        return applyMapOnItem(item, map, () => { throw new Error(`Cannot map ${item} at pos ${index}`) })
    }
}

function applyMapOnItem<I, T>(item: I, map: T, failure: () => void = () => { }): T[keyof T] {
    const result = map[item as keyof T];
    if (result === undefined) {
        failure();
        throw new Error(`Cannot map item ${item}`);
    }
    return result;
}

export function forcePresent<I>(input: I): NonNullable<I> {
    if (input === undefined || input === null) {
        throw new Error("Empty item");
    }
    return input as NonNullable<I>;
}

export function forceType<O>(input: any, fct: (i: any) => boolean): input is O {
    if (input === undefined || input === null) {
        return false;
    }
    return fct(input);
}


export class PerfTimer {
    private readonly start = new Date();
    private constructor() {

    }

    public static init(): PerfTimer {
        return new PerfTimer()
    }

    public static run<T>(fct:()=>T):[number,T]{
        const timer = new PerfTimer();
        const result = fct();
        return [timer.time(),result];
    }

    public time(): number {
        return (new Date()).getTime() - this.start.getTime();
    }
}
