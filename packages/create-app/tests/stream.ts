export class FakeWritableStream {
    #text: string[] = [];
    write(str: string): void {
        this.#text.push(str);
    }
    get text(): string {
        return this.#text.join("");
    }
}
