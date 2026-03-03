export class RNG {
    private seed: number;

    constructor(seed: number) {
        this.seed = seed;
    }

    // Linear Congruential Generator
    // Using constants from glibc
    public next(): number {
        this.seed = (1103515245 * this.seed + 12345) % 2147483648;
        return this.seed / 2147483648;
    }

    public nextInt(min: number, max: number): number {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    public item<T>(array: T[]): T {
        return array[Math.floor(this.next() * array.length)];
    }
}
