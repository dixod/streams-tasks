import { EventEmitter } from "node:events";

type Callback = (error: Error | null, result?: unknown) => void;

class WithTime extends EventEmitter {
    execute<Args extends unknown[]>(
        asyncFunc: (...params: [...Args, Callback]) => void,
        ...args: Args
    ): void {
        this.emit("begin");
        console.time("WithTime");

        const done: Callback = (error, result) => {
            console.timeEnd("WithTime");

            try {
                if (error) {
                    this.emit("error", error);
                } else if (result !== undefined) {
                    this.emit("data", result);
                }
            } finally {
                this.emit("end");
            }
        };

        asyncFunc(...args, done);
    }
}

async function fetchPost(url: string, callback: Callback): Promise<void> {
    let post: unknown;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        post = await response.json();
    } catch (error) {
        callback(error instanceof Error ? error : new Error(String(error)));
        return;
    }

    callback(null, post);
}

const withTime = new WithTime();

withTime.on("begin", () => console.log("Started"));
withTime.on("data", (result) => console.log("Result:", result));
withTime.on("error", (error: Error) => console.error(error.message));
withTime.on("end", () => console.log("Finished"));

withTime.execute(fetchPost, "https://jsonplaceholder.typicode.com/posts/1");