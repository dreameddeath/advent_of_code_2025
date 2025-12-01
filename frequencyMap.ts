
/**
 * Class pour garder une map des fréquences d'occurrence d'une clé
 */
export class FrequencyMap<T>{
    private readonly frequencyMap: Map<T, number> = new Map();
    private totalCount: number = 0;
    public add(v: T): void {
        const currCount = this.frequencyMap.get(v);
        this.totalCount++;
        if (currCount) {
            this.frequencyMap.set(v, currCount + 1);
        } else {
            this.frequencyMap.set(v, 1);
        }
    }

    public remove(toRemove: T): void {
        const currCount = this.frequencyMap.get(toRemove);
        if (currCount === undefined) {
            return;
        }
        this.totalCount--;
        if (currCount === 1) {
            this.frequencyMap.delete(toRemove);
        } else {
            this.frequencyMap.set(toRemove, currCount - 1);
        }
    }

    public get(v:T):number{
        return this.frequencyMap.get(v)??0;
    }

    public has(v:T):boolean{
        return this.frequencyMap.has(v);
    }

    public getMap(): Map<T, number> {
        return this.frequencyMap;
    }

    public getDistinctItemsCount(): number {
        return this.frequencyMap.size;
    }

    public getTotalItemsCount(): number {
        return this.totalCount;
    }
}