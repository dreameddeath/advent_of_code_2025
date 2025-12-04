import { generator } from "./utils";


export namespace World2D {
    //export enum Dir { LEFT = "LEFT", RIGHT = "RIGHT", UP = "UP", DOWN = "DOWN" }
    export enum Dir { LEFT = 0, RIGHT = 1, UP = 2, DOWN = 3 }
    export type DirComposite = Dir[];

    export type Pos = { x: number, y: number }
    export type Vec = { x: number, y: number }
    export type Size = { width: number, height: number }
    //export enum TurnType {OPPOSITE = 'O',STRAIT = 'S',CLOCKWISE = 'C',COUNTERCLOCK_WISE = 'M'}
    export enum TurnType { OPPOSITE = 0, STRAIT = 1, CLOCKWISE = 2, COUNTERCLOCK_WISE = 3 }
    export type MoveOptions = { withDiags?: boolean, cyclic?: boolean };

    /**
     * Calcule le type de rotation à faire pour passer de la direction 1 à la direction 2
     * @param dir1 
     * @param dir2 
     * @returns le type de rotation
     */
    export function turn_type(dir1: Dir, dir2: Dir): TurnType {
        if (dir1 == dir2) {
            return TurnType.STRAIT;
        }
        if (dir1 == oppositeDir(dir2)) {
            return TurnType.OPPOSITE;
        }
        switch (dir1) {
            case Dir.LEFT: return (dir2 == Dir.UP) ? TurnType.CLOCKWISE : TurnType.COUNTERCLOCK_WISE;
            case Dir.RIGHT: return (dir2 == Dir.UP) ? TurnType.COUNTERCLOCK_WISE : TurnType.CLOCKWISE;
            case Dir.DOWN: return (dir2 == Dir.LEFT) ? TurnType.CLOCKWISE : TurnType.COUNTERCLOCK_WISE;
            case Dir.UP: return (dir2 == Dir.LEFT) ? TurnType.COUNTERCLOCK_WISE : TurnType.CLOCKWISE;
        }
    }

    /**
     * Tourne depuis une direction
     * @param dir la direction d'origine
     * @param turn_type la rotation a effectuer
     * @returns la nouvelle direction
     */
    export function turn_dir(dir: Dir, turn_type: TurnType): Dir {
        switch (turn_type) {
            case TurnType.STRAIT: return dir;
            case TurnType.OPPOSITE: return oppositeDir(dir);
            case TurnType.CLOCKWISE:
                switch (dir) {
                    case Dir.LEFT: return Dir.UP;
                    case Dir.UP: return Dir.RIGHT;
                    case Dir.RIGHT: return Dir.DOWN;
                    case Dir.DOWN: return Dir.LEFT

                }
            case TurnType.COUNTERCLOCK_WISE:
                switch (dir) {
                    case Dir.LEFT: return Dir.DOWN;
                    case Dir.DOWN: return Dir.RIGHT;
                    case Dir.RIGHT: return Dir.UP;
                    case Dir.UP: return Dir.LEFT

                }

        }
    }


    /**
     * Classe utilitaire pour mapper les vecteurs 2D
     */
    export class Vec2d {
        public static readonly LEFT: Vec2d = new Vec2d({ x: 0, y: 0 }, { x: -1, y: 0 });
        public static readonly RIGHT: Vec2d = new Vec2d({ x: 0, y: 0 }, { x: 1, y: 0 });
        public static readonly UP: Vec2d = new Vec2d({ x: 0, y: 0 }, { x: 0, y: -1 });
        public static readonly DOWN: Vec2d = new Vec2d({ x: 0, y: 0 }, { x: 0, y: 1 });

        public readonly delta_x: number;
        public readonly delta_y: number;

        constructor(pos1: Pos, pos2: Pos) {
            this.delta_x = pos2.x - pos1.x;
            this.delta_y = pos2.y - pos1.y;
        }

        public vect_prod(other: Vec2d): number {
            return this.delta_x * (-other.delta_y) - other.delta_x * (-this.delta_y);
        }

        /**
         * calcule le produit scalaire entre les 2 vecteurs
         * @param other 
         * @returns le produit scalaire
         */
        public scalar_prod(other: Vec2d): number {
            return this.delta_x * other.delta_x + other.delta_y * this.delta_y;
        }

        public turn_type(other: Vec2d): TurnType {
            const vect_prod = this.vect_prod(other);
            if (vect_prod == 0) {
                if (this.scalar_prod(other) > 0) {
                    return TurnType.STRAIT;
                } else {
                    return TurnType.OPPOSITE;
                }
            } else if (vect_prod < 0) {
                return TurnType.CLOCKWISE;
            } else {
                return TurnType.COUNTERCLOCK_WISE;
            }
        }

        public turn_type_dir(other: Dir): TurnType {
            switch (other) {
                case Dir.DOWN: return this.turn_type(Vec2d.DOWN);
                case Dir.UP: return this.turn_type(Vec2d.UP);
                case Dir.LEFT: return this.turn_type(Vec2d.LEFT);
                case Dir.RIGHT: return this.turn_type(Vec2d.RIGHT);
            };
        }

        public invert(): Vec2d {
            return new Vec2d({ x: this.delta_x, y: this.delta_y }, { x: 0, y: 0 });
        }

        public move(pos: Pos): Pos {
            return {
                x: pos.x + this.delta_x,
                y: pos.y + this.delta_y
            }
        }

        public moveClamped(pos: Pos, size: Size): Pos | undefined {
            const new_pos = this.move(pos);
            if (new_pos.x < 0 || new_pos.x >= size.width || new_pos.y < 0 || new_pos.y >= size.height) {
                return undefined;
            }
            return new_pos;
        }

        public moveCyclic(pos: Pos, size: Size): Pos {
            return {
                x: (pos.x + this.delta_x + size.width) % size.width,
                y: (pos.y + this.delta_y + size.height) % size.height
            };
        }

        public moveCyclicOpposite(pos: Pos, size: Size): Pos {
            return {
                x: (pos.x - this.delta_x + size.width) % size.width,
                y: (pos.y - this.delta_y + size.height) % size.height
            };
        }


        public moveOpposite(pos: Pos): Pos {
            return {
                x: pos.x - this.delta_x,
                y: pos.y - this.delta_y
            }
        }
    }

    /**
     * Se déplace dans la direction souhaitée
     * @param pos la direction d'origine
     * @param dir la direction souhaitée
     * @param dist la distance a parcourir (éventuelle - defaut = 1)
     * @returns la nouvelle position
     */
    export function move_pos(pos: Pos, dir: Dir, dist: number = 1): Pos {
        switch (dir) {
            case Dir.DOWN:
                return { x: pos.x, y: pos.y + dist }
            case Dir.UP:
                return { x: pos.x, y: pos.y - dist }
            case Dir.LEFT:
                return { x: pos.x - dist, y: pos.y }
            case Dir.RIGHT:
                return { x: pos.x + dist, y: pos.y }
        }
    }

    /**
     * Se déplace dans la direction composite souhaitée
     * @param pos la direction d'origine
     * @param dir la direction composite souhaitée
     * @param dist la distance a parcourir (éventuelle - defaut = 1)
     * @returns la nouvelle position
     */
    export function move_pos_many(pos: Pos, dir: DirComposite, dist: number = 1): Pos {
        return dir.reduce((curr_pos, dir) => move_pos(curr_pos, dir, dist), pos);
    }


    export class Map2d<T> {
        private _cells: Content<T>;
        private _size: Size;

        constructor(input: Content<T>) {
            this._cells = input;
            this._size = { height: input.length, width: input[0].length };
        }

        public move_pos(pos: Readonly<Pos> | undefined, dir: Dir, cyclic?: boolean): Pos | undefined {
            if (pos === undefined) {
                return undefined;
            }
            const new_pos = move_pos(pos, dir);
            if (cyclic === true) {
                if (new_pos.x < 0) { new_pos.x += this._size.width }
                if (new_pos.x >= this._size.width) { new_pos.x -= this._size.width }
                if (new_pos.y < 0) { new_pos.y += this._size.height }
                if (new_pos.y >= this._size.height) { new_pos.y -= this._size.height }
            }
            if (new_pos.x < 0 || new_pos.x >= this._size.width || new_pos.y < 0 || new_pos.y >= this._size.height) {
                return undefined;
            }
            return new_pos;
        }

        public opposite(dir: Dir): Dir {
            return oppositeDir(dir);
        }

        public apply_to_all(x_dir: Dir, y_dir: Dir, fct: (pos: Pos) => void) {
            const all_y = [...generator(this._size.height)];
            const all_x = [...generator(this._size.width)];
            if (x_dir == Dir.LEFT) {
                all_x.reverse();
            }
            if (y_dir == Dir.UP) {
                all_y.reverse();
            }
            all_y.forEach(y => all_x.forEach(x => fct({ x, y })))
        }

        public * move_all_direction(pos: Readonly<Pos>, opts: MoveOptions): Generator<Pos> {
            const dirs = opts.withDiags ? ALL_DIRECTIONS_WITH_DIAGS : ALL_DIRECTIONS_WITHOUT_DIAGS;
            for (const dir of dirs) {
                const next_pos = this.move_pos_many(pos, dir, opts.cyclic);
                if (next_pos) {
                    yield next_pos;
                }
            }
        }

        public * move_all_direction_with_cell(pos: Readonly<Pos>, opts: MoveOptions): Generator<PosAndCell<T>> {
            for (const nextPos of this.move_all_direction(pos, opts)) {
                yield { pos: nextPos, cell: this.cell(nextPos) };
            }
        }

        public move_pos_with_cell(pos: Readonly<Pos>, dir: Dir, cyclic?: boolean): PosAndCell<T> | undefined {
            const nextPos = this.move_pos(pos, dir, cyclic);
            if (nextPos === undefined) {
                return undefined;
            }
            return { pos: nextPos, cell: this.cell(nextPos) };
        }

        public move_pos_many(pos: Readonly<Pos> | undefined, directions: DirComposite, cyclic?: boolean): Pos | undefined {
            return directions.reduce((curr_pos, dir) => this.move_pos(curr_pos, dir, cyclic), pos);
        }

        public move_pos_many_with_cell(pos: Readonly<Pos> | undefined, directions: DirComposite, cyclic?: boolean): PosAndCell<T> | undefined {
            const nextPos = directions.reduce((curr_pos, dir) => this.move_pos(curr_pos, dir, cyclic), pos);
            if (nextPos === undefined) {
                return undefined;
            }
            return { pos: nextPos, cell: this.cell(nextPos) };
        }


        public cell(pos: Readonly<Pos>): T {
            const c = this._cells[pos.y]?.[pos.x];
            if (c === undefined) {
                throw new Error(`Bad position (${pos.x}:${pos.y}) against (w:${this._size.width},h:${this._size.height})`)
            }
            return c;
        }

        public cell_opt(pos: Readonly<Pos>): T | undefined {
            return this._cells[pos.y]?.[pos.x];
        }

        public set_cell(pos: Readonly<Pos>, new_value: T): T {
            const line = this._cells[pos.y];
            if ((line === undefined) || pos.x < 0 || pos.x >= this._size.width) {
                throw new Error(`Bad position (${pos.x}:${pos.y}) against (w:${this._size.width},h:${this._size.height})`)
            }
            const old = line[pos.x];
            line[pos.x] = new_value;
            return old;
        }

        public apply_cell(pos: Readonly<Pos>, fct: (c: T | undefined) => T): void {
            const line = this._cells[pos.y];
            if ((line === undefined) || pos.x < 0 || pos.x >= this._size.width) {
                throw new Error(`Bad position (${pos.x}:${pos.y}) against (w:${this._size.width},h:${this._size.height})`)
            }
            const new_value = fct(line[pos.x]);
            line[pos.x] = new_value;
        }


        public move_while(pos: Readonly<Pos>, dir: Dir, pred: Predicate<T>): Pos | undefined {
            let curr_pos: Pos | undefined = { ...pos };
            while ((curr_pos = this.move_pos(curr_pos, dir)) !== undefined) {
                if (!pred(this.cell(curr_pos), curr_pos, dir)) {
                    return curr_pos;
                }
            }
            return undefined;
        }

        public move_while_next(pos: Readonly<Pos>, dir: Dir, pred: Predicate<T>, must_move?: boolean): Pos | undefined {
            let curr_pos: Pos | undefined = { ...pos };
            let next_pos: Pos | undefined;
            while ((next_pos = this.move_pos(curr_pos, dir)) !== undefined) {
                if (!pred(this.cell(next_pos), next_pos, dir)) {
                    break;
                }
                curr_pos = next_pos;
            }
            if (must_move && this.is_same_pos(pos, curr_pos)) {
                return undefined;
            }
            return curr_pos;
        }


        public map_in_dir<U>(pos: Readonly<Pos>, dir: Dir, fct: MapFct<T, U>): U | undefined {
            const next_pos = this.move_pos(pos, dir);
            if (next_pos === undefined) {
                return undefined;
            }
            return fct(this.cell(next_pos), next_pos, dir)
        }

        public apply_in_dir(pos: Pos, dir: Dir, fct: Apply<T>) {
            this.map_in_dir(pos, dir, fct);
        }

        public is_same_pos(pos1: Readonly<Pos>, pos2: Readonly<Pos>): boolean {
            return is_same_pos(pos1, pos2);
        }

        protected toString(fct: ToString<T>): string {
            return this.toStringArray(fct).join("\n");
        }

        protected toStringArray(fct: ToString<T>): string[] {
            return this._cells.map((l, y) => l.map((c, x) => fct(c, { x, y })).join(""));
        }

        public width(): number {
            return this._size.width;
        }

        public height(): number {
            return this._size.height;
        }

        public size(): Readonly<Size> {
            return this._size;
        }

        public cells(): Content<T> {
            return this._cells;
        }

        public cloned_cells(fct: Clone<T>): Content<T> {
            return this._cells.map((l, y) => l.map((c, x) => fct(c, { x, y })))
        }


    }

    export const ALL_DIRECTIONS = allDirections();

    export const ALL_DIRECTIONS_WITH_DIAGS = allDirectionsWithDiags();

    export const ALL_DIRECTIONS_WITHOUT_DIAGS = allDirections().map(d => [d]);

    export const ALL_DIRECTION_DIAGS = allDirectionsWithDiags().filter(d => d.length === 2);

    export const DIRECTIONS_TOP_LEFT = [Dir.UP, Dir.LEFT];
    export const DIRECTIONS_TOP_RIGHT = [Dir.UP, Dir.RIGHT];
    export const DIRECTIONS_BOTTOM_LEFT = [Dir.DOWN, Dir.LEFT];
    export const DIRECTIONS_BOTTOM_RIGHT = [Dir.DOWN, Dir.RIGHT];

    export function allDirections(): [Dir, Dir, Dir, Dir] {
        return [Dir.UP, Dir.DOWN, Dir.LEFT, Dir.RIGHT];
    }

    export function allDirectionsWithDiags(): [DirComposite, DirComposite, DirComposite, DirComposite, DirComposite, DirComposite, DirComposite, DirComposite] {
        return [
            [Dir.UP], [Dir.DOWN], [Dir.LEFT], [Dir.RIGHT],
            [Dir.UP, Dir.LEFT], [Dir.DOWN, Dir.LEFT], [Dir.UP, Dir.RIGHT], [Dir.DOWN, Dir.RIGHT]
        ];
    }
    export function oppositeDir(dir: Dir): Dir {
        switch (dir) {
            case Dir.UP: return Dir.DOWN;
            case Dir.DOWN: return Dir.UP;
            case Dir.LEFT: return Dir.RIGHT;
            case Dir.RIGHT: return Dir.LEFT;
        }
    }

    export function array_contains_pos(array: Readonly<Pos>[], pos: Readonly<Pos>) {
        return array.findIndex(ap => is_same_pos(pos, ap)) >= 0
    }

    export function is_same_pos(pos1: Readonly<Pos>, pos2: Readonly<Pos>): boolean {
        return pos1.x === pos2.x && pos1.y === pos2.y;
    }

    export type Content<T> = T[][];
    export type Clone<T> = (c: T, pos: Readonly<Pos>) => T;
    export type ToString<T> = (c: T, pos: Readonly<Pos>) => string;
    export type Apply<T> = (c: T, pos: Readonly<Pos>, dir: Dir) => void;
    export type MapFct<T, U> = (c: T, pos: Readonly<Pos>, dir: Dir) => U;
    export type Predicate<T> = (c: T, pos: Readonly<Pos>, dir: Dir) => boolean;
    export type PosAndCell<T> = { pos: Pos, cell: T }


    export namespace Fill {
        export enum TurnPartToFill {
            INNER = 'I',
            OUTER = 'O',
            SIDE = 'S'
        }

        export function part_to_fill(turn_type: TurnType, is_globally_clockwise: boolean): TurnPartToFill {
            switch (turn_type) {
                case TurnType.OPPOSITE:
                case TurnType.STRAIT:
                    return TurnPartToFill.SIDE;
                case TurnType.CLOCKWISE: return is_globally_clockwise ? TurnPartToFill.INNER : TurnPartToFill.OUTER;
                case TurnType.COUNTERCLOCK_WISE: return is_globally_clockwise ? TurnPartToFill.OUTER : TurnPartToFill.INNER;
            }
        }

        export function pos_to_fill(pos: Pos, previous_dir: Dir, next_dir: Dir, is_globally_clockwise: boolean): Pos | [Pos, Pos, Pos] {
            const turn_type = World2D.turn_type(previous_dir, next_dir);
            const turn_part_to_fill = part_to_fill(turn_type, is_globally_clockwise);
            switch (turn_part_to_fill) {
                case TurnPartToFill.SIDE:
                    return move_pos(pos, turn_dir(next_dir, is_globally_clockwise ? TurnType.CLOCKWISE : TurnType.COUNTERCLOCK_WISE));
                case TurnPartToFill.INNER: {
                    const move_before = turn_dir(previous_dir, is_globally_clockwise ? TurnType.CLOCKWISE : TurnType.COUNTERCLOCK_WISE);
                    const move_after = turn_dir(next_dir, is_globally_clockwise ? TurnType.CLOCKWISE : TurnType.COUNTERCLOCK_WISE);
                    return move_pos(move_pos(pos, move_before), move_after);
                }
                case TurnPartToFill.OUTER: {
                    const move_before = turn_dir(previous_dir, is_globally_clockwise ? TurnType.CLOCKWISE : TurnType.COUNTERCLOCK_WISE);
                    const move_after = turn_dir(next_dir, is_globally_clockwise ? TurnType.CLOCKWISE : TurnType.COUNTERCLOCK_WISE);
                    const externPos = move_pos(move_pos(pos, move_before), move_after);
                    return [externPos, { x: externPos.x, y: pos.y }, { x: pos.x, y: externPos.y }];
                }
            }
        }
    }
}