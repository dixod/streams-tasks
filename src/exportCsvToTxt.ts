import { createReadStream, createWriteStream } from "node:fs";
import { writeFile } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import csv = require("csvtojson");

export async function exportCsvToTxt({ minYear = 1995, minRating = 8.5 } = {}) {
    const input = createReadStream("./src/assets/movies.csv");
    const parser = csv({ delimiter: ";", needEmitAll: false }, { objectMode: true });
    const output = createWriteStream("./src/assets/movies.txt");
    const summary = {
        processed: 0,
        exported: 0,
        skipped: { invalid: 0, filtered: 0 },
        byDecade: {} as Record<string, number>,
    };

    await pipeline(input, parser, async function* (rows) {
        for await (const row of rows) {
            summary.processed++;
            const year = Number(row.Year?.trim() || NaN);
            const rating = Number(row.Rating?.trim().replace(",", ".") || NaN);

            if (!Number.isFinite(year) || !Number.isFinite(rating)) {
                summary.skipped.invalid++;
                continue;
            }
            if (year < minYear || rating < minRating) {
                summary.skipped.filtered++;
                continue;
            }

            const decade = `${Math.floor(year / 10) * 10}s`;
            const duration = Number(row.Duration);
            const length = `${Math.floor(duration / 60)}h ${duration % 60}m`;
            const movie = { movie: row.Movie, director: row.Director, year, rating, decade, length };

            summary.exported++;
            summary.byDecade[decade] = (summary.byDecade[decade] ?? 0) + 1;
            yield JSON.stringify(movie) + "\n";
        }
    }, output);

    await writeFile("./src/assets/summary.json", JSON.stringify(summary, null, 2), "utf8");
    return summary;
}

if (require.main === module) {
    exportCsvToTxt().then(console.log).catch((error: unknown) => {
        console.error(error);
        process.exitCode = 1;
    });
}