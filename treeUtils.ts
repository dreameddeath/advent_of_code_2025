/**
 * Fonction de visite à appliquer à chaque noeud.
 *
 * Note : le DATA peut-être mutable ou non suivant les besoins de l'algorithme*
 * 
 * Paramètres :
 * - tree : le noeud courant
 * - data : le données courantes
 * - parents : les parents (premier elements == racine de l'arbre)
 * 
 * Retour attendu :
 * - [boolean, DATA] :
 *     - boolean : si true continue sur les enfants, sinon non
 *     - data : la nouvelle donnée à retourner à l'appelant 
 */
export type VisitFct<TREE, DATA> = (tree: TREE, data: DATA,parents:TREE[]) => [boolean/*True : process children,... */, DATA/*the data to return and or pass to children*/];

/**
 * La fonction a appliquer en "remontant l'arbre"
 * 
 * Note : le DATA peut-être mutable ou non suivant les besoins de l'algorithme
 * 
 * Paramètres :
 * - tree : le noeud courant
 * - DATA : le données courantes
 * 
 * Retour attendu :
 * Si undefined : continue sur les parents avec le DATA d'input
 * Si [boolean, DATA] :
 *     - boolean : si true continue sur le parent, sinon s'arrête
 *     - data : la nouvelle donnée à retourner à l'appelant 
 */
export type ApplyParentFct<TREE, DATA> = (tree: TREE, data: DATA) => [boolean/*True: process parent*/, DATA/*the data to return and or pass to parent*/] | undefined;

/**
 * Fonction d'extraction des enfants. Retourner une liste vide si feuille
 */
export type ChildrenFct<TREE> = (tree: TREE) => TREE[];
/**
 * Fonction d'extraction de parent. Doit retourner undefined si noeud racine
 */
export type ParentFct<TREE> = (tree: TREE) => TREE | undefined;

class InternalVisitor<TREE>{
    constructor(private readonly getParent: ParentFct<TREE>,private readonly getChildren: ChildrenFct<TREE>) { }

    public visit<DATA>(tree: TREE, inputData: DATA, fct: VisitFct<TREE, DATA>,parents:TREE[]=[]): DATA {
        let [continueProcess, resultData] = fct(tree, inputData,parents);
        if (!continueProcess) {
            return resultData;
        }
        return this.getChildren(tree).reduce((data, child) => this.visit(child, data, fct,[...parents,tree]), resultData);
    }

    public applyParent<DATA>(tree: TREE, fct: ApplyParentFct<TREE, DATA>, inputData: DATA): DATA {
        const [continueProcess, newData] = fct(tree, inputData) ?? [true, inputData];
        if (!continueProcess) {
            return newData;
        }
        const parent = this.getParent(tree);
        if (parent !== undefined) {
            return this.applyParent(parent, fct, newData);
        }
        return newData;
    }

    public toRoot(tree: TREE): TREE {
        return this.applyParent(tree, (curr) => {
            const parent = this.getParent(curr);
            if (parent !== undefined) {
                return [true, parent];
            } else {
                return [false, curr]
            }
        }, tree);
    }
}

/**
 * Interface de visiteur générique
 */
export type Visitor<TREE> = {
    /**
     * Visite un arbre en "depth first" en applicant la fonction fct à chaque noeud
     * @param tree l'arbre à parcourir
     * @param data une donnée passée en paramètre à chaque noeud (et retournée en "modifiée" par la fonction)
     * @param fct la fonction à appliquer à chaque noeud traité
     */
    visit<DATA>(tree: TREE, data: DATA, fct: VisitFct<TREE, DATA>): DATA;
    /**
     * Visite les parents d'un noeud
     * @param tree le noeud courant
     * @param data une donnée passée en paramètre à chaque noeud (et retournée en "modifiée" par la fonction)
     * @param fct la fonction à appliquer à chaque noeud traité
     */
    applyParent<DATA>(tree: TREE, fct: ApplyParentFct<TREE, DATA>, data: DATA): DATA;

    /**
     * Remonte à la racine de l'arbre
     * @param tree 
     */
    toRoot(tree: TREE): TREE;
}


/**
 * Construit une fonction de parcours d'arbre générique à partir d'une fonction "getParent" et "getChildren"
 * @param getParent remonte au parent du noeud courant
 * @param getChildren 
 * @returns 
 */
export function buildVisitor<TREE>(getParent: ParentFct<TREE>, getChildren: ChildrenFct<TREE>): Visitor<TREE> {
    return new InternalVisitor<TREE>(getParent, getChildren);
}
