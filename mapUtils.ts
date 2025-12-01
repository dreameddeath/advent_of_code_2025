
/**
 * Extension d'une map pour 
 * - permettre un système de cache automatique (function cache)
 * - une fonction de type "compute" avec valeur courante + clé
 */
export class ExtendedMap<K, V> extends Map<K, V>{
    constructor(entries?: readonly (readonly [K, V])[] | null) {
        super(entries);
    }

    public apply(k: K, fct: (curr: V, key: K) => V, initVal: ()=>V): V {
        const curr = this.get(k) ?? initVal();
        const newVal = fct(curr, k);
        this.set(k, newVal);
        return newVal;
    }

    public cache(k: K, fct: (key: K) => V): V {
        const res = this.get(k);
        if (res !== undefined) {
            return res;
        } else {
            const newValue = fct(k);
            this.set(k, newValue);
            return newValue
        }
    }
}