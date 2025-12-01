
const PRIMES = [2, 3, 5, 7];

function addNextPrime(): number {
    let currNumber = PRIMES[PRIMES.length - 1];
    while (true) {
        currNumber++;
        if (PRIMES.filter(n => currNumber % n === 0).length === 0) {
            PRIMES.push(currNumber);
            return currNumber;
        }
    }
    throw new Error("Cannot find prime");
}

function getNextPrime(pos: number): number {
    const p = PRIMES[pos];
    if (p) {
        return p;
    }
    return addNextPrime();
}

export function decomposePrime(input: number, max_prime?: number): number[] {
    const result: number[] = [];
    let reminder = input;
    let pos_prime = 0;
    while (reminder !== 1) {
        const p = getNextPrime(pos_prime);
        let nb = 0;
        while (reminder % p === 0) {
            reminder = reminder / p;
            nb++;
        }
        result.push(nb);
        if (max_prime !== undefined && result.length >= max_prime) {
            break;
        }
        pos_prime++;
    }
    return result;
}

function ppcm_decomposed(decompositions: number[][]): number[] {
    return decompositions.reduce((parts, p) => {
        p.forEach((pi, index) => {
            parts[index] = Math.max(pi, parts[index] ?? 0)
        })
        return parts
    }, [] as number[]);
}

export function pgcd_decomposed(decompositions: number[][]): number[] {
    return decompositions.reduce((parts, p) => {
        p.forEach((pi, index) => {
            const existing = parts[index] ?? 0;
            if (existing === 0) {
                parts[index] = pi;
            } else {
                parts[index] = Math.min(pi, existing)
            }
        })
        return parts
    }, [] as number[]);
}


export function pgcd_number(decompositions: number[][]): number {
    const ppmc_parts = pgcd_decomposed(decompositions);
    return ppmc_parts.reduce((a, b, index) => (PRIMES[index] ** (b)) * a, 1);
}


export function ppmc_bigint(decompositions: number[][]): bigint {
    const ppmc_parts = ppcm_decomposed(decompositions);
    return BigInt(ppmc_parts.reduce((a, b, index) => BigInt(PRIMES[index] ** (b)) * a, 1n));
}


export function ppmc_number(decompositions: number[][]): number {
    const ppmc_parts = ppcm_decomposed(decompositions);
    return ppmc_parts.reduce((a, b, index) => (PRIMES[index] ** (b)) * a, 1);
}