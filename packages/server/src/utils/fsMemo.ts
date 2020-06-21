import { existsSync, mkdirSync, readFile, writeFile } from "fs";
import { join } from "path";
import { hash } from ".";

export function fsMemo<F extends (...args: any[]) => any>(fn: F): F {
  const rootDirectory = process.cwd();
  const folderPath = join(rootDirectory, "file-cache");

  if (!existsSync(folderPath)) {
    mkdirSync(folderPath);
  }

  return <F>async function (...args: any[]) {
    const hashed = hash(JSON.stringify(args));
    const pathname = join(folderPath, `/${hashed}.json`);

    let file: string | null = await new Promise((resolve) => {
      readFile(pathname, (err, file) => {
        if (err) return resolve(null);

        return resolve(file.toString("utf-8"));
      });
    });

    if (file) {
      // always parse text as JSON
      // this made need to be extended later on
      return JSON.parse(file);
    }

    file = await fn(...args);

    writeFile(pathname, JSON.stringify(file), (err) => {
      if (err) throw err;
    });

    return file;
  };
}
