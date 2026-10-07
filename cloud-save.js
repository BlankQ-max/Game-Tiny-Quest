// Debounced, retrying saver. Pure logic (no Firebase imports) so it can be tested on its own.
// save(data) is called often (every step); a write happens at most once per `delay` ms.
export function createSaver({ write, onStatus = () => {}, delay = 1500 }) {
    let latest = null, dirty = false, timer = null, busy = false, failed = false;

    async function run() {
        clearTimeout(timer); timer = null;
        if (busy || !dirty) return;
        busy = true;
        const snap = latest;
        dirty = false;
        onStatus("saving");
        try {
            await write(snap);
            failed = false;
            onStatus("ok");
        } catch (e) {
            failed = true;
            dirty = true;          // keep it; the next save() (or flush) retries
            onStatus("error", e);
        }
        busy = false;
        if (dirty && !failed) run();   // newer progress arrived while writing
    }

    return {
        save(data) {
            latest = data; dirty = true;
            if (!timer) timer = setTimeout(run, delay);
        },
        flush() { return run(); },
        isDirty() { return dirty; }
    };
}
