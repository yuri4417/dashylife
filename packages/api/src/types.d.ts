declare module 'better-sqlite3' {
  export default class Database {
    constructor(path: string);
    pragma(mode: string): any;
    exec(sql: string): this;
    prepare(sql: string): Statement;
    close(): void;
  }

  export class Statement {
    get(...params: any[]): any;
    all(...params: any[]): any[];
    run(...params: any): any;
  }

  export interface IBindParameters {
    [index: number]: any;
  }
}
