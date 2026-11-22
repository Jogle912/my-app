/** Thrown when a record doesn't exist OR belongs to another student (deliberately indistinguishable). */
export class NotFoundError extends Error {
  constructor(what: string) {
    super(`${what} not found`);
    this.name = "NotFoundError";
  }
}
