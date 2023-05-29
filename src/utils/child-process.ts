import { exec } from 'child_process';
import { writeFile } from 'fs';

export class ChildProcess {
  readonly #command: string;
  readonly #workingDir?: string;
  readonly #logFile?: string;
  readonly #onStart: () => void;

  constructor({
    command,
    workingDir,
    logFile,
    onStart,
  }: {
    command: string;
    workingDir?: string;
    logFile?: string;
    onStart?: () => void;
  }) {
    this.#command = command;
    this.#workingDir = workingDir;
    this.#logFile = logFile;
    this.#onStart = onStart;
  }

  execute(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.#onStart && this.#onStart();
      exec(
        this.#command,
        {
          cwd: this.#workingDir ?? process.cwd(),
        },
        (error, stdout, stderr) => {
          if (error) {
            console.dir(error);
            reject(error);
          } else {
            if (this.#logFile) {
              writeFile(this.#logFile, stdout || stderr, () => {
                resolve();
              });
            } else {
              resolve();
            }
          }
        },
      );
    });
  }
}
