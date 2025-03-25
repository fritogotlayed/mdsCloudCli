import { exec } from 'child_process';
import { writeFile } from 'fs';

export class ChildProcess {
  readonly #command: string;
  readonly #workingDir?: string;
  readonly #logFile?: string;
  readonly #onStart: () => void;

  /**
   * Creates a new child process.
   * @param args The arguments object.
   * @param args.command The command to execute.
   * @param args.workingDir The working directory.
   * @param args.logFile The file to log the output to. If not provided, the output will be returned fom the execute method.
   * @param args.onStart A callback to call when the process starts.
   */
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

  /**
   * Implementation of the execute method.
   * @returns A promise that resolves to the output of the command.
   */
  execute() {
    return new Promise<string>((resolve, reject) => {
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
              writeFile(this.#logFile, stdout || stderr, (err) => {
                if (err) {
                  reject(err);
                } else {
                  resolve(stdout || stderr);
                }
              });
            } else {
              resolve(stdout || stderr);
            }
          }
        },
      );
    });
  }
}
